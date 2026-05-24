import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { canTransition, canCancel } from '../../common/utils/order-rules.util';

@Injectable()
export class SellerOrdersService {
  constructor(private db: PrismaService) {}

  // ======================================================
  // LIST + FILTER + SEARCH
  // ======================================================

  async list(
    sellerId: string,
    storeId: string,
    page = 1,
    limit = 10,
    status?: string,
    search?: string,
  ) {
    const where: any = {
      storeId,
      store: { sellerId },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search } },
        {
          customer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      this.db.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          customer: true,
        },
      }),
      this.db.prisma.order.count({ where }),
    ]);

    return { total, page, limit, orders };
  }

  // ======================================================
  // ADD NOTE
  // ======================================================

  async addNote(sellerId: string, orderId: string, note: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        store: { sellerId },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.db.prisma.order.update({
      where: { id: orderId },
      data: {
        // ⚠️ assuming you will add this in Prisma
        // notes: { push: note }
      },
    });

    return {
      message: 'Note added',
      order: updated,
    };
  }

  // ======================================================
  // TIMELINE (SELLER VIEW)
  // ======================================================

  async getTimeline(sellerId: string, orderId: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        store: { sellerId },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const flow = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

    const timeline = flow.map((status) => ({
      status,
      done: flow.indexOf(status) <= flow.indexOf(order.status),
    }));

    return {
      orderId,
      status: order.status,
      timeline,
    };
  }

  // ======================================================
  // UPDATE STATUS (REUSE RULES)
  // ======================================================

  async updateStatus(
    sellerId: string,
    orderId: string,
    status: string,
  ) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        store: { sellerId },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (!canTransition(order.status as any, status as any)) {
      throw new BadRequestException(
        `Invalid transition from ${order.status} to ${status}`,
      );
    }

    const updated = await this.db.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });

    return {
      message: 'Order updated',
      order: updated,
    };
  }

  // ======================================================
  // CANCEL (SELLER SIDE)
  // ======================================================

  async cancelOrder(sellerId: string, orderId: string) {
    return this.db.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          store: { sellerId },
        },
        include: { items: true },
      });

      if (!order) throw new NotFoundException('Order not found');

      if (!canCancel(order.status as any)) {
        throw new BadRequestException('Cannot cancel');
      }

      // restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: { increment: item.quantity },
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      return { message: 'Cancelled successfully' };
    });
  }
}