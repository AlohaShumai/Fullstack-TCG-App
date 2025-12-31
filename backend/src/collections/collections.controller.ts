import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddToCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  @Get()
  async getCollection(@Request() req: AuthRequest) {
    return this.collectionsService.getCollection(req.user.id);
  }

  @Get('stats')
  async getStats(@Request() req: AuthRequest) {
    return this.collectionsService.getCollectionStats(req.user.id);
  }

  @Post()
  async addToCollection(
    @Request() req: AuthRequest,
    @Body() dto: AddToCollectionDto,
  ) {
    return this.collectionsService.addToCollection(
      req.user.id,
      dto.cardId,
      dto.quantity,
    );
  }

  @Patch(':cardId')
  async updateQuantity(
    @Request() req: AuthRequest,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.updateQuantity(
      req.user.id,
      cardId,
      dto.quantity,
    );
  }

  @Delete(':cardId')
  async removeFromCollection(
    @Request() req: AuthRequest,
    @Param('cardId') cardId: string,
  ) {
    return this.collectionsService.removeFromCollection(req.user.id, cardId);
  }
}
