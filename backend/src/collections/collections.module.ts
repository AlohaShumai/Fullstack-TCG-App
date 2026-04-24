import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';

// Collections module — CRUD for card collections, card quantity management, stats, and portfolio tracking.
// CollectionsService is exported so other modules can query collection data (e.g., DashboardModule).
// No HttpModule needed here — all data is read from the local Postgres DB via PrismaService.
@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
