import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private db: PrismaService) {}

  async validateStore(slug: string) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        slug,
        isPublic: true,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    if (!store) throw new NotFoundException('Store not found');

    return store;
  }

  async getStore(slug: string) {
    const store = await this.validateStore(slug);

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      logoUrl: store.logoUrl,
      bannerUrl: store.bannerUrl,
      theme: store.theme,
    };
  }

  // ✅ ONLY ONE METHOD (UPGRADED)
  async getStoreProducts(
    slug: string,
    page = 1,
    limit = 10,
    categoryId?: string,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    sort?: string,
  ) {
    const store = await this.validateStore(slug);

    const whereCondition: any = {
      storeId: store.id,
      isActive: true,
    };

    if (categoryId) {
      whereCondition.categories = {
        some: { categoryId },
      };
    }

    if (search) {
      whereCondition.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (minPrice || maxPrice) {
      whereCondition.price = {};

      if (minPrice) whereCondition.price.gte = minPrice;
      if (maxPrice) whereCondition.price.lte = maxPrice;
    }

    let orderBy: any = { createdAt: 'desc' };

    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'latest') orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      this.db.prisma.product.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          categories: { include: { category: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        },
      }),
      this.db.prisma.product.count({ where: whereCondition }),
    ]);

    return { total, page, limit, products };
  }

  async getSingleProduct(slug: string, productId: string) {
    const store = await this.validateStore(slug);

    const product = await this.db.prisma.product.findFirst({
      where: {
        id: productId,
        storeId: store.id,
        isActive: true,
      },
      include: {
        categories: { include: { category: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    return { product };
  }

  async createOrder(dto: any) {
    if (!dto.customerId) {
      throw new BadRequestException('Customer required');
    }

    const store = await this.validateStore(dto.storeSlug);

    const products = await this.db.prisma.product.findMany({
      where: {
        id: { in: dto.items.map((i) => i.productId) },
        storeId: store.id,
        isActive: true,
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('Invalid products');
    }

    let total = 0;

    const orderItemsData = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);

      if (!product) throw new BadRequestException('Product not found');

      if (product.stockQty < item.quantity)
        throw new BadRequestException(
          `Insufficient stock for ${product.name}`,
        );

      total += product.price * item.quantity;

      return {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
      };
    });

    const order = await this.db.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: dto.customerId,
          totalAmount: total,
          status: 'PENDING',
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQty: { gte: item.quantity },
          },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });
      }

      return createdOrder;
    });

    return {
      message: 'Order created successfully',
      order,
    };
  }
}