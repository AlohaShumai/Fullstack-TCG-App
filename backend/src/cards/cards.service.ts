import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import {
  isSetStandardLegal,
  isCardBanned,
  STANDARD_LEGAL_SETS,
  ROTATION_INFO,
} from '../config/rotation.config';

// TCGdex API interfaces
interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  abilities?: Array<{
    name: string;
    effect: string;
    type: string;
  }>;
  attacks?: Array<{
    name: string;
    cost?: string[];
    damage?: string | number;
    effect?: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value?: string;
  }>;
  resistances?: Array<{
    type: string;
    value?: string;
  }>;
  retreat?: number;
  effect?: string;
  trainerType?: string;
  energyType?: string;
  regulationMark?: string;
  legal?: {
    standard: boolean;
    expanded: boolean;
  };
  set: {
    id: string;
    name: string;
  };
}

export interface TCGdexSetInfo {
  id: string;
  name: string;
  cardCount: {
    total: number;
    official: number;
  };
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);
  private readonly tcgdexUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.tcgdexUrl =
      this.configService.get<string>('TCGDEX_API_URL') ??
      'https://api.tcgdex.net/v2/en';
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySync() {
    this.logger.log('Starting scheduled card sync...');
    await this.syncStandardCards(5);
    this.logger.log('Scheduled card sync completed');
  }

  // Fetch all available sets from TCGdex
  async fetchAvailableSets(): Promise<TCGdexSetInfo[]> {
    try {
      this.logger.log('Fetching available sets from TCGdex...');
      const response = await firstValueFrom(
        this.httpService.get<TCGdexSetInfo[]>(`${this.tcgdexUrl}/sets`, {
          timeout: 30000,
        }),
      );
      this.logger.log(`Found ${response.data.length} sets`);
      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch sets: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // Sync a set by its ID using TCGdex
  async syncSetById(setId: string): Promise<{ synced: number }> {
    let totalSynced = 0;

    this.logger.log(`Syncing set by ID: ${setId}`);

    try {
      // First get the set info to get the set name
      const setResponse = await firstValueFrom(
        this.httpService.get<{
          id: string;
          name: string;
          cards: Array<{
            id: string;
            localId: string;
            name: string;
            image?: string;
          }>;
        }>(`${this.tcgdexUrl}/sets/${setId}`, { timeout: 60000 }),
      );

      const setName = setResponse.data.name;
      const cardList = setResponse.data.cards;

      this.logger.log(`Set "${setName}" has ${cardList.length} cards`);

      // Fetch each card's full details
      for (const cardRef of cardList) {
        try {
          const cardResponse = await firstValueFrom(
            this.httpService.get<TCGdexCard>(
              `${this.tcgdexUrl}/cards/${setId}-${cardRef.localId}`,
              { timeout: 30000 },
            ),
          );

          await this.upsertCardFromTCGdex(cardResponse.data, setId, setName);
          totalSynced++;

          if (totalSynced % 25 === 0) {
            this.logger.log(
              `Progress: ${totalSynced}/${cardList.length} cards synced`,
            );
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (cardError: unknown) {
          this.logger.warn(
            `Failed to fetch card ${cardRef.localId}: ${cardError instanceof Error ? cardError.message : String(cardError)}`,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to sync set ${setId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(`Finished syncing ${setId}. Total cards: ${totalSynced}`);
    return { synced: totalSynced };
  }

  // Sync set by name (searches for matching set)
  async syncSet(setName: string): Promise<{ synced: number }> {
    try {
      // Get all sets and find matching one
      const sets = await this.fetchAvailableSets();
      const matchingSet = sets.find(
        (s) =>
          s.name.toLowerCase().includes(setName.toLowerCase()) ||
          s.id.toLowerCase() === setName.toLowerCase(),
      );

      if (!matchingSet) {
        this.logger.error(`Set "${setName}" not found`);
        return { synced: 0 };
      }

      return this.syncSetById(matchingSet.id);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to sync set ${setName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { synced: 0 };
    }
  }

  // Sync standard legal cards
  async syncStandardCards(maxSets: number = 5): Promise<{ synced: number }> {
    let totalSynced = 0;

    try {
      const sets = await this.fetchAvailableSets();

      // Filter for Scarlet & Violet sets (standard legal)
      const standardSets = sets
        .filter(
          (s) =>
            s.id.startsWith('sv') ||
            STANDARD_LEGAL_SETS.some((legal) =>
              s.name.toLowerCase().includes(legal.toLowerCase()),
            ),
        )
        .slice(0, maxSets);

      this.logger.log(`Syncing ${standardSets.length} standard sets`);

      for (const set of standardSets) {
        const result = await this.syncSetById(set.id);
        totalSynced += result.synced;

        // Delay between sets
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to sync standard cards: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { synced: totalSynced };
  }

  private async upsertCardFromTCGdex(
    card: TCGdexCard,
    setId: string,
    setName: string,
  ): Promise<void> {
    // Determine supertype from category
    let supertype = 'Pokémon';
    if (card.category === 'Trainer') supertype = 'Trainer';
    if (card.category === 'Energy') supertype = 'Energy';

    // Build subtypes
    const subtypes: string[] = [];
    if (card.stage) subtypes.push(card.stage);
    if (card.trainerType) subtypes.push(card.trainerType);
    if (card.energyType) subtypes.push(card.energyType);

    // Use our rotation config to determine Standard legality
    const isStandardLegal =
      isSetStandardLegal(setName) && !isCardBanned(card.id);

    // Build legalities object
    const legalities = {
      standard: isStandardLegal ? 'Legal' : 'Banned',
      expanded: card.legal?.expanded ? 'Legal' : 'Banned',
      unlimited: 'Legal',
    };

    // Convert attacks format
    const attacks =
      card.attacks?.map((a) => ({
        name: a.name,
        cost: a.cost || [],
        damage: String(a.damage || ''),
        text: a.effect || '',
      })) || [];

    // Convert abilities format
    const abilities =
      card.abilities?.map((a) => ({
        name: a.name,
        text: a.effect,
        type: a.type || 'Ability',
      })) || [];

    // Convert weaknesses format
    const weaknesses =
      card.weaknesses?.map((w) => ({
        type: w.type,
        value: w.value || '×2',
      })) || [];

    // Convert resistances format
    const resistances =
      card.resistances?.map((r) => ({
        type: r.type,
        value: r.value || '-30',
      })) || [];

    // Build retreat cost array
    const retreatCost: string[] = [];
    if (card.retreat) {
      for (let i = 0; i < card.retreat; i++) {
        retreatCost.push('Colorless');
      }
    }

    // Get image URLs
    const imageBase =
      card.image || `https://assets.tcgdex.net/en/${setId}/${card.localId}`;
    const imageSmall = `${imageBase}/low.webp`;
    const imageLarge = `${imageBase}/high.webp`;

    const cardId = `${setId}-${card.localId}`;

    await this.prisma.card.upsert({
      where: { id: cardId },
      update: {
        name: card.name,
        supertype,
        subtypes,
        hp: card.hp ? String(card.hp) : null,
        types: card.types || [],
        abilities: this.toJsonValue(abilities),
        attacks: this.toJsonValue(attacks),
        weaknesses: this.toJsonValue(weaknesses),
        resistances: this.toJsonValue(resistances),
        retreatCost,
        rules: card.effect ? [card.effect] : [],
        legalities: this.toJsonValue(legalities),
        imageSmall,
        imageLarge,
        setId,
        setName,
        updatedAt: new Date(),
      },
      create: {
        id: cardId,
        name: card.name,
        supertype,
        subtypes,
        hp: card.hp ? String(card.hp) : null,
        types: card.types || [],
        abilities: this.toJsonValue(abilities),
        attacks: this.toJsonValue(attacks),
        weaknesses: this.toJsonValue(weaknesses),
        resistances: this.toJsonValue(resistances),
        retreatCost,
        rules: card.effect ? [card.effect] : [],
        legalities: this.toJsonValue(legalities),
        imageSmall,
        imageLarge,
        setId,
        setName,
      },
    });
  }

  private toJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }
    return value as Prisma.InputJsonValue;
  }

  async getCards(filters: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    set?: string;
    supertype?: string;
    format?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const baseWhere: Prisma.CardWhereInput = {};

    if (filters.type) {
      baseWhere.types = { has: filters.type };
    }
    if (filters.supertype) {
      baseWhere.supertype = filters.supertype;
    }
    if (filters.set) {
      baseWhere.setName = filters.set;
    }
    if (filters.format === 'standard') {
      baseWhere.legalities = {
        path: ['standard'],
        equals: 'Legal',
      };
    }

    // If searching, get "starts with" matches first, then "contains" matches
    if (filters.search) {
      const searchTerm = filters.search;

      // First: Get cards that START with the search term
      const startsWithCards = await this.prisma.card.findMany({
        where: {
          ...baseWhere,
          name: { startsWith: searchTerm, mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
        take: 500,
      });

      // Second: Get cards that CONTAIN the search term (but don't start with it)
      const containsCards = await this.prisma.card.findMany({
        where: {
          ...baseWhere,
          name: { contains: searchTerm, mode: 'insensitive' },
          NOT: { name: { startsWith: searchTerm, mode: 'insensitive' } },
        },
        orderBy: { name: 'asc' },
        take: 500,
      });

      // Combine: starts with first, then contains
      const allCards = [...startsWithCards, ...containsCards];
      const total = allCards.length;

      // Paginate
      const skip = (page - 1) * limit;
      const paginatedCards = allCards.slice(skip, skip + limit);

      return {
        data: paginatedCards,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // No search - use normal database pagination
    const skip = (page - 1) * limit;
    const [cards, total] = await Promise.all([
      this.prisma.card.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.card.count({ where: baseWhere }),
    ]);

    return {
      data: cards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCardById(id: string) {
    return this.prisma.card.findUnique({
      where: { id },
      include: { prices: true },
    });
  }

  async getCardPriceHistory(cardId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const snapshots = await this.prisma.priceSnapshot.findMany({
      where: { cardId, capturedAt: { gte: since } },
      orderBy: { capturedAt: 'asc' },
    });

    return snapshots.map((s) => ({
      date: s.capturedAt.toISOString().split('T')[0],
      price: s.marketPrice,
    }));
  }

  async searchCards(query: string) {
    return this.prisma.card.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { setName: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 50,
    });
  }

  async getCardCount() {
    return this.prisma.card.count();
  }

  async getAllSets() {
    const sets = await this.prisma.card.findMany({
      select: { setName: true },
      distinct: ['setName'],
      orderBy: { setName: 'asc' },
    });
    return sets.map((s) => s.setName);
  }

  async getAllSetsWithLegality() {
    const sets = await this.prisma.card.findMany({
      select: {
        setId: true,
        setName: true,
      },
      distinct: ['setId'],
      orderBy: { setName: 'asc' },
    });

    return sets.map((set) => ({
      id: set.setId,
      name: set.setName,
      standardLegal: isSetStandardLegal(set.setName),
      expandedLegal: true,
    }));
  }

  getRotationInfo() {
    return {
      ...ROTATION_INFO,
      standardLegalSets: STANDARD_LEGAL_SETS,
    };
  }
}
