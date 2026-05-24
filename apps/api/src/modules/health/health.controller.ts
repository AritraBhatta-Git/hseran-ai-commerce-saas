import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      app: 'HSERAN API',
      time: new Date().toISOString(),
    };
  }
}
