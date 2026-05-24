import { Injectable } from '@nestjs/common';
import { EmailService } from './email/email.service';

import { orderConfirmationTemplate } from './templates/order-confirmation.template';
import { orderStatusTemplate } from './templates/order-status.template';
import { sellerNewOrderTemplate } from './templates/seller-new-order.template';

@Injectable()
export class NotificationService {
  constructor(private emailService: EmailService) {}

  // =========================
  // SAFE WRAPPER (NEW)
  // =========================
  private async safeSend(to: string, subject: string, html: string) {
    try {
      await this.emailService.sendMail(to, subject, html);
    } catch (e) {
      console.log('❌ Notification failed (non-blocking):', e?.message);
    }
  }

  // ======================================================
  // CUSTOMER: ORDER CONFIRMATION
  // ======================================================

  async sendOrderConfirmation(order: any) {
    const email = order.customer?.email;
    if (!email) return;

    const html = orderConfirmationTemplate(order);

    await this.safeSend(email, 'Order Confirmation', html);
  }

  // ======================================================
  // CUSTOMER: STATUS UPDATE
  // ======================================================

  async sendOrderStatusUpdate(order: any, status: string) {
    const email = order.customer?.email;
    if (!email) return;

    const html = orderStatusTemplate(order, status);

    await this.safeSend(email, `Order ${status}`, html);
  }

  // ======================================================
  // SELLER: NEW ORDER ALERT
  // ======================================================

  async notifySellerNewOrder(order: any) {
    const sellerEmail = order.store?.seller?.email;
    if (!sellerEmail) return;

    const html = sellerNewOrderTemplate(order);

    await this.safeSend(sellerEmail, 'New Order Received', html);
  }
}

