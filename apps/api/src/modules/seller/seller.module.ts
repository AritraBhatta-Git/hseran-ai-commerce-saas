import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { EmailService } from '../../notifications/email/email.service';
import { NotificationsCenterModule } from '../notifications-center/notifications-center.module.ts';

@Module({
  imports: [NotificationsCenterModule],
  controllers: [SellerController],
  providers: [SellerService, PrismaService, NotificationService, EmailService, ],
})
export class SellerModule {}