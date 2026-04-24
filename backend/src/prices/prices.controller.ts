import { Controller, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

// Admin-only controller for manually triggering price syncs.
// Normal users never call these — prices are updated nightly via the @Cron in PricesService.
// Both endpoints return HTTP 202 Accepted because syncs can take a while and run async.
@Controller('prices')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  // Sync prices for every card in the database (can take several minutes)
  @Post('sync')
  @HttpCode(202)
  async syncAll() {
    return this.pricesService.syncAllPrices();
  }

  // Sync price for a single card by its TCGdex ID (e.g., "sv1-001") — useful for spot-checks
  @Post('sync/:cardId')
  @HttpCode(202)
  async syncOne(@Param('cardId') cardId: string) {
    await this.pricesService.syncCardPrice(cardId);
    return { ok: true };
  }
}
