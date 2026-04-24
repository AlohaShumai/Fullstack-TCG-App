import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import type { AuthRequest } from '../common/types';

// Dashboard controller — feeds the main landing page with per-user stats, TCG news, and events.
// All three endpoints require login; stats are user-specific while news/events are shared.
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Returns card count, deck count, collection count, most valuable card, and recent activity
  @Get('stats')
  getStats(@Request() req: AuthRequest) {
    return this.dashboardService.getStats(req.user.id);
  }

  // Returns the latest Pokémon TCG news headlines scraped/cached from external sources
  @Get('news')
  getNews() {
    return this.dashboardService.getNews();
  }

  // Returns upcoming TCG events (regional championships, game days, etc.)
  @Get('events')
  getEvents() {
    return this.dashboardService.getEvents();
  }
}
