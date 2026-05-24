import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('HSERAN API')
  .setDescription('HSERAN Multi-Tenant SaaS E-commerce Platform')
  .setVersion('v1')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
      name: 'Authorization',
    },
    'access-token',
  )
  .build();
