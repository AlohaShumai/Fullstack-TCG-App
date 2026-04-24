import { Module } from '@nestjs/common';
import { DecksService } from './decks.service';
import { DecksController } from './decks.controller';

// Decks module — deck creation, editing, card management, deck-list import, and format validation.
// DecksService enforces the 60-card limit, 4-copy rule, and Standard format legality using rotation.config.ts.
@Module({
  controllers: [DecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}
