import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { slugify } from '../../common/utils/slug.util';

@Injectable()
export class CategoryService {
  constructor(private db: PrismaService) {}

  async createCategory(
    sellerId: string,
    storeId: string,
    name: string,
  ) {
    const store = await this.db.prisma.store.findFirst({
      where: { id: storeId, sellerId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const slug = slugify(name);

    const exists = await this.db.prisma.category.findFirst({
      where: { storeId, slug },
    });

    if (exists) {
      throw new BadRequestException(
        'Category with this name already exists',
      );
    }

    return this.db.prisma.category.create({
      data: {
        storeId,
        name,
        slug,
      },
    });
  }

  async getCategories(sellerId: string, storeId: string) {
    const store = await this.db.prisma.store.findFirst({
      where: { id: storeId, sellerId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.db.prisma.category.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCategory(
    sellerId: string,
    storeId: string,
    categoryId: string,
    name: string,
  ) {
    const category = await this.db.prisma.category.findFirst({
      where: { id: categoryId, storeId },
      include: { store: true },
    });

    if (!category || category.store.sellerId !== sellerId) {
      throw new NotFoundException('Category not found');
    }

    const slug = slugify(name);

    return this.db.prisma.category.update({
      where: { id: categoryId },
      data: { name, slug },
    });
  }

  async deleteCategory(
    sellerId: string,
    storeId: string,
    categoryId: string,
  ) {
    const category = await this.db.prisma.category.findFirst({
      where: { id: categoryId, storeId },
      include: { store: true },
    });

    if (!category || category.store.sellerId !== sellerId) {
      throw new NotFoundException('Category not found');
    }

    await this.db.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }
}
