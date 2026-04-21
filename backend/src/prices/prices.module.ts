import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';

@Module({
  imports: [HttpModule.register({ timeout: 30000, maxRedirects: 3 })],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
