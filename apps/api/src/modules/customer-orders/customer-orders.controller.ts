import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomerOrdersService } from './customer-orders.service';
import { CustomerJwtGuard } from '../../common/guards/customer-jwt.guard';
import { Post } from '@nestjs/common';
import { Res } from '@nestjs/common';

@ApiTags('CustomerOrders')
@UseGuards(CustomerJwtGuard)
@Controller('v1/customer/orders')
export class CustomerOrdersController {
  constructor(private readonly service: CustomerOrdersService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
  ) {
    return this.service.list(
      req.user.customerId,
      Math.max(Number(page), 1),
      Math.max(Number(limit), 1),
      status,
    );
  }
  
  

  @Get(':orderId')
  getOrder(@Req() req: any, @Param('orderId') orderId: string) {
    return this.service.getOrder(req.user.customerId, orderId);
  }

  @Get(':orderId/invoice')
async getInvoice(@Req() req: any, @Param('orderId') orderId: string, @Res() res: any) {
  return this.service.getInvoice(req.user.customerId, orderId, res);
}

  
  @Post(':orderId/cancel')
cancelOrder(@Req() req: any, @Param('orderId') orderId: string) {
  
  return this.service.cancelOrder(req.user.customerId, orderId);
}


}