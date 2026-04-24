import { Injectable } from '@nestjs/common';

// Minimal root service used by AppController for the health-check endpoint.
// Not used anywhere else in the app — all real business logic lives in feature modules.
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
