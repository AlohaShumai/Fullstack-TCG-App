import { Controller, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('prices')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post('sync')
  @HttpCode(202)
  async syncAll() {
    return this.pricesService.syncAllPrices();
  }

  @Post('sync/:cardId')
  @HttpCode(202)
  async syncOne(@Param('cardId') cardId: string) {
    await this.pricesService.syncCardPrice(cardId);
    return { ok: true };
  }
}
