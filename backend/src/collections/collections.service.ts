import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  // Get all collections for a user
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

  // Get a specific collection with all its cards
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

  // Add a card to a collection
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

  // Update card quantity in collection
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

    const typeCount: Record<string, number> = {};
    for (const item of collection.cards) {
      for (const type of item.card.types) {
        typeCount[type] = (typeCount[type] || 0) + item.quantity;
      }
    }

    return {
      totalCards,
      uniqueCards,
      byType: typeCount,
    };
  }
}
