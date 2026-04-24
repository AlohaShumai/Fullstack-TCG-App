import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

interface PriceVariant {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
}

interface PokemonTcgCard {
  id: string;
  name: string;
  number: string;
  set: { id: string; name: string };
  tcgplayer?: {
    url?: string;
    prices?: Record<string, PriceVariant | undefined>;
  };
}

interface PokemonTcgResponse {
  data: PokemonTcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string | null;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('POKEMON_TCG_API_URL') ??
      'https://api.pokemontcg.io/v2';
    this.apiKey = this.configService.get<string>('POKEMONTCG_API_KEY') ?? null;
    if (!this.apiKey) {
      this.logger.warn(
        'POKEMONTCG_API_KEY is not set — syncing at reduced rate limit',
      );
    }
  }

  // Runs nightly to refresh all card prices and record a new PriceSnapshot for each card
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyPriceSync() {
    this.logger.log('Starting scheduled price sync...');
    await this.syncAllPrices();
    this.logger.log('Scheduled price sync completed');
  }

  // Iterates every distinct set in our DB and fetches current prices from pokemontcg.io
  async syncAllPrices(): Promise<{ synced: number; skipped: number }> {
    let synced = 0;
    let skipped = 0;

    const sets = await this.prisma.card.findMany({
      select: { setId: true },
      distinct: ['setId'],
    });

    this.logger.log(`Syncing prices for ${sets.length} sets`);

    for (const { setId } of sets) {
      try {
        const result = await this.syncSetPrices(setId);
        synced += result.synced;
        skipped += result.skipped;
      } catch (err: unknown) {
        this.logger.error(
          `Failed to sync prices for set ${setId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    this.logger.log(`Price sync complete — synced: ${synced}, skipped: ${skipped}`);
    return { synced, skipped };
  }

  async syncCardPrice(cardId: string): Promise<void> {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      this.logger.warn(`Card ${cardId} not found in database`);
      return;
    }

    const apiCards = await this.fetchSetFromApi(card.setId);
    const numberMap = this.buildNumberMap(apiCards);
    const nameMap = this.buildNameMap(apiCards);

    const localNumber = this.extractLocalId(cardId, card.setId);
    const match =
      numberMap.get(localNumber) ?? nameMap.get(card.name.toLowerCase());

    if (!match) {
      this.logger.warn(
        `No pokemontcg.io match for "${card.name}" (#${localNumber}) in set ${card.setId}`,
      );
      return;
    }

    await this.upsertCardPrice(cardId, match);
  }

  private async syncSetPrices(
    setId: string,
  ): Promise<{ synced: number; skipped: number }> {
    let synced = 0;
    let skipped = 0;

    const [apiCards, localCards] = await Promise.all([
      this.fetchSetFromApi(setId),
      this.prisma.card.findMany({
        where: { setId },
        select: { id: true, name: true },
      }),
    ]);

    const numberMap = this.buildNumberMap(apiCards);
    const nameMap = this.buildNameMap(apiCards);

    for (const localCard of localCards) {
      const localNumber = this.extractLocalId(localCard.id, setId);
      const match =
        numberMap.get(localNumber) ?? nameMap.get(localCard.name.toLowerCase());

      if (!match) {
        this.logger.warn(
          `No pokemontcg.io match for "${localCard.name}" (#${localNumber}) in set ${setId}`,
        );
        skipped++;
        continue;
      }
      await this.upsertCardPrice(localCard.id, match);
      synced++;
    }

    return { synced, skipped };
  }

  private toPokemonTcgSetId(tcgdexSetId: string): string {
    return tcgdexSetId.replace(/^([a-z]+)0+(\d)/, '$1$2');
  }

  private async fetchSetFromApi(setId: string): Promise<PokemonTcgCard[]> {
    const apiSetId = this.toPokemonTcgSetId(setId);
    if (apiSetId !== setId) {
      this.logger.log(`Set ID mapped: ${setId} → ${apiSetId}`);
    }

    const cards: PokemonTcgCard[] = [];
    let page = 1;
    const pageSize = 250;

    while (true) {
      const response = await this.fetchPageWithRetry(apiSetId, page, pageSize);
      cards.push(...response.data);

      if (cards.length >= response.totalCount) break;
      page++;
    }

    return cards;
  }

  private async fetchPageWithRetry(
    apiSetId: string,
    page: number,
    pageSize: number,
    maxRetries = 2,
  ): Promise<PokemonTcgResponse> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.warn(
            `Retry ${attempt - 1}/${maxRetries} for set ${apiSetId} page ${page}`,
          );
        }
        const response = await firstValueFrom(
          this.httpService.get<PokemonTcgResponse>(`${this.apiUrl}/cards`, {
            params: { q: `set.id:${apiSetId}`, pageSize, page },
            headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : {},
            timeout: 90000,
          }),
        );
        return response.data;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Attempt ${attempt} failed for set ${apiSetId} page ${page}: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }
    throw lastError;
  }

  private extractLocalId(cardId: string, setId: string): string {
    const localId = cardId.startsWith(setId + '-')
      ? cardId.slice(setId.length + 1)
      : cardId.split('-').slice(1).join('-');
    // Strip leading zeros so "013" matches pokemontcg.io "13", but "TG01" stays "TG01"
    return localId.replace(/^0+(\d)/, '$1');
  }

  private buildNumberMap(
    cards: PokemonTcgCard[],
  ): Map<string, PokemonTcgCard> {
    const map = new Map<string, PokemonTcgCard>();
    for (const card of cards) {
      map.set(card.number, card);
    }
    return map;
  }

  private buildNameMap(
    cards: PokemonTcgCard[],
  ): Map<string, PokemonTcgCard> {
    // Only include names that are unique within the set — cards sharing a name
    // (e.g. basic + illustration rare) cannot be reliably matched by name alone.
    const counts = new Map<string, number>();
    for (const card of cards) {
      const key = card.name.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const map = new Map<string, PokemonTcgCard>();
    for (const card of cards) {
      const key = card.name.toLowerCase();
      if (counts.get(key) === 1) {
        map.set(key, card);
      }
    }
    return map;
  }

  // Updates the single current-price row (CardPrice) and appends a historical snapshot (PriceSnapshot).
  // CardPrice holds the latest price; PriceSnapshot accumulates one row per sync per card.
  private async upsertCardPrice(
    cardId: string,
    apiCard: PokemonTcgCard,
  ): Promise<void> {
    const { marketPrice, lowPrice, midPrice, highPrice } =
      this.extractPrices(apiCard);
    const tcgplayerUrl = apiCard.tcgplayer?.url ?? null;

    await this.prisma.cardPrice.upsert({
      where: { cardId },
      create: { cardId, marketPrice, lowPrice, midPrice, highPrice, tcgplayerUrl },
      update: { marketPrice, lowPrice, midPrice, highPrice, tcgplayerUrl },
    });

    // Only snapshot when we have a real price — avoids polluting history with nulls
    if (marketPrice !== null) {
      await this.prisma.priceSnapshot.create({
        data: { cardId, marketPrice },
      });
    }
  }

  // Picks the most relevant price variant from TCGPlayer's data.
  // Cards can have multiple variants (normal, holofoil, etc.); we prefer 'normal' first,
  // then holo variants in order of rarity, then fall back to whatever key exists.
  private extractPrices(apiCard: PokemonTcgCard): {
    marketPrice: number | null;
    lowPrice: number | null;
    midPrice: number | null;
    highPrice: number | null;
  } {
    const prices = apiCard.tcgplayer?.prices;
    if (!prices) {
      return { marketPrice: null, lowPrice: null, midPrice: null, highPrice: null };
    }

    const preferredKeys = [
      'normal',
      'holofoil',
      'reverseHolofoil',
      'illustrationRare',
      'specialIllustrationRare',
      'hyperRare',
    ];
    let variant: PriceVariant | undefined;

    for (const key of preferredKeys) {
      if (prices[key]) {
        variant = prices[key];
        break;
      }
    }
    if (!variant) {
      const firstKey = Object.keys(prices)[0];
      variant = firstKey ? prices[firstKey] : undefined;
    }

    if (!variant) {
      return { marketPrice: null, lowPrice: null, midPrice: null, highPrice: null };
    }

    return {
      marketPrice: variant.market ?? null,
      lowPrice: variant.low ?? null,
      midPrice: variant.mid ?? null,
      highPrice: variant.high ?? null,
    };
  }
}
