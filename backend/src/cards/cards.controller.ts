import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cards')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllCards() {
    return this.cardsService.getAllCards();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchCards(@Query('q') query: string) {
    return this.cardsService.searchCards(query || '');
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  async getCardCount() {
    const count = await this.cardsService.getCardCount();
    return { count };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getCardById(@Param('id') id: string) {
    return this.cardsService.getCardById(id);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncCards(@Query('pages') pages?: string) {
    const pageCount = pages ? parseInt(pages, 10) : 1;
    return this.cardsService.syncCards(pageCount);
  }
}
