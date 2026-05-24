import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { randomSuffix } from '../../common/utils/slug.util';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductService {
  constructor(private db: PrismaService) {}

  // ======================================================
  // PRODUCT CRUD
  // ======================================================

  async createProduct(sellerId: string, storeId: string, dto: any) {
    const store = await this.db.prisma.store.findFirst({
      where: { id: storeId, sellerId },
    });

    if (!store) {
      throw new NotFoundException('Store not found or unauthorized');
    }

    const uid = `PRD-${randomSuffix(6)}`;

    const product = await this.db.prisma.product.create({
      data: {
        storeId,
        uid,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        mrp: dto.mrp,
        stockQty: dto.stockQty ?? 0,
        sku: dto.sku,
        isActive: dto.isActive ?? true,
      },
      include: {
        variants: true,
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
      },
    });

    // If variants were provided inline during creation
    if (dto.variants && Array.isArray(dto.variants) && dto.variants.length > 0) {
      for (const v of dto.variants) {
        await this.db.prisma.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            mrp: v.mrp,
            stockQty: v.stockQty ?? 0,
            isActive: v.isActive ?? true,
          },
        });
      }

      // Re-fetch with variants
      return this.db.prisma.product.findUnique({
        where: { id: product.id },
        include: {
          variants: true,
          images: { orderBy: { sortOrder: 'asc' } },
          categories: { include: { category: true } },
        },
      });
    }

    return product;
  }

  async getProducts(sellerId: string, storeId: string, page = 1, limit = 10) {
    const store = await this.db.prisma.store.findFirst({
      where: { id: storeId, sellerId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const [products, total] = await Promise.all([
      this.db.prisma.product.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          variants: { orderBy: { createdAt: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
          categories: { include: { category: true } },
        },
      }),
      this.db.prisma.product.count({ where: { storeId } }),
    ]);

    return { products, total, page, limit };
  }

  async getProduct(sellerId: string, storeId: string, productId: string) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: {
        store: true,
        variants: { orderBy: { createdAt: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
      },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(
    sellerId: string,
    storeId: string,
    productId: string,
    dto: any,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    // Extract variant data if present so it doesn't go into product update
    const { variants, ...productData } = dto;

    return this.db.prisma.product.update({
      where: { id: productId },
      data: productData,
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
      },
    });
  }

  async toggleProductStatus(
    sellerId: string,
    storeId: string,
    productId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    return this.db.prisma.product.update({
      where: { id: productId },
      data: { isActive: !product.isActive },
      include: {
        variants: true,
        images: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
      },
    });
  }

  async deleteProduct(
    sellerId: string,
    storeId: string,
    productId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    await this.db.prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }

  // ======================================================
  // PRODUCT VARIANTS
  // ======================================================

  async addVariant(
    sellerId: string,
    storeId: string,
    productId: string,
    dto: CreateVariantDto,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    const variant = await this.db.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        sku: dto.sku,
        price: dto.price,
        mrp: dto.mrp,
        stockQty: dto.stockQty ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return variant;
  }

  async updateVariant(
    sellerId: string,
    storeId: string,
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    const variant = await this.db.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return this.db.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  async deleteVariant(
    sellerId: string,
    storeId: string,
    productId: string,
    variantId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    const variant = await this.db.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    await this.db.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Variant deleted successfully' };
  }

  async toggleVariantStatus(
    sellerId: string,
    storeId: string,
    productId: string,
    variantId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    const variant = await this.db.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return this.db.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: !variant.isActive },
    });
  }

  async getVariants(
    sellerId: string,
    storeId: string,
    productId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    return this.db.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ======================================================
  // CATEGORY ASSIGNMENT
  // ======================================================

  async assignCategory(
    sellerId: string,
    storeId: string,
    productId: string,
    categoryId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    const category = await this.db.prisma.category.findFirst({
      where: { id: categoryId, storeId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if already assigned
    const existing = await this.db.prisma.productCategory.findFirst({
      where: { productId, categoryId },
    });

    if (existing) {
      throw new BadRequestException('Category already assigned');
    }

    return this.db.prisma.productCategory.create({
      data: { productId, categoryId },
      include: { category: true },
    });
  }

  async removeCategory(
    sellerId: string,
    storeId: string,
    productId: string,
    categoryId: string,
  ) {
    const product = await this.db.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { store: true },
    });

    if (!product || product.store.sellerId !== sellerId) {
      throw new NotFoundException('Product not found');
    }

    const assignment = await this.db.prisma.productCategory.findFirst({
      where: { productId, categoryId },
    });

    if (!assignment) {
      throw new NotFoundException('Category assignment not found');
    }

    await this.db.prisma.productCategory.delete({
      where: { id: assignment.id },
    });

    return { message: 'Category removed from product' };
  }

  // ======================================================
  // IMAGE SYSTEM
  // ======================================================

  async uploadImage(productId: string, filename: string) {
    const product = await this.db.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new NotFoundException('Product not found');

    const image = await this.db.prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/products/${filename}`,
      },
    });

    return {
      message: 'Image uploaded',
      image,
    };
  }

  async getImages(productId: string) {
    const images = await this.db.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    return { images };
  }

  async deleteImage(imageId: string) {
    const image = await this.db.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) throw new NotFoundException('Image not found');

    const filePath = path.join(process.cwd(), image.url);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.db.prisma.productImage.delete({
      where: { id: imageId },
    });

    return { message: 'Image deleted' };
  }

  async reorderImages(productId: string, imageIds: string[]) {
    const updates = imageIds.map((id, index) =>
      this.db.prisma.productImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await Promise.all(updates);

    return { message: 'Images reordered' };
  }
}