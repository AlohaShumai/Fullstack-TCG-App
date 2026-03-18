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
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  // General chat endpoint
  @Post('chat')
  async chat(
    @Request() req: AuthRequest,
    @Body() body: { message: string; history?: ChatMessage[] },
  ) {
    return this.aiService.chat(req.user.id, body.message, body.history || []);
  }

  // Build a deck from an archetype
  @Post('build-deck')
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
  async analyzeCollection(@Request() req: AuthRequest) {
    return this.aiService.analyzeCollection(req.user.id);
  }

  // Get suggestions to improve a deck
  @Post('improve-deck/:deckId')
  async improveDeck(
    @Request() req: AuthRequest,
    @Param('deckId') deckId: string,
  ) {
    return this.aiService.improveDeck(req.user.id, deckId);
  }

  // Get meta information
  @Get('meta')
  async getMeta(@Query('format') format?: string) {
    return this.aiService.getMetaInfo(format || 'standard');
  }

  // Embed all cards (admin only - can add role check later)
  @Post('embed-cards')
  async embedCards() {
    return this.aiService.embedAllCards();
  }

  // Search cards by query (semantic search)
  @Get('search-cards')
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
