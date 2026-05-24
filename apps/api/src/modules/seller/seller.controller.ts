import {
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import { extname } from 'path';

import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Param,
  Query,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../../providers/prisma/prisma.service';
import { SellerJwtGuard } from '../../common/guards/seller-jwt.guard';

import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from './dto/create-product.dto';

import { randomSuffix, slugify } from '../../common/utils/slug.util';
import { SellerService } from './seller.service';
import { Res } from '@nestjs/common';

@ApiTags('Seller')
@ApiBearerAuth('access-token')
@Controller('v1/seller')
@UseGuards(SellerJwtGuard)
export class SellerController {
 constructor(
  private db: PrismaService,
  private sellerService: SellerService, // ✅ added
) {}
  // ======================================================
  // SELLER PROFILE
  // ======================================================

  @Get('me')
  async me(@Req() req: any) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: req.user.sellerId },
      include: { stores: true },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    return { seller };
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() dto: UpdateSellerProfileDto) {
    return this.sellerService.updateProfile(req.user.sellerId, dto as any);
  }

  // ======================================================
  // ONBOARDING
  // ======================================================

  @Get('onboarding/status')
  async onboardingStatus(@Req() req: any) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: req.user.sellerId },
      select: {
        isOnboarded: true,
        onboardingStep: true,
      },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    return seller;
  }

  @Post('onboarding/update')
  async updateOnboarding(
    @Req() req: any,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.sellerService.updateOnboardingDraft(req.user.sellerId, dto);
  }

