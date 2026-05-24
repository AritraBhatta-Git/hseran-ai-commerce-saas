import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CustomerJwtGuard } from '../../common/guards/customer-jwt.guard';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';

@ApiTags('Checkout')
@UseGuards(CustomerJwtGuard)
@Controller('v1/checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService, private readonly prisma: PrismaService, private readonly notificationService: NotificationService) {}

  @Post()
  checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.service.checkout(req.user.customerId, dto);
  }
  
}