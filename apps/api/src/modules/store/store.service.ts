import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(private db: PrismaService) {}

  async updateStore(
    sellerId: string,
    storeId: string,
    dto: UpdateStoreDto,
  ) {
    const store = await this.db.prisma.store.findFirst({
      where: { id: storeId, sellerId },
    });

    if (!store) throw new NotFoundException('Store not found');

    // ✅ prevent empty update
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('No data provided to update');
    }

    const updated = await this.db.prisma.store.update({
      where: { id: storeId },
      data: {
  ...dto,
      },
    });

    return {
      message: 'Store updated successfully',
      success: true,
      store: updated,
    };
  }
}