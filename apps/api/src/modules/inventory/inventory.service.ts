import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { LOW_STOCK_THRESHOLD } from './constants/inventory.constants';
import { isLowStock } from './utils/inventory.util';
import { InventoryAlertService } from './alerts/inventory-alert.service';

@Injectable()
export class InventoryService {
  constructor(private db: PrismaService, 
    private alertService: InventoryAlertService,
  )
   {}

  async updateStock(
    productId: string,
    stockQty: number,
    reason?: string, // ✅ upgrade (optional)
  ) {
    return this.db.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // ✅ prevent negative stock
      if (stockQty < 0) {
        throw new BadRequestException('Stock cannot be negative');
      }

      const previousStock = product.stockQty;
      const changeQty = stockQty - previousStock;

      // ✅ update stock (same logic)
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockQty },
      });

      // ✅ enhanced stock log
      await tx.stockLog.create({
        data: {
          productId,
          changeQty,
          reason: reason || 'MANUAL_UPDATE',
        },
      });

      // 🔥 LOW STOCK DETECTION (NEW)
      if (isLowStock(stockQty, LOW_STOCK_THRESHOLD)) {
        console.log(`⚠️ Low stock alert for product ${productId}`);
        await this.alertService.triggerLowStock(updated);

        if (isLowStock(stockQty, LOW_STOCK_THRESHOLD)) {
  console.log(`⚠️ Low stock alert for product ${productId}`);

  // 🔥 fetch full product with seller
  const fullProduct = await tx.product.findUnique({
    where: { id: productId },
    include: {
      store: {
        include: {
          seller: true,
        },
      },
    },
  });

  if (fullProduct) {
    await this.alertService.triggerLowStock(fullProduct);
  }
}

        // 👉 Future: trigger email/whatsapp here
      }

      return updated;
    });
  }

  async getStockLogs(productId: string) {
    return this.db.prisma.stockLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }
}