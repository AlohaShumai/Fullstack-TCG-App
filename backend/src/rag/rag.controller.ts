import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../common/types';

// RAG controller — developer/debug endpoints for the vector-search pipeline.
// These are secondary to the main /ai/chat and /ai/search-cards endpoints in AiController.
// All routes require login to prevent anonymous abuse of the embedding quota.
@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private aiService: AiService) {}

  // Trigger a full re-embedding of every card in the database (expensive — avoid unless schema changed)
  @Post('embed')
  async embedAllCards() {
    return this.aiService.embedAllCards();
  }

  // Ask a natural-language question answered using semantic card search + GPT context
  // Example: GET /rag/advice?question=What are the best Charizard synergies in standard?
  @Get('advice')
  async getAdvice(
    @Request() req: AuthRequest,
    @Query('question') question: string,
  ) {
    if (!question) {
      return { error: 'Question is required' };
    }
    return this.aiService.getAdvice(req.user.id, question);
  }

  // Find cards semantically similar to a text query using pgvector cosine distance
  // Example: GET /rag/search?q=fire type pokemon with high damage attacks
  @Get('search')
  async searchCards(@Request() req: AuthRequest, @Query('q') query: string) {
    if (!query) {
      return { error: 'Query is required' };
    }
    return this.aiService.searchSimilarCards(query, req.user.id);
  }
}
