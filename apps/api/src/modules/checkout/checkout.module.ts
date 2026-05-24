import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { EmailService } from '../../notifications/email/email.service';
import { NotificationsCenterModule } from '../notifications-center/notifications-center.module.ts';

@Module({
  imports: [NotificationsCenterModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, PrismaService, NotificationService, EmailService], // ✅ added NotificationService and EmailService
})
export class CheckoutModule {}