import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { canCancel } from '../../common/utils/order-rules.util';
import { generateInvoicePdf } from '../../common/utils/invoice.util';

@Injectable()
export class CustomerOrdersService {
  constructor(private db: PrismaService) {}

  async list(
    customerId: string,
    page = 1,
    limit = 10,
    status?: string,
  ) {
    const where: any = { customerId };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.db.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          items: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.db.prisma.order.count({ where }),
    ]);

    return {
      total,
      page,
      limit,
      orders,
    };
  }

  async getOrder(customerId: string, orderId: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        items: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { order };
  }

  async cancelOrder(customerId: string, orderId: string) {
    return this.db.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          customerId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 🔒 SAFE CANCEL CHECK
      if (!canCancel(order.status as any)) {
        throw new BadRequestException('Order cannot be cancelled');
      }

      // 🔄 RESTORE STOCK
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: {
              increment: item.quantity,
            },
          },
        });
      }

      // ❌ UPDATE ORDER STATUS
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
        },
      });

      return {
        message: 'Order cancelled successfully',
        orderId: updated.id,
      };
    });
  }
  
  async getInvoice(customerId: string, orderId: string, res: any) {
  const order = await this.db.prisma.order.findFirst({
    where: {
      id: orderId,
      customerId,
    },
    include: {
      items: true,
      store: true,
      customer: true,
    },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  const pdfBuffer = await generateInvoicePdf(order);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=invoice-${order.id}.pdf`,
  });

  res.end(pdfBuffer);
}

}