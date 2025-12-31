import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 180000,
      maxRedirects: 5,
    }),
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
