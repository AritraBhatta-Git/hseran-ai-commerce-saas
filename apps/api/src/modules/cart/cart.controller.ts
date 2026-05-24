import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { CustomerJwtGuard } from '../../common/guards/customer-jwt.guard';

@ApiTags('Cart')
@UseGuards(CustomerJwtGuard)
@Controller('v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(req.user.customerId, dto);
  }

  @Get(':storeId')
  async getCart(@Req() req: any, @Param('storeId') storeId: string) {
    return this.cartService.getCart(req.user.customerId, storeId);
  }

  @Delete('remove/:itemId')
  async removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(req.user.customerId, itemId);
  }

  @Patch('update/:itemId')
  async updateQuantity(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateQuantity(
      req.user.customerId,
      itemId,
      dto.quantity,
    );
  }

  // ✅ NEW (non-breaking)
  @Delete('clear/:storeId')
  async clearCart(@Req() req: any, @Param('storeId') storeId: string) {
    return this.cartService.clearCart(req.user.customerId, storeId);
  }
  
}