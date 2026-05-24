import { Module } from '@nestjs/common';
import { SellerOrdersController } from './seller-orders.controller';
import { SellerOrdersService } from './seller-orders.service';
import { PrismaService } from '../../providers/prisma/prisma.service';

@Module({
  controllers: [SellerOrdersController],
  providers: [SellerOrdersService, PrismaService],
})
export class SellerOrdersModule {}