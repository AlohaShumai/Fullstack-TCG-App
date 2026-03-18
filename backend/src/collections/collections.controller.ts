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

  // Get all collections for the logged-in user
  @Get()
  async getUserCollections(@Request() req: AuthRequest) {
    return this.collectionsService.getUserCollections(req.user.id);
  }

  // Get a specific collection by ID
  @Get(':collectionId')
  async getCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
  ) {
    return this.collectionsService.getCollection(req.user.id, collectionId);
  }

  // Get stats for a specific collection
  @Get(':collectionId/stats')
  async getCollectionStats(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
  ) {
    return this.collectionsService.getCollectionStats(
      req.user.id,
      collectionId,
    );
  }

  // Create a new collection
  @Post()
  async createCollection(
    @Request() req: AuthRequest,
    @Body() body: { name: string; description?: string; isPublic?: boolean },
  ) {
    return this.collectionsService.createCollection(req.user.id, body);
  }

  // Update a collection's details
  @Patch(':collectionId')
  async updateCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Body() body: { name?: string; description?: string; isPublic?: boolean },
  ) {
    return this.collectionsService.updateCollection(
      req.user.id,
      collectionId,
      body,
    );
  }

  // Delete a collection
  @Delete(':collectionId')
  async deleteCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
  ) {
    return this.collectionsService.deleteCollection(req.user.id, collectionId);
  }

  // Add a card to a collection
  @Post(':collectionId/cards')
  async addToCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Body() body: { cardId: string; quantity?: number },
  ): Promise<unknown> {
    return this.collectionsService.addToCollection(
      req.user.id,
      collectionId,
      body.cardId,
      body.quantity || 1,
    );
  }

  // Update a card's quantity in a collection
  @Patch(':collectionId/cards/:cardId')
  async updateCardQuantity(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Param('cardId') cardId: string,
    @Body() body: { quantity: number },
  ): Promise<unknown> {
    return this.collectionsService.updateCardQuantity(
      req.user.id,
      collectionId,
      cardId,
      body.quantity,
    );
  }
}
