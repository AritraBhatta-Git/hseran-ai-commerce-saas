import { Injectable } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class PaymentsService {
  constructor(private razorpay: RazorpayService) {}

  async createPaymentOrder(amount: number) {
    const order = await this.razorpay.createOrder(amount);

    return {
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  }
}