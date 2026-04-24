import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

// Cards controller — public read endpoints for browsing cards, plus admin sync endpoints.
// No JwtAuthGuard on most routes so the Cards page loads without requiring login.
// Exception: price-history requires login (price data is heavier and less public).
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // GET /cards?page=1&limit=20&search=charizard&type=Fire&set=SV1&supertype=Pokémon&format=standard
  @Get()
  async getCards(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('set') set?: string,
    @Query('supertype') supertype?: string,
    @Query('format') format?: string,
  ) {
    return this.cardsService.getCards({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      type,
      set,
      supertype,
      format,
    });
  }

  // Static routes MUST come before dynamic :id route
  @Get('sets')
  async getSets() {
    return this.cardsService.getAllSetsWithLegality();
  }

  // Returns current rotation season, rotation dates, and list of Standard-legal sets
  @Get('rotation')
  getRotationInfo() {
    return this.cardsService.getRotationInfo();
  }

  // Returns all sets available in TCGdex (used to pre-populate set selectors in admin sync tools)
  @Get('available-sets')
  async getAvailableSets() {
    return this.cardsService.fetchAvailableSets();
  }

  @Get(':id/price-history')
  @UseGuards(JwtAuthGuard)
  async getCardPriceHistory(@Param('id') id: string) {
    return this.cardsService.getCardPriceHistory(id);
  }

  // Dynamic :id route MUST be last
  @Get(':id')
  async getCard(@Param('id') id: string) {
    return this.cardsService.getCardById(id);
  }

  // Admin: sync the most recent Standard-legal cards (fast, targets only current rotation sets)
  @Post('sync/standard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncStandardCards(@Query('pages') pages?: string) {
    const pageCount = pages ? parseInt(pages, 10) : 5;
    return this.cardsService.syncStandardCards(pageCount);
  }

  // Admin: sync all cards from a set by display name (e.g., "Scarlet & Violet")
  @Post('sync/set')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncSet(@Query('name') setName: string) {
    if (!setName) {
      throw new BadRequestException('Set name is required');
    }
    return this.cardsService.syncSet(setName);
  }

  // Admin: sync all cards from a set by TCGdex set ID (e.g., "sv1") — more precise than name
  @Post('sync/set-id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncSetById(@Query('id') setId: string) {
    if (!setId) {
      throw new BadRequestException('Set ID is required');
    }
    return this.cardsService.syncSetById(setId);
  }
}
