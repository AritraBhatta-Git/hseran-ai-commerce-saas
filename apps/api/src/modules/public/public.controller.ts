import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Public')
@Controller('v1/public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('store/:slug')
  getStore(@Param('slug') slug: string) {
    return this.publicService.getStore(slug);
  }

  // ✅ ONLY ONE METHOD (UPGRADED)
  @Get('store/:slug/products')
  getStoreProducts(
    @Param('slug') slug: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
  ) {
    return this.publicService.getStoreProducts(
      slug,
      Math.max(Number(page), 1),
      Math.max(Number(limit), 1),
      categoryId,
      search,
      minPrice ? Number(minPrice) : undefined,
      maxPrice ? Number(maxPrice) : undefined,
      sort,
    );
  }

  @Get('store/:slug/product/:productId')
  getSingleProduct(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
  ) {
    return this.publicService.getSingleProduct(slug, productId);
  }

  @Post('order/create')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.publicService.createOrder(dto);
  }
}