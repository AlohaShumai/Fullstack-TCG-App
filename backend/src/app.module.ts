import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CardsModule } from './cards/cards.module';
import { CollectionsModule } from './collections/collections.module';
import { DecksModule } from './decks/decks.module';
import { RagModule } from './rag/rag.module';
import { AiModule } from './ai/ai.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PricesModule } from './prices/prices.module';

// Root module — wires every feature module together.
// NestJS reads this to know which controllers, services, and providers exist.
@Module({
  imports: [
    // Makes .env variables available everywhere via ConfigService (no need to re-import)
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate-limiting: 'auth' bucket = 5 req/min, 'ai' bucket = 15 req/min
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60000, limit: 5 },
      { name: 'ai', ttl: 60000, limit: 15 },
    ]),
    // Enables @Cron() decorators (used for nightly card + price syncs)
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CardsModule,
    CollectionsModule,
    DecksModule,
    RagModule,
    AiModule,
    DashboardModule,
    PricesModule,
  ],
})
export class AppModule {}
