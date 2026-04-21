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

  describe('extractLocalId', () => {
    it.each([
      ['sv03-013', 'sv03', '13'],
      ['sv03-198', 'sv03', '198'],
      ['sv03-TG01', 'sv03', 'TG01'],
      ['swsh01-001', 'swsh01', '1'],
      ['base1-4', 'base1', '4'],
    ])('%s → %s', (cardId, setId, expected) => {
      expect((service as any).extractLocalId(cardId, setId)).toBe(expected);
    });
  });

  describe('same-name different-number cards get distinct prices', () => {
    it('assigns correct prices to common and illustration rare Sprigatito', async () => {
      mockPrisma.card.findMany.mockResolvedValue([
        { id: 'sv03-013', name: 'Sprigatito' },
        { id: 'sv03-198', name: 'Sprigatito' },
      ]);

      mockHttpService.get.mockReturnValue(
        makeApiResponse([
          {
            id: 'sv3-13',
            name: 'Sprigatito',
            number: '13',
            set: { id: 'sv3', name: 'Paldea Evolved' },
            tcgplayer: {
              url: 'https://www.tcgplayer.com/product/common',
              prices: { normal: { low: 0.1, mid: 0.2, high: 0.5, market: 0.15 } },
            },
          },
          {
            id: 'sv3-198',
            name: 'Sprigatito',
            number: '198',
            set: { id: 'sv3', name: 'Paldea Evolved' },
            tcgplayer: {
              url: 'https://www.tcgplayer.com/product/illus-rare',
              prices: { holofoil: { low: 8.0, mid: 12.0, high: 20.0, market: 10.0 } },
            },
          },
        ]),
      );

      await (service as any).syncSetPrices('sv03');

      const upsertCalls = mockPrisma.cardPrice.upsert.mock.calls;
      expect(upsertCalls).toHaveLength(2);

      const commonCall = upsertCalls.find((c: any) => c[0].where.cardId === 'sv03-013');
      const illusCall = upsertCalls.find((c: any) => c[0].where.cardId === 'sv03-198');

      expect(commonCall[0].create).toMatchObject({ marketPrice: 0.15 });
      expect(illusCall[0].create).toMatchObject({ marketPrice: 10.0 });
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
