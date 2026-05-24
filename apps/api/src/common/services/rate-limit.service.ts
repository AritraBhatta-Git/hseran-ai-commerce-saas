import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../providers/redis/redis.service';

@Injectable()
export class RateLimitService {
  constructor(private redis: RedisService) {}

  async checkOtpLimit(key: string, limit: number, ttl: number) {
    const count = await this.redis.client.incr(key);

    if (count === 1) {
      await this.redis.client.expire(key, ttl);
    }

    if (count > limit) {
      throw new BadRequestException('Too many OTP requests');
    }
  }
}