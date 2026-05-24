import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class CustomerService {
  constructor(private db: PrismaService) {}

  // ========================
  // GET PROFILE
  // ========================
  async getProfile(customerId: string) {
    const customer = await this.db.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        googleId: true,
        createdAt: true,
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    return { customer };
  }

  // ========================
  // UPDATE PROFILE
  // ========================
  async updateProfile(customerId: string, dto: UpdateProfileDto) {
    const customer = await this.db.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const updated = await this.db.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.name && { name: dto.name }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return { customer: updated };
  }

  // ========================
  // ORDER STATUS
  // ========================
  async getOrderStatus(customerId: string, orderId: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
    };
  }

  // ========================
  // ORDER TIMELINE
  // ========================
  async getOrderTimeline(customerId: string, orderId: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const timeline = [
      { status: 'PENDING', done: true },
      { status: 'CONFIRMED', done: false },
      { status: 'SHIPPED', done: false },
      { status: 'DELIVERED', done: false },
    ];

    const currentIndex = timeline.findIndex(
      (t) => t.status === order.status,
    );

    for (let i = 0; i <= currentIndex; i++) {
      timeline[i].done = true;
    }

    return {
      orderId,
      status: order.status,
      timeline,
    };
  }

  // ========================
  // LATEST ACTIVE ORDER (for dashboard quick status)
  // ========================
  async getLatestActiveOrder(customerId: string) {
    const order = await this.db.prisma.order.findFirst({
      where: {
        customerId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          take: 1,
          select: { productName: true, quantity: true },
        },
        store: {
          select: { name: true },
        },
      },
    });

    return { order };
  }
}