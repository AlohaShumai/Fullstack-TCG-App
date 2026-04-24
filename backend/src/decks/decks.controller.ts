import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DecksService } from './decks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateDeckDto,
  UpdateDeckDto,
  AddCardToDeckDto,
  UpdateDeckCardDto,
  ImportDeckDto,
} from './dto/deck.dto';
import type { AuthRequest } from '../common/types';

// All deck routes require login — decks are private per user.
// Routes with :deckId always verify ownership inside DecksService.getDeckById().
@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DecksController {
  constructor(private decksService: DecksService) {}

  // POST /decks/import — parse a PTCGL-format deck list and create the deck in one step
  // Must come BEFORE the generic POST /decks to avoid route ambiguity
  @Post('import')
  async importDeck(@Request() req: AuthRequest, @Body() dto: ImportDeckDto) {
    return this.decksService.importDeck(
      req.user.id,
      dto.name,
      dto.format,
      dto.deckList,
    );
  }

  // POST /decks — create a new blank deck
  @Post()
  async createDeck(@Request() req: AuthRequest, @Body() dto: CreateDeckDto) {
    return this.decksService.createDeck(
      req.user.id,
      dto.name,
      dto.format || 'unlimited',
    );
  }

  // GET /decks — list all decks for the logged-in user, sorted by creation date
  @Get()
  async getUserDecks(@Request() req: AuthRequest) {
    return this.decksService.getUserDecks(req.user.id);
  }

  // GET /decks/:id — fetch a single deck with all its cards
  @Get(':deckId')
  async getDeckById(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.decksService.getDeckById(req.user.id, deckId);
  }

  // GET /decks/:id/validate — check 60-card limit, 4-copy rule, and format legality
  @Get(':deckId/validate')
  async validateDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.decksService.validateDeck(req.user.id, deckId);
  }

  // PATCH /decks/:id — rename or change format (format change validates existing cards)
  @Patch(':deckId')
  async updateDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
    @Body() dto: UpdateDeckDto,
  ) {
    return this.decksService.updateDeck(req.user.id, deckId, {
      name: dto.name,
      format: dto.format,
    });
  }

  // DELETE /decks/:id — permanently delete the deck and its cards
  @Delete(':deckId')
  async deleteDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.decksService.deleteDeck(req.user.id, deckId);
  }

  // POST /decks/:id/cards — add copies of a card (enforces 60-card and 4-copy rules)
  @Post(':deckId/cards')
  async addCardToDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
    @Body() dto: AddCardToDeckDto,
  ) {
    return this.decksService.addCardToDeck(
      req.user.id,
      deckId,
      dto.cardId,
      dto.quantity,
    );
  }

  // PATCH /decks/:id/cards/:cardId — set an exact copy count; quantity=0 removes the card
  @Patch(':deckId/cards/:cardId')
  async updateDeckCard(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateDeckCardDto,
  ) {
    return this.decksService.updateDeckCard(
      req.user.id,
      deckId,
      cardId,
      dto.quantity,
    );
  }

  // DELETE /decks/:id/cards/:cardId — remove a card from the deck entirely
  @Delete(':deckId/cards/:cardId')
  async removeCardFromDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.decksService.removeCardFromDeck(req.user.id, deckId, cardId);
  }
}
