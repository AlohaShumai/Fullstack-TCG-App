import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isSetStandardLegal, isCardBanned } from '../config/rotation.config';

// Maps PTCGL/PTCGO set abbreviations → TCGdex set IDs (used to build card IDs)
const SET_CODE_MAP: Record<string, string> = {
  // Scarlet & Violet
  SVI: 'sv1',
  PAL: 'sv2',
  OBF: 'sv3',
  MEW: 'sv3pt5',
  PAF: 'sv4pt5',
  TEF: 'sv5',
  TWM: 'sv6',
  SFA: 'sv6pt5',
  SCR: 'sv7',
  SSP: 'sv8',
  PRE: 'sv8pt5',
  JTG: 'sv9',
  DRI: 'sv10',
  // Sword & Shield
  SSH: 'swsh1',
  RCL: 'swsh2',
  DAA: 'swsh3',
  CPA: 'swsh3pt5',
  VIV: 'swsh4',
  SHF: 'swsh4pt5',
  BST: 'swsh5',
  CRE: 'swsh6',
  EVS: 'swsh7',
  CEL: 'swsh7pt5',
  FST: 'swsh8',
  BRS: 'swsh9',
  ASR: 'swsh10',
  PGO: 'swsh10pt5',
  LOR: 'swsh11',
  SIT: 'swsh12',
  CRZ: 'swsh12pt5',
};

export interface ParsedEntry {
  quantity: number;
  cardName: string;
  setCode?: string;
  setNumber?: string;
}

interface CardLegalities {
  standard?: string;
  expanded?: string;
  unlimited?: string;
}

@Injectable()
export class DecksService {
  constructor(private prisma: PrismaService) {}

  private isBasicEnergy(card: {
    supertype: string;
    subtypes: string[];
  }): boolean {
    return card.supertype === 'Energy' && card.subtypes.includes('Basic');
  }

  private isCardLegalInFormat(
    card: { setName: string; id: string; legalities?: CardLegalities | null },
    format: string,
  ): boolean {
    if (format === 'unlimited') return true;

    // Use our rotation config for Standard
    if (format === 'standard') {
      return isSetStandardLegal(card.setName) && !isCardBanned(card.id);
    }

    return true;
  }

