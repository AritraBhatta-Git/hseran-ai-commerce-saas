import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Patch,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Product')
@ApiBearerAuth('access-token')
@Controller('v1/product')
@UseGuards(SellerJwtGuard)
export class ProductController {
  constructor(private productService: ProductService) {}

  // ======================================================
  // PRODUCT CRUD
  // ======================================================

  @Post(':storeId')
  create(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.createProduct(
      req.user.sellerId,
      storeId,
      dto,
    );
  }

  @Get(':storeId')
  getAll(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.getProducts(
      req.user.sellerId,
      storeId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get(':storeId/:productId')
  getOne(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.getProduct(
      req.user.sellerId,
      storeId,
      productId,
    );
  }

  @Patch(':storeId/:productId')
  update(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(
      req.user.sellerId,
      storeId,
      productId,
      dto,
    );
  }

  @Post(':storeId/:productId/toggle-status')
  toggleStatus(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.toggleProductStatus(
      req.user.sellerId,
      storeId,
      productId,
    );
  }

  @Delete(':storeId/:productId')
  delete(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.deleteProduct(
      req.user.sellerId,
      storeId,
      productId,
    );
  }

  // ======================================================
  // PRODUCT VARIANTS
  // ======================================================

  @Get(':storeId/:productId/variants')
  getVariants(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.getVariants(
      req.user.sellerId,
      storeId,
      productId,
    );
  }

  @Post(':storeId/:productId/variants')
  addVariant(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productService.addVariant(
      req.user.sellerId,
      storeId,
      productId,
      dto,
    );
  }

  @Patch(':storeId/:productId/variants/:variantId')
  updateVariant(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productService.updateVariant(
      req.user.sellerId,
      storeId,
      productId,
      variantId,
      dto,
    );
  }

  @Post(':storeId/:productId/variants/:variantId/toggle')
  toggleVariant(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productService.toggleVariantStatus(
      req.user.sellerId,
      storeId,
      productId,
      variantId,
    );
  }

  @Delete(':storeId/:productId/variants/:variantId')
  deleteVariant(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productService.deleteVariant(
      req.user.sellerId,
      storeId,
      productId,
      variantId,
    );
  }

  // ======================================================
  // CATEGORY ASSIGNMENT
  // ======================================================

  @Post(':storeId/:productId/category/:categoryId')
  assignCategory(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.productService.assignCategory(
      req.user.sellerId,
      storeId,
      productId,
      categoryId,
    );
  }

  @Delete(':storeId/:productId/category/:categoryId')
  removeCategory(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.productService.removeCategory(
      req.user.sellerId,
      storeId,
      productId,
      categoryId,
    );
  }

  // ======================================================
  // IMAGE UPLOAD
  // ======================================================

  @Post('upload-image/:productId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (_, file, cb) => {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  uploadImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.uploadImage(productId, file.filename);
  }

  @Get('images/:productId')
  getImages(@Param('productId') productId: string) {
    return this.productService.getImages(productId);
  }

  @Post('image/delete/:imageId')
  deleteImage(@Param('imageId') imageId: string) {
    return this.productService.deleteImage(imageId);
  }

  @Post('image/reorder/:productId')
  reorderImages(
    @Param('productId') productId: string,
    @Body() body: { imageIds: string[] },
  ) {
    return this.productService.reorderImages(
      productId,
      body.imageIds,
    );
  }
}