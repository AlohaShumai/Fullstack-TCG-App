import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Entry point — bootstraps the NestJS server
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from the frontend (env var in production, localhost in dev)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost',
    credentials: true,
  });

  // Automatically validate every incoming request body against its DTO class.
  // whitelist: strips unknown fields. forbidNonWhitelisted: rejects them instead.
  // transform: auto-converts types (e.g. string "1" → number 1).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
