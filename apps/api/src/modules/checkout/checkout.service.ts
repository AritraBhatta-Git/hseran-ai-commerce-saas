import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationsService } from '../notifications-center/notifications.service';

@Injectable()
export class CheckoutService {
  constructor(
    private db: PrismaService,
    private notificationService: NotificationService,
    private notificationsService: NotificationsService,
  ) {}

  async checkout(customerId: string, dto: CheckoutDto) {
    const result = await this.db.prisma.$transaction(async (tx) => {

      // 🔒 ORDER LOCK (PREVENT DUPLICATE)
      const existingOrder = await tx.order.findFirst({
        where: {
          customerId,
          storeId: dto.storeId,
          status: 'PENDING',
        },
      });

      if (existingOrder) {
        return {
          message: 'Order already in progress',
          orderId: existingOrder.id,
          order: null,
        };
      }

      // ================= CART =================
      const cart = await tx.cart.findUnique({
        where: {
          storeId_customerId: {
            storeId: dto.storeId,
            customerId,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // ================= ADDRESS =================
      const address = await tx.address.findFirst({
        where: {
          id: dto.addressId,
          customerId,
        },
      });

      if (!address) {
        throw new BadRequestException('Invalid address');
      }

      // ================= CALCULATION =================
      let totalAmount = 0;

      for (const item of cart.items) {
        if (item.product.stockQty < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.product.name}`,
          );
        }

        totalAmount += item.priceSnapshot * item.quantity;
      }

      // ================= CREATE ORDER =================
      const order = await tx.order.create({
        data: {
          storeId: dto.storeId,
          customerId,
          totalAmount,
          status: 'PENDING',
        },
      });

      // ================= ITEMS + STOCK =================
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: item.product.name,
            price: item.priceSnapshot,
            quantity: item.quantity,
          },
        });

        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQty: { gte: item.quantity },
          },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException(
            `Stock conflict for ${item.product.name}`,
          );
        }
      }

      // ================= CLEAR CART =================
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // ================= FETCH FULL ORDER =================
      const fullOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          customer: true,
          store: {
            include: {
              seller: true,
            },
          },
          items: true,
        },
      });

      // ================= 🔥 DB NOTIFICATION (FIXED) =================
      if (fullOrder) {
        await this.notificationsService.create({
          sellerId: fullOrder.store.sellerId,
          title: 'New Order Received 🛒',
          message: `Order ${order.id} placed worth ₹${totalAmount}`,
          type: 'ORDER',
        });
      }

      return {
        message: 'Order created successfully',
        orderId: order.id,
        order: fullOrder,
      };
    });

    // ================= EMAIL NOTIFICATIONS =================
    try {
      if (result.order) {
        await this.notificationService.sendOrderConfirmation(result.order);
        await this.notificationService.notifySellerNewOrder(result.order);
      }
    } catch (e) {
      console.log('Notification failed (non-blocking)', e);
    }

    return {
      message: result.message,
      orderId: result.orderId,
    };
  }
}