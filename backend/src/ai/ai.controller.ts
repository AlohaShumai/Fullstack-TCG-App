import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AiService } from './ai.service';
import type { ChatMessage } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthRequest } from '../common/types';

@Controller('ai')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  // General chat endpoint
  @Post('chat')
  @Throttle({ ai: { limit: 15, ttl: 60000 } })
  async chat(
    @Request() req: AuthRequest,
    @Body() body: { message: string; history?: ChatMessage[] },
  ) {
    return this.aiService.chat(req.user.id, body.message, body.history || []);
  }

  // Build a deck from an archetype
  @Post('build-deck')
  @Throttle({ ai: { limit: 15, ttl: 60000 } })
  async buildDeck(
    @Request() req: AuthRequest,
    @Body() body: { archetype: string; format?: string },
  ) {
    return this.aiService.buildDeck(
      req.user.id,
      body.archetype,
      body.format || 'standard',
    );
  }

  // Analyze user's collection
  @Get('analyze-collection')
  @Throttle({ ai: { limit: 20, ttl: 60000 } })
  async analyzeCollection(@Request() req: AuthRequest) {
    return this.aiService.analyzeCollection(req.user.id);
  }

  // Get suggestions to improve a deck
  @Post('improve-deck/:deckId')
  @Throttle({ ai: { limit: 15, ttl: 60000 } })
  async improveDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.aiService.improveDeck(req.user.id, deckId);
  }

  // Get meta information
  @Get('meta')
  @Throttle({ ai: { limit: 20, ttl: 60000 } })
  async getMeta(@Query('format') format?: string) {
    return this.aiService.getMetaInfo(format || 'standard');
  }

  // Embed all cards (admin only)
  @Post('embed-cards')
  @Throttle({ ai: { limit: 3, ttl: 60000 } })
  @UseGuards(AdminGuard)
  async embedCards() {
    return this.aiService.embedAllCards();
  }

  // Search cards by query (semantic search)
  @Get('search-cards')
  @Throttle({ ai: { limit: 20, ttl: 60000 } })
  async searchCards(
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
  ) {
    return this.aiService.searchCardsByQuery(
      query,
      limit ? parseInt(limit) : 20,
      format,
    );
  }
}
