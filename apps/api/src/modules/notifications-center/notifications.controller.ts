import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';

@ApiTags('Notifications')
@UseGuards(SellerJwtGuard)
@Controller('v1/seller/notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getNotifications(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.service.getSellerNotifications(
      req.user.sellerId,
      Math.max(Number(page), 1),
      Math.max(Number(limit), 1),
    );
  }

  @Patch('read/:id')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markAsRead(id, req.user.sellerId);
  }

  @Get('unread-count')
  getUnread(@Req() req: any) {
    return this.service.getUnreadCount(req.user.sellerId);
  }
}