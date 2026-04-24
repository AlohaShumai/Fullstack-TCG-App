import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// Root controller — exposes a basic health-check GET / that returns "Hello World!"
// Useful for confirming the server is up without needing auth or a real payload.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
