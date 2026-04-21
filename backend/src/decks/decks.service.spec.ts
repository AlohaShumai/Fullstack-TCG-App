import { DecksService } from './decks.service';
import { PrismaService } from '../prisma/prisma.service';

// Fake version of PrismaService — no real database needed
const mockPrisma = {
  deck: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  card: {
    findUnique: jest.fn(),
  },
  deckCard: {
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// Helper to build a minimal valid card
function makeCard(overrides: Partial<{
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  setName: string;
}> = {}) {
  return {
    id: 'card-1',
    name: 'Pikachu',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    setName: 'Temporal Forces',
    ...overrides,
  };
}

// Helper to build a deck with a cards array
function makeDeck(overrides: Partial<{
  id: string;
  name: string;
  format: string;
  userId: string;
  cards: { cardId: string; quantity: number; card: ReturnType<typeof makeCard> }[];
}> = {}) {
  return {
    id: 'deck-1',
    name: 'Test Deck',
    format: 'unlimited',
    userId: 'user-1',
    cards: [],
    ...overrides,
  };
}

describe('DecksService', () => {
  let service: DecksService;

  beforeEach(() => {
    service = new DecksService(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  describe('parseDeckList', () => {
    it('should parse a well-formed deck list into correct entries', () => {
      const list = `Pokémon: 2
4 Charizard ex OBF 125
3 Pidgey OBF 163

Trainer: 1
4 Rare Candy SVI 191

Energy: 1
9 Basic Fire Energy`;

      const result = service.parseDeckList(list);

      expect(result).toEqual([
        { quantity: 4, cardName: 'Charizard ex', setCode: 'OBF', setNumber: '125' },
        { quantity: 3, cardName: 'Pidgey', setCode: 'OBF', setNumber: '163' },
        { quantity: 4, cardName: 'Rare Candy', setCode: 'SVI', setNumber: '191' },
        { quantity: 9, cardName: 'Basic Fire Energy' },
      ]);
    });

    it('should skip section headers, blank lines, and unparseable lines', () => {
      const list = `Pokémon: 14
not a valid line at all
4 Charizard ex OBF 125

!!!garbage!!!
3 Basic Psychic Energy`;

      const result = service.parseDeckList(list);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ quantity: 4, cardName: 'Charizard ex', setCode: 'OBF' });
      expect(result[1]).toMatchObject({ quantity: 3, cardName: 'Basic Psychic Energy' });
    });
  });

  describe('validateDeck', () => {
    // ------------------------------------------------------------------ //
    // Rule 1: exactly 60 cards
    // ------------------------------------------------------------------ //
    it('should fail if deck does not have exactly 60 cards', async () => {
      // Arrange
      mockPrisma.deck.findUnique.mockResolvedValue(
        makeDeck({
          cards: [
            { cardId: 'card-1', quantity: 10, card: makeCard() },
          ],
        }),
      );

      // Act
      const result = await service.validateDeck('user-1', 'deck-1');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deck has 10 cards (must be exactly 60)');
    });

    // ------------------------------------------------------------------ //
    // Rule 2: no more than 4 copies of a non-basic-energy card
    // ------------------------------------------------------------------ //
    it('should fail if a non-basic-energy card has more than 4 copies', async () => {
      mockPrisma.deck.findUnique.mockResolvedValue(
        makeDeck({
          cards: [
            {
              cardId: 'card-1',
              quantity: 5,
              card: makeCard({ supertype: 'Pokémon', subtypes: ['Basic'] }),
            },
            // Pad to 60 total with basic energy
            {
              cardId: 'energy-1',
              quantity: 55,
              card: makeCard({
                id: 'energy-1',
                name: 'Fire Energy',
                supertype: 'Energy',
                subtypes: ['Basic'],
              }),
            },
          ],
        }),
      );

      const result = await service.validateDeck('user-1', 'deck-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Pikachu has 5 copies (max 4 for non-basic Energy)',
      );
    });

    // ------------------------------------------------------------------ //
    // Rule 3: basic energy is exempt from the 4-copy rule
    // ------------------------------------------------------------------ //
    it('should allow more than 4 copies of a basic energy card', async () => {
      // 4 Pikachu + 56 Fire Energy = 60 cards, all rules satisfied
      mockPrisma.deck.findUnique.mockResolvedValue(
        makeDeck({
          cards: [
            {
              cardId: 'card-1',
              quantity: 4,
              card: makeCard({ supertype: 'Pokémon', subtypes: ['Basic'] }),
            },
            {
              cardId: 'energy-1',
              quantity: 56,
              card: makeCard({
                id: 'energy-1',
                name: 'Fire Energy',
                supertype: 'Energy',
                subtypes: ['Basic'],
              }),
            },
          ],
        }),
      );

      const result = await service.validateDeck('user-1', 'deck-1');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // ------------------------------------------------------------------ //
    // Rule 4: cards must be legal in the deck's format
    // ------------------------------------------------------------------ //
    it('should fail if a card is not legal in the standard format', async () => {
      mockPrisma.deck.findUnique.mockResolvedValue(
        makeDeck({
          format: 'standard',
          cards: [
            {
              cardId: 'card-1',
              quantity: 4,
              card: makeCard({
                supertype: 'Pokémon',
                subtypes: ['Basic'],
                setName: 'Base Set', // not in any standard rotation
              }),
            },
            {
              cardId: 'energy-1',
              quantity: 56,
              card: makeCard({
                id: 'energy-1',
                name: 'Fire Energy',
                supertype: 'Energy',
                subtypes: ['Basic'],
                setName: 'Temporal Forces',
              }),
            },
          ],
        }),
      );

      const result = await service.validateDeck('user-1', 'deck-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Pikachu (Base Set) is not legal in standard format',
      );
    });

    // ------------------------------------------------------------------ //
    // Rule 5: deck needs at least 1 Basic Pokémon
    // ------------------------------------------------------------------ //
    it('should fail if deck has no Basic Pokémon', async () => {
      // 60 trainer cards — no Pokémon at all
      mockPrisma.deck.findUnique.mockResolvedValue(
        makeDeck({
          cards: [
            {
              cardId: 'trainer-1',
              quantity: 60,
              card: makeCard({
                id: 'trainer-1',
                name: 'Professor Research',
                supertype: 'Trainer',
                subtypes: ['Supporter'],
              }),
            },
          ],
        }),
      );

      const result = await service.validateDeck('user-1', 'deck-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deck must have at least 1 Basic Pokémon');
    });

    // ------------------------------------------------------------------ //
    // Happy path: a valid deck passes all checks
    // ------------------------------------------------------------------ //
    it('should return valid for a legal 60-card unlimited deck', async () => {
      mockPrisma.deck.findUnique.mockResolvedValue(
        makeDeck({
          cards: [
            {
              cardId: 'card-1',
              quantity: 4,
              card: makeCard({ supertype: 'Pokémon', subtypes: ['Basic'] }),
            },
            {
              cardId: 'energy-1',
              quantity: 56,
              card: makeCard({
                id: 'energy-1',
                name: 'Fire Energy',
                supertype: 'Energy',
                subtypes: ['Basic'],
              }),
            },
          ],
        }),
      );

      const result = await service.validateDeck('user-1', 'deck-1');

      expect(result.valid).toBe(true);
      expect(result.totalCards).toBe(60);
      expect(result.errors).toHaveLength(0);
    });
  });
});
