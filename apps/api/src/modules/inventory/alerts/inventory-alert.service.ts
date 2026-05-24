import { Injectable } from '@nestjs/common';
import { NotificationService } from '../../../notifications/notification.service';
import { lowStockTemplate } from '../../../notifications/templates/low-stock.template';

@Injectable()
export class InventoryAlertService {
  constructor(private notificationService: NotificationService) {}

  async triggerLowStock(product: any) {
    try {
      const sellerEmail = product.store?.seller?.email;

      if (!sellerEmail) return;

      const html = lowStockTemplate(product);

      await this.notificationService['emailService'].sendMail(
        sellerEmail,
        '⚠️ Low Stock Alert',
        html,
      );
    } catch (e) {
      console.log('Low stock alert failed', e);
    }
  }
}