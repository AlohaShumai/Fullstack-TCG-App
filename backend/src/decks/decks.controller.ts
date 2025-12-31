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
} from './dto/deck.dto';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DecksController {
  constructor(private decksService: DecksService) {}

  @Post()
  async createDeck(@Request() req: AuthRequest, @Body() dto: CreateDeckDto) {
    return this.decksService.createDeck(req.user.id, dto.name);
  }

  @Get()
  async getUserDecks(@Request() req: AuthRequest) {
    return this.decksService.getUserDecks(req.user.id);
  }

  @Get(':deckId')
  async getDeckById(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.decksService.getDeckById(req.user.id, deckId);
  }

  @Get(':deckId/validate')
  async validateDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.decksService.validateDeck(req.user.id, deckId);
  }

  @Patch(':deckId')
  async updateDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
    @Body() dto: UpdateDeckDto,
  ) {
    return this.decksService.updateDeck(req.user.id, deckId, dto.name);
  }

  @Delete(':deckId')
  async deleteDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.decksService.deleteDeck(req.user.id, deckId);
  }

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

  @Delete(':deckId/cards/:cardId')
  async removeCardFromDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.decksService.removeCardFromDeck(req.user.id, deckId, cardId);
  }
}
