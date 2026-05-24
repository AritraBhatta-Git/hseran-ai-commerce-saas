import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CustomerJwtGuard } from '../../common/guards/customer-jwt.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Customer')
@UseGuards(CustomerJwtGuard)
@Controller('v1/customer')
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  // ── Profile ───────────────────────────────────────────────────
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.customerService.getProfile(req.user.customerId);
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.customerService.updateProfile(req.user.customerId, dto);
  }

  // ── Order Quick Status (for Dashboard) ───────────────────────
  @Get('active-order')
  getLatestActiveOrder(@Req() req: any) {
    return this.customerService.getLatestActiveOrder(req.user.customerId);
  }

  // ── Order Detail Routes ───────────────────────────────────────
  @Get('orders/:orderId/status')
  getOrderStatus(@Req() req: any, @Param('orderId') orderId: string) {
    return this.customerService.getOrderStatus(
      req.user.customerId,
      orderId,
    );
  }

  @Get('orders/:orderId/timeline')
  getOrderTimeline(@Req() req: any, @Param('orderId') orderId: string) {
    return this.customerService.getOrderTimeline(
      req.user.customerId,
      orderId,
    );
  }
}