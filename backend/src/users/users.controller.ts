import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CollectionsService } from '../collections/collections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUsernameDto, UpdatePasswordDto } from './dto/users.dto';
import type { AuthRequest } from '../common/types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private collectionsService: CollectionsService,
  ) {}

  @Get('me/portfolio')
  async getMyPortfolio(@Request() req: AuthRequest) {
    return this.collectionsService.getUserPortfolio(req.user.id);
  }

  @Get('me')
  async getMe(@Request() req: AuthRequest) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException();
    const { password, refreshToken, ...profile } = user;
    return profile;
  }

  @Patch('me')
  async updateUsername(
    @Request() req: AuthRequest,
    @Body() dto: UpdateUsernameDto,
  ) {
    const user = await this.usersService.updateUsername(
      req.user.id,
      dto.username,
    );
    const { password, refreshToken, ...profile } = user;
    return profile;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(
    @Request() req: AuthRequest,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.usersService.updatePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Request() req: AuthRequest) {
    await this.usersService.deleteUser(req.user.id);
  }
}
