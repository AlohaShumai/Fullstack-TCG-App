import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  abilities?: Array<{
    name: string;
    text: string;
    type: string;
  }>;
  attacks?: Array<{
    name: string;
    cost: string[];
    damage: string;
    text: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  resistances?: Array<{
    type: string;
    value: string;
  }>;
  retreatCost?: string[];
  rules?: string[];
  set: {
    id: string;
    name: string;
  };
  images: {
    small: string;
    large: string;
  };
}

interface ApiResponse {
  data: PokemonCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.apiUrl =
      this.configService.get<string>('POKEMON_TCG_API_URL') ||
      'https://api.pokemontcg.io/v2';
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySync() {
    this.logger.log('Starting scheduled card sync...');
    await this.syncStandardLegal(5);
    this.logger.log('Scheduled card sync completed');
  }

  async syncCards(pages: number = 1): Promise<{ synced: number }> {
    let totalSynced = 0;
    const apiKey = this.configService.get<string>('POKEMON_TCG_API_KEY');

    for (let page = 1; page <= pages; page++) {
      this.logger.log(`Fetching page ${page}...`);

      const response = await firstValueFrom(
        this.httpService.get<ApiResponse>(`${this.apiUrl}/cards`, {
          params: {
            page,
            pageSize: 250,
            orderBy: '-set.releaseDate',
          },
          headers: apiKey ? { 'X-Api-Key': apiKey } : {},
        }),
      );

      const cards = response.data.data;
      this.logger.log(`Retrieved ${cards.length} cards`);

      for (const card of cards) {
        await this.upsertCard(card);
        totalSynced++;
      }

      this.logger.log(`Page ${page} complete. Total: ${totalSynced}`);
    }

    return { synced: totalSynced };
  }

  async syncStandardLegal(pages: number = 5): Promise<{ synced: number }> {
    let totalSynced = 0;
    const apiKey = this.configService.get<string>('POKEMON_TCG_API_KEY');

    for (let page = 1; page <= pages; page++) {
      this.logger.log(`Fetching Standard-legal cards (page ${page})...`);

      try {
        const response = await firstValueFrom(
          this.httpService.get<ApiResponse>(`${this.apiUrl}/cards`, {
            params: {
              page,
              pageSize: 250,
              q: 'legalities.standard:legal',
              orderBy: '-set.releaseDate',
            },
            headers: apiKey ? { 'X-Api-Key': apiKey } : {},
          }),
        );

        const cards = response.data.data;
        this.logger.log(`Retrieved ${cards.length} Standard cards`);

        for (const card of cards) {
          await this.upsertCard(card);
          totalSynced++;
        }

        this.logger.log(`Page ${page} complete. Total: ${totalSynced}`);
        // Wait 2 seconds between pages to avoid rate limiting
        if (page < pages) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        this.logger.error(`Error on page ${page}: ${error}`);
        // Continue to next page instead of failing completely
        continue;
      }
    }

    return { synced: totalSynced };
  }

  async syncExpandedLegal(pages: number = 5): Promise<{ synced: number }> {
    let totalSynced = 0;
    const apiKey = this.configService.get<string>('POKEMON_TCG_API_KEY');

    for (let page = 1; page <= pages; page++) {
      this.logger.log(`Fetching Expanded-legal cards (page ${page})...`);

      const response = await firstValueFrom(
        this.httpService.get<ApiResponse>(`${this.apiUrl}/cards`, {
          params: {
            page,
            pageSize: 250,
            q: 'legalities.expanded:legal',
            orderBy: '-set.releaseDate',
          },
          headers: apiKey ? { 'X-Api-Key': apiKey } : {},
        }),
      );

      const cards = response.data.data;
      this.logger.log(`Retrieved ${cards.length} Expanded cards`);

      for (const card of cards) {
        await this.upsertCard(card);
        totalSynced++;
      }

      this.logger.log(`Page ${page} complete. Total: ${totalSynced}`);
    }

    return { synced: totalSynced };
  }

  async syncSet(setName: string): Promise<{ synced: number }> {
    let totalSynced = 0;
    let page = 1;
    let hasMore = true;
    const apiKey = this.configService.get<string>('POKEMON_TCG_API_KEY');

    this.logger.log(`Syncing set: ${setName}`);

    while (hasMore) {
      const response = await firstValueFrom(
        this.httpService.get<ApiResponse>(`${this.apiUrl}/cards`, {
          params: {
            page,
            pageSize: 250,
            q: `set.name:"${setName}"`,
          },
          headers: apiKey ? { 'X-Api-Key': apiKey } : {},
        }),
      );

      const cards = response.data.data;
      this.logger.log(`Retrieved ${cards.length} cards from ${setName}`);

      for (const card of cards) {
        await this.upsertCard(card);
        totalSynced++;
      }

      hasMore = cards.length === 250;
      page++;
    }

    return { synced: totalSynced };
  }

  private toJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }
    return value as Prisma.InputJsonValue;
  }

  private async upsertCard(card: PokemonCard): Promise<void> {
    await this.prisma.card.upsert({
      where: { id: card.id },
      update: {
        name: card.name,
        supertype: card.supertype,
        subtypes: card.subtypes || [],
        hp: card.hp || null,
        types: card.types || [],
        abilities: this.toJsonValue(card.abilities),
        attacks: this.toJsonValue(card.attacks),
        weaknesses: this.toJsonValue(card.weaknesses),
        resistances: this.toJsonValue(card.resistances),
        retreatCost: card.retreatCost || [],
        rules: card.rules || [],
        imageSmall: card.images.small,
        imageLarge: card.images.large,
        setId: card.set.id,
        setName: card.set.name,
        updatedAt: new Date(),
      },
      create: {
        id: card.id,
        name: card.name,
        supertype: card.supertype,
        subtypes: card.subtypes || [],
        hp: card.hp || null,
        types: card.types || [],
        abilities: this.toJsonValue(card.abilities),
        attacks: this.toJsonValue(card.attacks),
        weaknesses: this.toJsonValue(card.weaknesses),
        resistances: this.toJsonValue(card.resistances),
        retreatCost: card.retreatCost || [],
        rules: card.rules || [],
        imageSmall: card.images.small,
        imageLarge: card.images.large,
        setId: card.set.id,
        setName: card.set.name,
      },
    });
  }

  async getAllCards() {
    return this.prisma.card.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCardById(id: string) {
    return this.prisma.card.findUnique({
      where: { id },
    });
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
}
