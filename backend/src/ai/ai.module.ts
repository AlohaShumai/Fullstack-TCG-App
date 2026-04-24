import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

// AI module — wraps OpenAI GPT-4o chat, card embedding (pgvector), and Tavily web search.
// AiService is exported so RagModule can reuse it without duplicating the OpenAI client setup.
// ConfigModule gives AiService access to OPENAI_API_KEY and TAVILY_API_KEY at runtime.
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
