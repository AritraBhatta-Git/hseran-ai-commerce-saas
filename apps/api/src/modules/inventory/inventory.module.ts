import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryAlertService } from './alerts/inventory-alert.service';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
   imports: [NotificationModule],
  controllers: [InventoryController],
  providers: [InventoryService , InventoryAlertService],
})
export class InventoryModule {}