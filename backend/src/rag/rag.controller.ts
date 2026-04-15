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

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private aiService: AiService) {}

  @Post('embed')
  async embedAllCards() {
    return this.aiService.embedAllCards();
  }

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

  @Get('search')
  async searchCards(@Request() req: AuthRequest, @Query('q') query: string) {
    if (!query) {
      return { error: 'Query is required' };
    }
    return this.aiService.searchSimilarCards(query, req.user.id);
  }
}
