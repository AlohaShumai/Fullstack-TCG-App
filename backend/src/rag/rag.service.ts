import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

export interface CardResult {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  hp: string | null;
  abilities: unknown;
  attacks: unknown;
  similarity: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  private cardToText(card: {
    name: string;
    supertype: string;
    subtypes: string[];
    types: string[];
    hp: string | null;
    abilities: unknown;
    attacks: unknown;
    rules: string[];
  }): string {
    const parts = [
      card.name + ' is a ' + card.supertype,
      card.subtypes.length ? '(' + card.subtypes.join(', ') + ')' : '',
      card.types.length ? 'of type ' + card.types.join('/') : '',
      card.hp ? 'with ' + card.hp + ' HP' : '',
    ];

    if (card.abilities && Array.isArray(card.abilities)) {
      for (const ability of card.abilities) {
        const a = ability as { name: string; text: string };
        parts.push('Ability "' + a.name + '": ' + a.text);
      }
    }

    if (card.attacks && Array.isArray(card.attacks)) {
      for (const attack of card.attacks) {
        const atk = attack as { name: string; damage: string; text: string };
        parts.push(
          'Attack "' +
            atk.name +
            '" does ' +
            atk.damage +
            ' damage. ' +
            atk.text,
        );
      }
    }

    if (card.rules.length) {
      parts.push('Rules: ' + card.rules.join(' '));
    }

    return parts.filter(Boolean).join('. ');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  async embedAllCards(): Promise<{ embedded: number }> {
    const cards = await this.prisma.card.findMany();
    let embedded = 0;

    for (const card of cards) {
      const text = this.cardToText(card);
      this.logger.log('Embedding: ' + card.name);

      try {
        const embedding = await this.generateEmbedding(text);
        const embeddingStr = JSON.stringify(embedding);

        await this.prisma.$executeRawUnsafe(
          'UPDATE "Card" SET embedding = $1::vector WHERE id = $2',
          embeddingStr,
          card.id,
        );

        embedded++;
      } catch (error) {
        this.logger.error('Failed to embed ' + card.name + ': ' + error);
      }
    }

    return { embedded };
  }

  async searchSimilarCards(
    query: string,
    userId: string,
    limit: number = 5,
  ): Promise<CardResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const embeddingStr = JSON.stringify(queryEmbedding);

    const results = await this.prisma.$queryRawUnsafe<CardResult[]>(
      `SELECT 
        c.id,
        c.name,
        c.supertype,
        c.types,
        c.hp,
        c.abilities,
        c.attacks,
        1 - (c.embedding <=> $1::vector) as similarity
      FROM "Card" c
      INNER JOIN "Collection" col ON c.id = col."cardId"
      WHERE col."userId" = $2
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector
      LIMIT $3`,
      embeddingStr,
      userId,
      limit,
    );

    return results;
  }

  async getAdvice(
    userId: string,
    question: string,
  ): Promise<{ answer: string; relevantCards: string[] }> {
    const similarCards = await this.searchSimilarCards(question, userId, 5);

    if (similarCards.length === 0) {
      return {
        answer:
          'I could not find any relevant cards in your collection. Try adding more cards or asking a different question.',
        relevantCards: [],
      };
    }

    const cardDescriptions: string[] = [];
    for (const card of similarCards) {
      cardDescriptions.push(
        this.cardToText({
          ...card,
          subtypes: [],
          rules: [],
        }),
      );
    }
    const cardContext = cardDescriptions.join('\n\n');

    const prompt =
      'You are a Pokemon TCG deck building advisor. The user has the following relevant cards in their collection:\n\n' +
      cardContext +
      '\n\nUser question: ' +
      question +
      '\n\nBased on these cards, provide helpful deck building advice. Be specific about which cards to use and why. Keep your response concise but informative.';

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pokemon TCG deck builder who helps players optimize their decks based on the cards they own.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
    });

    return {
      answer: completion.choices[0].message.content || 'No advice generated.',
      relevantCards: similarCards.map((c) => c.name),
    };
  }
}
