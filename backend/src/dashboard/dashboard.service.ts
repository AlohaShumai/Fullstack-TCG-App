import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { tavily, TavilyClient } from '@tavily/core';
import OpenAI from 'openai';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface NewsArticle {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

export interface TournamentEvent {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface DeckSummary {
  id: string;
  name: string;
  format: string;
  cardCount: number;
}

export interface FeaturedCard {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  setName: string;
  imageSmall: string;
}

export interface DashboardStats {
  totalCards: number;
  collectionsCount: number;
  decksCount: number;
  uniquePokemon: number;
  cardsByType: { pokemon: number; trainer: number; energy: number };
  decks: DeckSummary[];
  featuredCard: FeaturedCard | null;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private tavilyClient: TavilyClient | null = null;
  private openai: OpenAI;
  private newsCache: { data: NewsArticle[]; fetchedAt: number } | null = null;
  private eventsCache: {
    data: TournamentEvent[];
    fetchedAt: number;
  } | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const tavilyApiKey = this.configService.get<string>('TAVILY_API_KEY');
    if (tavilyApiKey) {
      this.tavilyClient = tavily({ apiKey: tavilyApiKey });
    } else {
      this.logger.warn('TAVILY_API_KEY not configured — news/events disabled');
    }

    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  private async summarizeArticles(
    articles: Array<{ title: string; content: string }>,
  ): Promise<string[]> {
    const numbered = articles
      .map((a, i) => `Article ${i + 1}:\nTitle: ${a.title}\nContent: ${a.content}`)
      .join('\n\n');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You summarize Pokemon TCG news articles. For each article given, write exactly 2-3 clean sentences summarizing the key information. No markdown, no bullet points, no headers. Return a JSON array of strings, one summary per article, in the same order.',
        },
        { role: 'user', content: numbered },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}') as {
      summaries?: string[];
      articles?: string[];
      results?: string[];
    };

    return parsed.summaries ?? parsed.articles ?? parsed.results ?? articles.map(() => '');
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  async getStats(userId: string): Promise<DashboardStats> {
    const [collectionsCount, decksCount, collectionCards, decks, cardCount] =
      await Promise.all([
        this.prisma.collection.count({ where: { userId } }),
        this.prisma.deck.count({ where: { userId } }),
        this.prisma.collectionCard.findMany({
          where: { collection: { userId } },
          select: {
            cardId: true,
            quantity: true,
            card: { select: { supertype: true } },
          },
        }),
        this.prisma.deck.findMany({
          where: { userId },
          include: { _count: { select: { cards: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.collectionCard.count({
          where: { collection: { userId }, card: { imageSmall: { not: null } } },
        }),
      ]);

    let totalCards = 0;
    const cardsByType = { pokemon: 0, trainer: 0, energy: 0 };
    const pokemonCardIds = new Set<string>();

    for (const cc of collectionCards) {
      totalCards += cc.quantity;
      const st = cc.card.supertype;
      if (st === 'Pokémon') {
        cardsByType.pokemon += cc.quantity;
        pokemonCardIds.add(cc.cardId);
      } else if (st === 'Trainer') {
        cardsByType.trainer += cc.quantity;
      } else if (st === 'Energy') {
        cardsByType.energy += cc.quantity;
      }
    }

    let featuredCard: FeaturedCard | null = null;
    if (cardCount > 0) {
      const skip = Math.floor(Math.random() * cardCount);
      const rows = await this.prisma.collectionCard.findMany({
        where: { collection: { userId }, card: { imageSmall: { not: null } } },
        select: {
          card: {
            select: {
              id: true,
              name: true,
              supertype: true,
              types: true,
              setName: true,
              imageSmall: true,
            },
          },
        },
        skip,
        take: 1,
      });
      if (rows[0]?.card?.imageSmall) {
        featuredCard = rows[0].card as FeaturedCard;
      }
    }

    return {
      totalCards,
      collectionsCount,
      decksCount,
      uniquePokemon: pokemonCardIds.size,
      cardsByType,
      featuredCard,
      decks: decks.map((d) => ({
        id: d.id,
        name: d.name,
        format: d.format,
        cardCount: d._count.cards,
      })),
    };
  }

  async getNews(): Promise<NewsArticle[]> {
    const now = Date.now();
    if (this.newsCache && now - this.newsCache.fetchedAt < CACHE_TTL_MS) {
      return this.newsCache.data;
    }

    if (!this.tavilyClient) return [];

    try {
      const response = await this.tavilyClient.search(
        'Pokemon TCG new set release 2026',
        {
          searchDepth: 'advanced',
          maxResults: 5,
          includeDomains: [
            'pokemon.com',
            'pokebeach.com',
            'pokeguardian.com',
          ],
          days: 30,
        } as Parameters<TavilyClient['search']>[1],
      );

      console.log('[Dashboard] Tavily news results:', JSON.stringify(
        response.results.map((r) => ({
          title: r.title,
          url: r.url,
          publishedDate: (r as Record<string, unknown>).publishedDate,
        })),
        null,
        2,
      ));

      const rawArticles = response.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content ?? '',
        source: this.extractDomain(r.url),
        publishedDate: (r as Record<string, unknown>).publishedDate as string | undefined,
      }));

      let summaries: string[] = rawArticles.map((a) => a.content);
      try {
        summaries = await this.summarizeArticles(
          rawArticles.map((a) => ({ title: a.title, content: a.content })),
        );
      } catch (err) {
        this.logger.warn(`AI summarization failed, using raw content: ${err}`);
      }

      const articles: NewsArticle[] = rawArticles.map((a, i) => ({
        title: a.title,
        url: a.url,
        snippet: summaries[i] ?? a.content,
        source: a.source,
        publishedDate: a.publishedDate,
      }));

      this.newsCache = { data: articles, fetchedAt: now };
      return articles;
    } catch (error) {
      this.logger.warn(`Failed to fetch TCG news: ${error}`);
      return this.newsCache?.data ?? [];
    }
  }

  async getEvents(): Promise<TournamentEvent[]> {
    const now = Date.now();
    if (this.eventsCache && now - this.eventsCache.fetchedAt < CACHE_TTL_MS) {
      return this.eventsCache.data;
    }

    if (!this.tavilyClient) return [];

    try {
      const response = await this.tavilyClient.search(
        'Pokemon TCG regionals championships April May 2026',
        {
          searchDepth: 'advanced',
          maxResults: 5,
          includeDomains: [
            'pokemon.com',
            'pokebeach.com',
            'pokeguardian.com',
          ],
          days: 30,
        } as Parameters<TavilyClient['search']>[1],
      );

      console.log('[Dashboard] Tavily events results:', JSON.stringify(
        response.results.map((r) => ({
          title: r.title,
          url: r.url,
          publishedDate: (r as Record<string, unknown>).publishedDate,
        })),
        null,
        2,
      ));

      const events: TournamentEvent[] = response.results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 200) ?? '',
        source: this.extractDomain(r.url),
      }));

      this.eventsCache = { data: events, fetchedAt: now };
      return events;
    } catch (error) {
      this.logger.warn(`Failed to fetch TCG events: ${error}`);
      return this.eventsCache?.data ?? [];
    }
  }
}
