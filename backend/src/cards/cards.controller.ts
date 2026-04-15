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

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

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

  @Get('rotation')
  getRotationInfo() {
    return this.cardsService.getRotationInfo();
  }

  @Get('available-sets')
  async getAvailableSets() {
    return this.cardsService.fetchAvailableSets();
  }

  // Dynamic :id route MUST be last
  @Get(':id')
  async getCard(@Param('id') id: string) {
    return this.cardsService.getCardById(id);
  }

  @Post('sync/standard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncStandardCards(@Query('pages') pages?: string) {
    const pageCount = pages ? parseInt(pages, 10) : 5;
    return this.cardsService.syncStandardCards(pageCount);
  }

  @Post('sync/set')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncSet(@Query('name') setName: string) {
    if (!setName) {
      throw new BadRequestException('Set name is required');
    }
    return this.cardsService.syncSet(setName);
  }

  @Post('sync/set-id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async syncSetById(@Query('id') setId: string) {
    if (!setId) {
      throw new BadRequestException('Set ID is required');
    }
    return this.cardsService.syncSetById(setId);
  }
}
