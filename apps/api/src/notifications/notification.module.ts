import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailModule } from './email/email.module';

@Module({
  imports: [EmailModule], // ✅ connects email system
  providers: [NotificationService],
  exports: [NotificationService], // ✅ VERY IMPORTANT
})
export class NotificationModule {}