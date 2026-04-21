import { PricesService } from './prices.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { of } from 'rxjs';

const mockPrisma = {
  card: { findMany: jest.fn(), findUnique: jest.fn() },
  cardPrice: { upsert: jest.fn() },
  priceSnapshot: { create: jest.fn() },
};

const mockHttpService = { get: jest.fn() };

const mockConfigService = { get: jest.fn() };

function makeApiResponse(cards: object[], totalCount?: number) {
  return of({
    data: {
      data: cards,
      page: 1,
      pageSize: 250,
      count: cards.length,
      totalCount: totalCount ?? cards.length,
    },
  });
}

describe('PricesService', () => {
  let service: PricesService;

  beforeEach(() => {
    service = new PricesService(
      mockPrisma as unknown as PrismaService,
      mockHttpService as unknown as HttpService,
      mockConfigService as unknown as ConfigService,
    );
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'POKEMON_TCG_API_URL') return 'https://api.pokemontcg.io/v2';
      if (key === 'POKEMONTCG_API_KEY') return 'test-key';
      return null;
    });

    mockPrisma.cardPrice.upsert.mockResolvedValue({});
    mockPrisma.priceSnapshot.create.mockResolvedValue({});
  });

  describe('toPokemonTcgSetId', () => {
    it.each([
      ['sv03', 'sv3'],
      ['sv03pt5', 'sv3pt5'],
      ['swsh01', 'swsh1'],
      ['sv3', 'sv3'],
      ['swsh12', 'swsh12'],
      ['base1', 'base1'],
    ])('maps %s → %s', (input, expected) => {
      expect((service as any).toPokemonTcgSetId(input)).toBe(expected);
    });
  });

  describe('syncCardPrice', () => {
    it('should upsert price data when the API returns a matching card', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({
        id: 'sv1-1',
        name: 'Sprigatito',
        setId: 'sv1',
        setName: 'Scarlet & Violet',
      });

      mockHttpService.get.mockReturnValue(
        makeApiResponse([
          {
            id: 'sv1-1',
            name: 'Sprigatito',
            set: { id: 'sv1', name: 'Scarlet & Violet' },
            tcgplayer: {
              url: 'https://www.tcgplayer.com/product/123',
              prices: {
                normal: { low: 0.5, mid: 1.0, high: 2.0, market: 0.75 },
              },
            },
          },
        ]),
      );

      await service.syncCardPrice('sv1-1');

      expect(mockPrisma.cardPrice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cardId: 'sv1-1' },
          create: expect.objectContaining({ marketPrice: 0.75, lowPrice: 0.5 }),
          update: expect.objectContaining({ marketPrice: 0.75, lowPrice: 0.5 }),
        }),
      );
      expect(mockPrisma.priceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cardId: 'sv1-1', marketPrice: 0.75 }),
        }),
      );
    });

    it('should skip upsert gracefully when no API match is found for the card', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({
        id: 'base1-4',
        name: 'Charizard',
        setId: 'base1',
        setName: 'Base Set',
      });

      mockHttpService.get.mockReturnValue(
        makeApiResponse([
          {
            id: 'base1-99',
            name: 'Completely Different Card',
            set: { id: 'base1', name: 'Base Set' },
            tcgplayer: null,
          },
        ]),
      );

      await expect(service.syncCardPrice('base1-4')).resolves.not.toThrow();
      expect(mockPrisma.cardPrice.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.priceSnapshot.create).not.toHaveBeenCalled();
    });
  });
});
