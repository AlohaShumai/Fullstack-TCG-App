import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

// Cards module — read-only card browsing, set listing, price history, and admin sync endpoints.
// HttpModule timeout is 180s because TCGdex card fetches can be slow for large set syncs.
// CardsService is exported so other modules (e.g., CollectionsModule) can reuse card lookups.
@Module({
  imports: [
    HttpModule.register({
      timeout: 180000, // 3 minutes — TCGdex set syncs can be slow for large sets
      maxRedirects: 5,
    }),
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
