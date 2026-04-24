import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Wraps PrismaClient as a NestJS injectable service.
// Extending PrismaClient means you can call this.prisma.user.findMany() etc.
// in any service that injects PrismaService.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Opens the DB connection when the app starts
  async onModuleInit() {
    await this.$connect();
  }

  // Closes the DB connection cleanly on shutdown (prevents connection leaks)
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
