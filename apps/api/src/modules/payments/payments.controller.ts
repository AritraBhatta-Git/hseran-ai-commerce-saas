import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('/v1/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('/create-order')
  async createOrder(@Body() body: { amount: number }) {
    return this.paymentsService.createPaymentOrder(body.amount);
  }
}