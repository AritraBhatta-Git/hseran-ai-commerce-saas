import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';
import { SellerOrdersService } from './seller-orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddNoteDto } from './dto/add-note.dto';

@ApiTags('SellerOrders')
@ApiBearerAuth('access-token')
@UseGuards(SellerJwtGuard)
@Controller('v1/seller/orders')
export class SellerOrdersController {
  constructor(private service: SellerOrdersService) {}

  @Get(':storeId')
  list(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(
      req.user.sellerId,
      storeId,
      Number(page),
      Number(limit),
      status,
      search,
    );
  }

  @Get('timeline/:orderId')
  timeline(@Req() req: any, @Param('orderId') orderId: string) {
    return this.service.getTimeline(req.user.sellerId, orderId);
  }

  @Post('update/:orderId')
  update(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(
      req.user.sellerId,
      orderId,
      dto.status,
    );
  }

  @Post('cancel/:orderId')
  cancel(@Req() req: any, @Param('orderId') orderId: string) {
    return this.service.cancelOrder(
      req.user.sellerId,
      orderId,
    );
  }

  @Post('note/:orderId')
  addNote(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.service.addNote(
      req.user.sellerId,
      orderId,
      dto.note,
    );
  }
}