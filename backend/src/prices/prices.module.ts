import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';

// Prices module — fetches market prices from pokemontcg.io and stores them as PriceSnapshot rows.
// PricesService is exported so it can be injected by other modules for on-demand syncs.
// The nightly scheduled sync (@Cron) also lives in PricesService — ScheduleModule in AppModule activates it.
@Module({
  imports: [HttpModule.register({ timeout: 30000, maxRedirects: 3 })],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
