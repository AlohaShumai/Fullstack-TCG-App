import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  // Returns all collections with a card count badge (_count.cards) but not the full card list
  async getUserCollections(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: {
        _count: {
          select: { cards: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Fetches full card list. Public collections are readable by anyone (shared link support).
  async getCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        cards: {
          include: {
            card: true,
          },
          orderBy: { card: { name: 'asc' } },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  // Create a new collection
  async createCollection(
    userId: string,
    data: { name: string; description?: string; isPublic?: boolean },
  ) {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('Collection name is required');
    }

    return this.prisma.collection.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isPublic: data.isPublic || false,
        userId,
      },
    });
  }

  // Update a collection
  async updateCollection(
    userId: string,
    collectionId: string,
    data: { name?: string; description?: string; isPublic?: boolean },
  ) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: data.name?.trim() || collection.name,
        description:
          data.description !== undefined
            ? data.description?.trim() || null
            : collection.description,
        isPublic:
          data.isPublic !== undefined ? data.isPublic : collection.isPublic,
      },
    });
  }

  // Delete a collection
  async deleteCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.collection.delete({
      where: { id: collectionId },
    });

    return { message: 'Collection deleted' };
  }

  // Adds a card or increments its quantity if it's already in the collection (upsert)
  async addToCollection(
    userId: string,
    collectionId: string,
    cardId: string,
    quantity: number = 1,
  ) {
    // Verify collection belongs to user
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Verify card exists
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    return this.prisma.collectionCard.upsert({
      where: {
        collectionId_cardId: { collectionId, cardId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        collectionId,
        cardId,
        quantity,
      },
      include: {
        card: true,
      },
    });
  }

  // Sets quantity to an exact number; deletes the row if quantity drops to 0
  async updateCardQuantity(
    userId: string,
    collectionId: string,
    cardId: string,
    quantity: number,
  ) {
    // Verify collection belongs to user
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const existing = await this.prisma.collectionCard.findUnique({
      where: {
        collectionId_cardId: { collectionId, cardId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Card not in collection');
    }

    if (quantity <= 0) {
      await this.prisma.collectionCard.delete({
        where: {
          collectionId_cardId: { collectionId, cardId },
        },
      });
      return { message: 'Card removed from collection' };
    }

    return this.prisma.collectionCard.update({
      where: {
        collectionId_cardId: { collectionId, cardId },
      },
      data: { quantity },
      include: {
        card: true,
      },
    });
  }

  // Remove a card from collection
  async removeFromCollection(
    userId: string,
    collectionId: string,
    cardId: string,
  ) {
    // Verify collection belongs to user
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const existing = await this.prisma.collectionCard.findUnique({
      where: {
        collectionId_cardId: { collectionId, cardId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Card not in collection');
    }

    await this.prisma.collectionCard.delete({
      where: {
        collectionId_cardId: { collectionId, cardId },
      },
    });

    return { message: 'Card removed from collection' };
  }

  // Get collection stats
  async getCollectionStats(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const totalCards = collection.cards.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const uniqueCards = collection.cards.length;

    const supertypeCount: Record<string, number> = {};
    for (const item of collection.cards) {
      const supertype = item.card.supertype || 'Unknown';
      supertypeCount[supertype] = (supertypeCount[supertype] || 0) + item.quantity;
    }

    return {
      totalCards,
      uniqueCards,
      bySupertype: supertypeCount,
    };
  }

  // Current value = sum of (quantity × current market price) for every card in the collection.
  // History = 30-day chart built from PriceSnapshot rows (one row per card per sync run).
  async getCollectionPortfolio(
    collectionId: string,
    userId: string,
  ): Promise<{ currentValue: number; history: { date: string; value: number }[] }> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
      include: {
        cards: {
          include: { card: { include: { prices: true } } },
        },
      },
    });

    if (!collection) throw new NotFoundException('Collection not found');

    const currentValue = collection.cards.reduce(
      (sum, cc) => sum + cc.quantity * (cc.card.prices?.marketPrice ?? 0),
      0,
    );

    const cards = collection.cards.map((cc) => ({
      cardId: cc.cardId,
      quantity: cc.quantity,
    }));

    const history = await this.buildPortfolioHistory(cards);
    return { currentValue: Math.round(currentValue * 100) / 100, history };
  }

  // Same as getCollectionPortfolio but sums across ALL of the user's collections.
  // A card that appears in two collections is counted with combined quantity.
  async getUserPortfolio(
    userId: string,
  ): Promise<{ currentValue: number; history: { date: string; value: number }[] }> {
    const collectionCards = await this.prisma.collectionCard.findMany({
      where: { collection: { userId } },
      include: { card: { include: { prices: true } } },
    });

    // Merge duplicate card entries across collections into a single quantity per card
    const cardMap = new Map<string, { quantity: number; marketPrice: number | null }>();
    for (const cc of collectionCards) {
      const existing = cardMap.get(cc.cardId);
      if (existing) {
        existing.quantity += cc.quantity;
      } else {
        cardMap.set(cc.cardId, {
          quantity: cc.quantity,
          marketPrice: cc.card.prices?.marketPrice ?? null,
        });
      }
    }

    const currentValue = Array.from(cardMap.values()).reduce(
      (sum, { quantity, marketPrice }) => sum + quantity * (marketPrice ?? 0),
      0,
    );

    const cards = Array.from(cardMap.entries()).map(([cardId, { quantity }]) => ({
      cardId,
      quantity,
    }));

    const history = await this.buildPortfolioHistory(cards);
    return { currentValue: Math.round(currentValue * 100) / 100, history };
  }

  // Builds a 30-day value chart from PriceSnapshot data.
  // For each day, it uses the most recent snapshot taken ON or BEFORE that day
  // (carry-forward pricing) so gaps don't cause missing data points.
  // Fetches 35 days of snapshots to ensure day-0 has a carry-forward value.
  private async buildPortfolioHistory(
    cards: Array<{ cardId: string; quantity: number }>,
  ): Promise<Array<{ date: string; value: number }>> {
    if (cards.length === 0) return [];

    const cardIds = cards.map((c) => c.cardId);
    const since = new Date();
    since.setDate(since.getDate() - 35);

    const snapshots = await this.prisma.priceSnapshot.findMany({
      where: { cardId: { in: cardIds }, capturedAt: { gte: since } },
      orderBy: { capturedAt: 'asc' },
    });

    // Group snapshots by cardId for O(1) lookup during the day loop
    const snapshotMap = new Map<
      string,
      Array<{ capturedAt: Date; marketPrice: number | null }>
    >();
    for (const s of snapshots) {
      if (!snapshotMap.has(s.cardId)) snapshotMap.set(s.cardId, []);
      snapshotMap.get(s.cardId)!.push(s);
    }

    const history: Array<{ date: string; value: number }> = [];
    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const day = new Date();
      day.setDate(day.getDate() - daysAgo);
      // End-of-day timestamp so any snapshot taken that day counts as "on" that day
      day.setHours(23, 59, 59, 999);

      let dayValue = 0;
      for (const { cardId, quantity } of cards) {
        const cardSnaps = snapshotMap.get(cardId) ?? [];
        let latestPrice: number | null = null;
        // Walk forward through sorted snapshots; last one <= day is the carry-forward price
        for (const s of cardSnaps) {
          if (s.capturedAt <= day && s.marketPrice !== null) {
            latestPrice = s.marketPrice;
          }
        }
        if (latestPrice !== null) {
          dayValue += quantity * latestPrice;
        }
      }

      history.push({
        date: day.toISOString().split('T')[0],
        value: Math.round(dayValue * 100) / 100,
      });
    }

    return history;
  }
}