  async createDeck(userId: string, name: string, format: string = 'unlimited') {
    return this.prisma.deck.create({
      data: {
        name,
        format,
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

  async updateDeck(
    userId: string,
    deckId: string,
    data: { name?: string; format?: string },
  ) {
    const deck = await this.getDeckById(userId, deckId);

    // If changing to standard format, validate all existing cards
    if (data.format === 'standard' && deck.format !== 'standard') {
      const illegalCards = deck.cards.filter((dc) => {
        return !this.isCardLegalInFormat(
          { setName: dc.card.setName, id: dc.card.id },
          'standard',
        );
      });

      if (illegalCards.length > 0) {
        const cardNames = illegalCards.map((dc) => dc.card.name).join(', ');
        throw new BadRequestException(
          `Cannot change to Standard format. These cards are not Standard-legal: ${cardNames}`,
        );
      }
    }

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.format && { format: data.format }),
      },
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

    // Check if card is legal in deck's format using our rotation config
    if (
      !this.isCardLegalInFormat(
        { setName: card.setName, id: card.id },
        deck.format,
      )
    ) {
      throw new BadRequestException(
        `${card.name} is not legal in ${deck.format} format. Set "${card.setName}" is not in the current rotation.`,
      );
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

  parseDeckList(deckList: string): ParsedEntry[] {
    const headerPattern = /^(Pok[eé]mon|Trainer|Energy):\s*\d+/i;
    const basicEnergyPattern = /^(\d+)\s+Basic\s+(\w+)\s+Energy\s*$/i;
    const cardPattern = /^(\d+)\s+(.+?)\s+([A-Z0-9]+)\s+(\d+)\s*$/;

    const entries: ParsedEntry[] = [];

    for (const raw of deckList.split('\n')) {
      const line = raw.trim();
      if (!line || headerPattern.test(line)) continue;

      const basicMatch = line.match(basicEnergyPattern);
      if (basicMatch) {
        entries.push({
          quantity: parseInt(basicMatch[1], 10),
          cardName: `Basic ${basicMatch[2]} Energy`,
        });
        continue;
      }

      const cardMatch = line.match(cardPattern);
      if (cardMatch) {
        entries.push({
          quantity: parseInt(cardMatch[1], 10),
          cardName: cardMatch[2].trim(),
          setCode: cardMatch[3],
          setNumber: cardMatch[4],
        });
      }
    }

    return entries;
  }

  async importDeck(
    userId: string,
    name: string,
    format: string,
    deckList: string,
  ) {
    const entries = this.parseDeckList(deckList);

    const deck = await this.prisma.deck.create({
      data: { name, format, userId },
    });

    const notFound: string[] = [];
    const warnings: string[] = [];

    for (const entry of entries) {
      const card = await this.resolveCard(entry);

      if (!card) {
        const label = entry.setCode
          ? `${entry.cardName} (${entry.setCode} ${entry.setNumber})`
          : entry.cardName;
        notFound.push(`${entry.quantity}x ${label}`);
        continue;
      }

      if (format === 'standard' && !this.isCardLegalInFormat({ setName: card.setName, id: card.id }, 'standard')) {
        warnings.push(`${card.name} is not Standard-legal and was imported as-is`);
      }

      await this.prisma.deckCard.upsert({
        where: { deckId_cardId: { deckId: deck.id, cardId: card.id } },
        update: { quantity: entry.quantity },
        create: { deckId: deck.id, cardId: card.id, quantity: entry.quantity },
      });
    }

    const finalDeck = await this.prisma.deck.findUnique({
      where: { id: deck.id },
      include: { cards: { include: { card: true } } },
    });

    const totalCards = finalDeck!.cards.reduce((sum, dc) => sum + dc.quantity, 0);
    if (totalCards > 60) {
      warnings.push(`Deck has ${totalCards} cards (exceeds the 60-card limit)`);
    }

    finalDeck!.cards.forEach((dc) => {
      if (!this.isBasicEnergy(dc.card) && dc.quantity > 4) {
        warnings.push(`${dc.card.name} has ${dc.quantity} copies (exceeds the 4-copy rule)`);
      }
    });

    return { deck: finalDeck, notFound, warnings };
  }

  private async resolveCard(entry: ParsedEntry) {
    // Exact lookup: setCode → setId → card ID "{setId}-{setNumber}"
    if (entry.setCode && entry.setNumber) {
      const setId = SET_CODE_MAP[entry.setCode.toUpperCase()];
      if (setId) {
        const card = await this.prisma.card.findUnique({
          where: { id: `${setId}-${entry.setNumber}` },
        });
        if (card) return card;
      }

      // Fallback: match by name + collector number suffix
      const byNumber = await this.prisma.card.findFirst({
        where: {
          name: { equals: entry.cardName, mode: 'insensitive' },
          id: { endsWith: `-${entry.setNumber}` },
        },
      });
      if (byNumber) return byNumber;
    }

    // Basic energy or last resort: name-only match
    return this.prisma.card.findFirst({
      where: { name: { equals: entry.cardName, mode: 'insensitive' } },
    });
  }

  async validateDeck(userId: string, deckId: string) {
    const deck = await this.getDeckById(userId, deckId);

    const errors: string[] = [];
    const warnings: string[] = [];
    const totalCards = deck.cards.reduce((sum, dc) => sum + dc.quantity, 0);

    if (totalCards !== 60) {
      errors.push(`Deck has ${totalCards} cards (must be exactly 60)`);
    }

    // Check for at least one Basic Pokemon
    const hasBasicPokemon = deck.cards.some(
      (dc) =>
        dc.card.supertype === 'Pokémon' && dc.card.subtypes.includes('Basic'),
    );
    if (!hasBasicPokemon && totalCards > 0) {
      errors.push('Deck must have at least 1 Basic Pokémon');
    }

    for (const deckCard of deck.cards) {
      // Check 4-copy rule
      if (!this.isBasicEnergy(deckCard.card) && deckCard.quantity > 4) {
        errors.push(
          `${deckCard.card.name} has ${deckCard.quantity} copies (max 4 for non-basic Energy)`,
        );
      }

      // Check format legality using our rotation config
      if (
        !this.isCardLegalInFormat(
          { setName: deckCard.card.setName, id: deckCard.card.id },
          deck.format,
        )
      ) {
        errors.push(
          `${deckCard.card.name} (${deckCard.card.setName}) is not legal in ${deck.format} format`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      format: deck.format,
      totalCards,
      errors,
      warnings,
    };
  }
}
