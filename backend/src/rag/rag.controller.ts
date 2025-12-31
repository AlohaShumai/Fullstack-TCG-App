import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private ragService: RagService) {}

  @Post('embed')
  async embedAllCards() {
    return this.ragService.embedAllCards();
  }

  @Get('advice')
  async getAdvice(
    @Request() req: AuthRequest,
    @Query('question') question: string,
  ) {
    if (!question) {
      return { error: 'Question is required' };
    }
    return this.ragService.getAdvice(req.user.id, question);
  }

  @Get('search')
  async searchCards(@Request() req: AuthRequest, @Query('q') query: string) {
    if (!query) {
      return { error: 'Query is required' };
    }
    return this.ragService.searchSimilarCards(query, req.user.id);
  }
}
