import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DecksService {
  constructor(private prisma: PrismaService) {}

  private isBasicEnergy(card: {
    supertype: string;
    subtypes: string[];
  }): boolean {
    return card.supertype === 'Energy' && card.subtypes.includes('Basic');
  }

  async createDeck(userId: string, name: string) {
    return this.prisma.deck.create({
      data: {
        name,
        userId,
      },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });
  }

  async getUserDecks(userId: string) {
    return this.prisma.deck.findMany({
      where: { userId },
      include: {
        cards: {
          include: { card: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeckById(userId: string, deckId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    if (deck.userId !== userId) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async updateDeck(userId: string, deckId: string, name: string) {
    await this.getDeckById(userId, deckId);

    return this.prisma.deck.update({
      where: { id: deckId },
      data: { name },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });
  }

  async deleteDeck(userId: string, deckId: string) {
    await this.getDeckById(userId, deckId);

    await this.prisma.deck.delete({
      where: { id: deckId },
    });

    return { message: 'Deck deleted' };
  }

  async addCardToDeck(
    userId: string,
    deckId: string,
    cardId: string,
    quantity: number,
  ) {
    const deck = await this.getDeckById(userId, deckId);

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    // Calculate current deck size
    const currentSize = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);

    // Check 60 card limit
    if (currentSize + quantity > 60) {
      throw new BadRequestException(
        `Cannot add ${quantity} cards. Deck would have ${currentSize + quantity} cards (max 60)`,
      );
    }

    // Check 4-copy rule (except basic energy)
    if (!this.isBasicEnergy(card)) {
      const existingEntry = deck.cards.find((dc) => dc.cardId === cardId);
      const existingQuantity = existingEntry ? existingEntry.quantity : 0;

      if (existingQuantity + quantity > 4) {
        throw new BadRequestException(
          `Cannot have more than 4 copies of ${card.name} (non-basic Energy). Current: ${existingQuantity}, Adding: ${quantity}`,
        );
      }
    }

    return this.prisma.deckCard.upsert({
      where: {
        deckId_cardId: { deckId, cardId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        deckId,
        cardId,
        quantity,
      },
      include: {
        card: true,
      },
    });
  }

  async updateDeckCard(
    userId: string,
    deckId: string,
    cardId: string,
    quantity: number,
  ) {
    const deck = await this.getDeckById(userId, deckId);

    const existingEntry = deck.cards.find((dc) => dc.cardId === cardId);
    if (!existingEntry) {
      throw new NotFoundException('Card not in deck');
    }

    if (quantity === 0) {
      await this.prisma.deckCard.delete({
        where: {
          deckId_cardId: { deckId, cardId },
        },
      });
      return { message: 'Card removed from deck' };
    }

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    // Check 4-copy rule for non-basic energy
    if (card && !this.isBasicEnergy(card) && quantity > 4) {
      throw new BadRequestException(
        `Cannot have more than 4 copies of ${card.name} (non-basic Energy)`,
      );
    }

    // Check 60 card limit
    const currentSize = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);
    const diff = quantity - existingEntry.quantity;

    if (currentSize + diff > 60) {
      throw new BadRequestException(
        `Cannot update. Deck would have ${currentSize + diff} cards (max 60)`,
      );
    }

    return this.prisma.deckCard.update({
      where: {
        deckId_cardId: { deckId, cardId },
      },
      data: { quantity },
      include: {
        card: true,
      },
    });
  }

  async removeCardFromDeck(userId: string, deckId: string, cardId: string) {
    const deck = await this.getDeckById(userId, deckId);

    const existingEntry = deck.cards.find((dc) => dc.cardId === cardId);
    if (!existingEntry) {
      throw new NotFoundException('Card not in deck');
    }

    await this.prisma.deckCard.delete({
      where: {
        deckId_cardId: { deckId, cardId },
      },
    });

    return { message: 'Card removed from deck' };
  }

  async validateDeck(userId: string, deckId: string) {
    const deck = await this.getDeckById(userId, deckId);

    const errors: string[] = [];
    const totalCards = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);

    if (totalCards !== 60) {
      errors.push(`Deck has ${totalCards} cards (must be exactly 60)`);
    }

    for (const deckCard of deck.cards) {
      if (!this.isBasicEnergy(deckCard.card) && deckCard.quantity > 4) {
        errors.push(
          `${deckCard.card.name} has ${deckCard.quantity} copies (max 4 for non-basic Energy)`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      totalCards,
      errors,
    };
  }
}
