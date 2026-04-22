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
import type { AuthRequest } from '../common/types';
import { CreateCollectionDto, PatchCollectionDto, AddToCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

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

  // Get portfolio value and 30-day history for a specific collection
  @Get(':collectionId/portfolio')
  async getCollectionPortfolio(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
  ) {
    return this.collectionsService.getCollectionPortfolio(collectionId, req.user.id);
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
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionsService.createCollection(req.user.id, dto);
  }

  // Update a collection's details
  @Patch(':collectionId')
  async updateCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Body() dto: PatchCollectionDto,
  ) {
    return this.collectionsService.updateCollection(
      req.user.id,
      collectionId,
      dto,
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
    @Body() dto: AddToCollectionDto,
  ): Promise<unknown> {
    return this.collectionsService.addToCollection(
      req.user.id,
      collectionId,
      dto.cardId,
      dto.quantity ?? 1,
    );
  }

  // Update a card's quantity in a collection
  @Patch(':collectionId/cards/:cardId')
  async updateCardQuantity(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<unknown> {
    return this.collectionsService.updateCardQuantity(
      req.user.id,
      collectionId,
      cardId,
      dto.quantity,
    );
  }

  // Remove a card from a collection
  @Delete(':collectionId/cards/:cardId')
  async removeFromCollection(
    @Request() req: AuthRequest,
    @Param('collectionId') collectionId: string,
    @Param('cardId') cardId: string,
  ): Promise<unknown> {
    return this.collectionsService.removeFromCollection(
      req.user.id,
      collectionId,
      cardId,
    );
  }
}
