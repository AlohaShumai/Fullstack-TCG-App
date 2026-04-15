import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import type { AuthRequest } from '../common/types';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Request() req: AuthRequest) {
    return this.dashboardService.getStats(req.user.id);
  }

  @Get('news')
  getNews() {
    return this.dashboardService.getNews();
  }

  @Get('events')
  getEvents() {
    return this.dashboardService.getEvents();
  }
}
