import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { AuthRequest } from '../common/types';

// The refresh endpoint adds refreshToken to the user object via JwtRefreshGuard
interface RefreshRequest {
  user: AuthRequest['user'] & { refreshToken?: string };
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.username);
  }

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: RefreshRequest) {
    return this.authService.refresh(req.user.id, req.user.refreshToken!);
  }

  @Post('logout')
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: AuthRequest) {
    await this.authService.logout(req.user.id);
    return { message: 'Logged out successfully' };
  }
}
