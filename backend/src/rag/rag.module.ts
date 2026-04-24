import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { AiModule } from '../ai/ai.module';

// RAG (Retrieval-Augmented Generation) module — exposes endpoints for embedding cards and
// asking questions answered by semantic search over the card database.
// Reuses AiService from AiModule rather than duplicating the OpenAI client setup.
@Module({
  imports: [AiModule],
  controllers: [RagController],
})
export class RagModule {}