@Post('onboarding/complete')
async completeOnboarding(@Req() req: any) {
  if (!req.user?.sellerId) {
    throw new BadRequestException('Invalid seller');
  }

  return this.sellerService.completeOnboarding(req.user.sellerId);
}
  // ======================================================
  // STORE
  // ======================================================

  @Post('store/create')
  async createStore(@Req() req: any, @Body() dto: CreateStoreDto) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: req.user.sellerId },
      include: { stores: true },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    if (seller.stores.length >= 2) {
      throw new BadRequestException(
        'Trial limit reached. Upgrade to create more stores.',
      );
    }

    const baseSlug = slugify(dto.name);
    const finalSlug = `${baseSlug}-${randomSuffix(4)}`;

    const store = await this.db.prisma.store.create({
      data: {
        sellerId: seller.id,
        name: dto.name,
        slug: finalSlug,
        status: 'TRIAL',
        isPublic: true,
      },
    });

    return {
      message: 'Store created successfully',
      store,
    };
  }

  // ======================================================
  // PRODUCT CREATE
  // ======================================================

  @Post('product/create')
  async createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        id: dto.storeId,
        sellerId: req.user.sellerId,
      },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const uid = `PRD-${Date.now().toString().slice(-6)}`;

    const categoryConnections =
      dto.categoryIds && dto.categoryIds.length > 0
        ? {
            create: dto.categoryIds.map((id) => ({
              category: { connect: { id } },
            })),
          }
        : undefined;

    const product = await this.db.prisma.product.create({
      data: {
        storeId: dto.storeId,
        uid,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        mrp: dto.mrp,
        stockQty: dto.stockQty ?? 0,
        sku: dto.sku,
        isActive: true,
        categories: categoryConnections,
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return {
      message: 'Product created successfully',
      product,
    };
  }

  // ======================================================
  // PRODUCT LIST
  // ======================================================

  @Get('product/list/:storeId')
  async listProducts(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        id: storeId,
        sellerId: req.user.sellerId,
      },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);

    const [products, total] = await Promise.all([
      this.db.prisma.product.findMany({
        where: { storeId },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          categories: {
            include: { category: true },
          },
        },
      }),
      this.db.prisma.product.count({ where: { storeId } }),
    ]);

    return {
      total,
      page: pageNumber,
      limit: pageSize,
      products,
    };
  }

  // ======================================================
  // PRODUCT GET
  // ======================================================

  @Get('product/:productId')
  async getProduct(@Req() req: any, @Param('productId') productId: string) {
    const product = await this.db.prisma.product.findFirst({
      where: {
        id: productId,
        store: { sellerId: req.user.sellerId },
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    return { product };
  }

  // ======================================================
  // PRODUCT DELETE
  // ======================================================

  @Post('product/delete/:productId')
  async deleteProduct(@Req() req: any, @Param('productId') productId: string) {
    const product = await this.db.prisma.product.findFirst({
      where: {
        id: productId,
        store: { sellerId: req.user.sellerId },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    await this.db.prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }

  // ======================================================
  // CATEGORY CREATE
  // ======================================================

  @Post('category/create')
  async createCategory(
    @Req() req: any,
    @Body() body: { storeId: string; name: string },
  ) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        id: body.storeId,
        sellerId: req.user.sellerId,
      },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const slug = slugify(body.name);

    const existing = await this.db.prisma.category.findFirst({
      where: { storeId: body.storeId, slug },
    });

    if (existing)
      throw new BadRequestException('Category already exists');

    const category = await this.db.prisma.category.create({
      data: {
        storeId: body.storeId,
        name: body.name,
        slug,
      },
    });

    return {
      message: 'Category created successfully',
      category,
    };
  }

  // ======================================================
  // CATEGORY LIST
  // ======================================================

  @Get('category/list/:storeId')
  async listCategories(
    @Req() req: any,
    @Param('storeId') storeId: string,
  ) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        id: storeId,
        sellerId: req.user.sellerId,
      },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const categories = await this.db.prisma.category.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    return { categories };
  }

  // ======================================================
  // ORDERS LIST (PAGINATED)
  // ======================================================

  @Get('order/list/:storeId')
  async listOrdersPaginated(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        id: storeId,
        sellerId: req.user.sellerId,
      },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);

    const [orders, total] = await Promise.all([
      this.db.prisma.order.findMany({
        where: { storeId },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          customer: true,
        },
      }),
      this.db.prisma.order.count({ where: { storeId } }),
    ]);

    return {
      total,
      page: pageNumber,
      limit: pageSize,
      orders,
    };
  }

  // ======================================================
  // GET SINGLE ORDER
  // ======================================================

  @Get('order/:orderId')
  async getOrder(@Req() req: any, @Param('orderId') orderId: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        store: {
          sellerId: req.user.sellerId,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    return { order };
  }

  // ======================================================
  // UPDATE ORDER STATUS
  // ======================================================

  @Post('order/update-status/:orderId')
  async updateOrderStatus(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        store: {
          sellerId: req.user.sellerId,
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.db.prisma.order.update({
      where: { id: orderId },
      data: {
        status: body.status as any,
      },
    });

    return {
      message: 'Order status updated',
      order: updated,
    };
  }

  // ======================================================
// SELLER DASHBOARD STATS
// ======================================================

@Get('dashboard/:storeId')
async getDashboard(
  @Req() req: any,
  @Param('storeId') storeId: string,
) {
  const sellerId = req.user.sellerId;

  // Verify store ownership
  const store = await this.db.prisma.store.findFirst({
    where: {
      id: storeId,
      sellerId,
    },
  });

  if (!store) {
    throw new BadRequestException('Invalid store');
  }

  // Run queries in parallel
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    totalProducts,
    lowStockProducts,
    lowStockItems,
    recentOrders,
  ] = await Promise.all([

    // Total orders
    this.db.prisma.order.count({
      where: { storeId },
    }),

    // Pending orders
    this.db.prisma.order.count({
      where: {
        storeId,
        status: 'PENDING',
      },
    }),

    // Completed orders
    this.db.prisma.order.count({
      where: {
        storeId,
        status: 'DELIVERED',
      },
    }),

    // Cancelled orders
    this.db.prisma.order.count({
      where: {
        storeId,
        status: 'CANCELLED',
      },
    }),

    // Revenue
    this.db.prisma.order.aggregate({
      where: {
        storeId,
        status: 'DELIVERED',
      },
      _sum: {
        totalAmount: true,
      },
    }),

    // Total products
    this.db.prisma.product.count({
      where: { storeId },
    }),

    // Low stock products (threshold 5)
    this.db.prisma.product.count({
      where: {
        storeId,
        stockQty: {
          lte: 5,
        },
      },
    }),

    this.db.prisma.product.findMany({
      where: { storeId, stockQty: { lte: 5 } },
      select: {
        id: true,
        uid: true,
        name: true,
        stockQty: true,
        sku: true,
      },
      orderBy: { stockQty: 'asc' },
      take: 10,
    }),

    // Recent orders
    this.db.prisma.order.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      status: store.status,
      isPublic: store.isPublic,
      theme: store.theme,
    },
    stats: {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      totalProducts,
      lowStockProducts,
    },
    lowStockItems,
    recentOrders,
  };
}
// ======================================================
// UPLOAD PRODUCT IMAGE
// ======================================================

@Post('product/upload-image/:productId')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, callback) => {
        const uniqueName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          extname(file.originalname);

        callback(null, uniqueName);
      },
    }),
  }),
)
async uploadProductImage(
  @Req() req: any,
  @Param('productId') productId: string,
  @UploadedFile() file: Express.Multer.File,
) {
  const product = await this.db.prisma.product.findFirst({
    where: {
      id: productId,
      store: {
        sellerId: req.user.sellerId,
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  const image = await this.db.prisma.productImage.create({
    data: {
      productId,
      url: `/uploads/products/${file.filename}`,
    },
  });

  return {
    message: 'Image uploaded successfully',
    image,
    url: `http://localhost:4000/uploads/products/${file.filename}`,
  };
}

// ======================================================
// LIST PRODUCT IMAGES
// ======================================================

@Get('product/images/:productId')
async listProductImages(
  @Req() req: any,
  @Param('productId') productId: string,
) {
  const product = await this.db.prisma.product.findFirst({
    where: {
      id: productId,
      store: {
        sellerId: req.user.sellerId,
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  const images = await this.db.prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: 'asc' },
  });

  return { images };
}

// ======================================================
// DELETE PRODUCT IMAGE
// ======================================================

@Post('product/image/delete/:imageId')
async deleteProductImage(
  @Req() req: any,
  @Param('imageId') imageId: string,
) {
  const image = await this.db.prisma.productImage.findFirst({
    where: {
      id: imageId,
      product: {
        store: {
          sellerId: req.user.sellerId,
        },
      },
    },
  });

  if (!image) {
    throw new NotFoundException('Image not found');
  }

  await this.db.prisma.productImage.delete({
    where: { id: imageId },
  });

  return {
    message: 'Image deleted successfully',
  };
}

// ======================================================
// REORDER PRODUCT IMAGES
// ======================================================

@Post('product/image/reorder/:productId')
async reorderProductImages(
  @Req() req: any,
  @Param('productId') productId: string,
  @Body() body: { imageIds: string[] },
) {
  const product = await this.db.prisma.product.findFirst({
    where: {
      id: productId,
      store: {
        sellerId: req.user.sellerId,
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  await this.db.prisma.$transaction(
    body.imageIds.map((imageId, index) =>
      this.db.prisma.productImage.update({
        where: { id: imageId },
        data: { sortOrder: index },
      }),
    ),
  );

  return {
    message: 'Images reordered successfully',
  };
}

@Post('order/cancel/:orderId')
async cancelOrder(
  @Req() req: any,
  @Param('orderId') orderId: string,
) {
  return this.sellerService.cancelOrder(
    req.user.sellerId,
    orderId,
  );
}

@Get('onboarding/progress')
getProgress(@Req() req: any) {
  return this.sellerService.getOnboardingProgress(
    req.user.sellerId,
  );
}

 @Get('orders/:orderId/invoice')
getInvoice(
  @Req() req: any,
  @Param('orderId') orderId: string,
  @Res({ passthrough: true }) res: any,
) {
  return this.sellerService.getInvoice(
    req.user.sellerId,
    orderId,
    res,
  );
}

}