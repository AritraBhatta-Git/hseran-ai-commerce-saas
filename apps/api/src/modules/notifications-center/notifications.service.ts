import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private db: PrismaService) {}

  // ======================================================
  // CREATE NOTIFICATION
  // ======================================================

  async create(data: {
    sellerId?: string;
    customerId?: string;
    title: string;
    message: string;
    type: string;
  }) {
    return this.db.prisma.notification.create({
      data,
    });
  }

  // ======================================================
  // GET SELLER NOTIFICATIONS
  // ======================================================

  async getSellerNotifications(sellerId: string, page = 1, limit = 10) {
    const [notifications, total] = await Promise.all([
      this.db.prisma.notification.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.prisma.notification.count({
        where: { sellerId },
      }),
    ]);

    return {
      total,
      page,
      limit,
      notifications,
    };
  }

  // ======================================================
  // MARK AS READ
  // ======================================================

  async markAsRead(notificationId: string, sellerId: string) {
    return this.db.prisma.notification.updateMany({
      where: {
        id: notificationId,
        sellerId,
      },
      data: {
        isRead: true,
      },
    });
  }

  // ======================================================
  // UNREAD COUNT
  // ======================================================

  async getUnreadCount(sellerId: string) {
    const count = await this.db.prisma.notification.count({
      where: {
        sellerId,
        isRead: false,
      },
    });

    return { count };
  }
}