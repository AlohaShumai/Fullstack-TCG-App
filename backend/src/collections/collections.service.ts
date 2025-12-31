import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async getCollection(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: {
        card: true,
      },
      orderBy: { card: { name: 'asc' } },
    });
  }

  async addToCollection(userId: string, cardId: string, quantity: number) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    return this.prisma.collection.upsert({
      where: {
        userId_cardId: { userId, cardId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId,
        cardId,
        quantity,
      },
      include: {
        card: true,
      },
    });
  }

  async updateQuantity(userId: string, cardId: string, quantity: number) {
    const existing = await this.prisma.collection.findUnique({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Card not in collection');
    }

    if (quantity === 0) {
      await this.prisma.collection.delete({
        where: {
          userId_cardId: { userId, cardId },
        },
      });
      return { message: 'Card removed from collection' };
    }

    return this.prisma.collection.update({
      where: {
        userId_cardId: { userId, cardId },
      },
      data: { quantity },
      include: {
        card: true,
      },
    });
  }

  async removeFromCollection(userId: string, cardId: string) {
    const existing = await this.prisma.collection.findUnique({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Card not in collection');
    }

    await this.prisma.collection.delete({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    return { message: 'Card removed from collection' };
  }

  async getCollectionStats(userId: string) {
    const collection = await this.prisma.collection.findMany({
      where: { userId },
      include: { card: true },
    });

    const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueCards = collection.length;

    const typeCount: Record<string, number> = {};
    for (const item of collection) {
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
