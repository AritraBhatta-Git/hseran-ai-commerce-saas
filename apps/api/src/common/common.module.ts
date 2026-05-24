import { Module } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';

@Module({
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class CommonModule {}