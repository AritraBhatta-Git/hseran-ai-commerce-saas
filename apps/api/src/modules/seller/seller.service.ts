import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { randomSuffix, slugify } from '../../common/utils/slug.util';
import { randomUUID } from 'crypto';
import { NotificationService } from '../../notifications/notification.service';
import { canTransition, canCancel } from '../../common/utils/order-rules.util';
import { NotificationsService } from '../notifications-center/notifications.service';
import { generateInvoicePdf } from '../../common/utils/invoice.util';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

const DEFAULT_ONBOARDING_THEME = 'theme-starter-minimal';

type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

@Injectable()
export class SellerService {
  constructor(
    private db: PrismaService,
    private notificationService: NotificationService,
    private notificationsService: NotificationsService,
  ) {}

  // ======================================================
  // SELLER PROFILE
  // ======================================================

  async getProfile(sellerId: string) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { stores: true },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    return { seller };
  }

  async updateProfile(sellerId: string, dto: Record<string, string | undefined>) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    const data = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined && v !== ''),
    );

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No data provided to update');
    }

    const updated = await this.db.prisma.seller.update({
      where: { id: sellerId },
      data,
      include: { stores: true },
    });

    return {
      message: 'Profile updated successfully',
      success: true,
      seller: updated,
    };
  }

  // ======================================================
  // ONBOARDING
  // ======================================================

  async getOnboardingStatus(sellerId: string) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        isOnboarded: true,
        onboardingStep: true,
      },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    return seller;
  }

  async updateOnboardingDraft(sellerId: string, dto: UpdateOnboardingDto) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    if (seller.isOnboarded) {
      throw new BadRequestException('Onboarding already completed');
    }

    const data: Record<string, unknown> = {};

    const set = (key: keyof UpdateOnboardingDto, value: unknown) => {
      if (value === undefined) return;
      data[key] = value;
    };

    set('businessCategory', dto.businessCategory);
    set('businessType', dto.businessType);
    set('deliveryLocation', dto.deliveryLocation);
    set('preferredLanguage', dto.preferredLanguage);
    set('instagramLink', dto.instagramLink === '' ? null : dto.instagramLink);
    set('whatsappNumber', dto.whatsappNumber === '' ? null : dto.whatsappNumber);
    set('onboardingStep', dto.onboardingStep);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No onboarding data provided');
    }

    const updated = await this.db.prisma.seller.update({
      where: { id: sellerId },
      data,
    });

    return {
      message: 'Onboarding updated successfully',
      success: true,
      seller: updated,
      progress: this.computeOnboardingProgressPct(updated),
    };
  }

  private computeOnboardingProgressPct(seller: {
    businessCategory: string | null;
    businessType: string | null;
    deliveryLocation: string | null;
    preferredLanguage: string | null;
    instagramLink: string | null;
    whatsappNumber: string | null;
    onboardingStep: number;
    isOnboarded: boolean;
  }) {
    if (seller.isOnboarded) return 100;
    let pct = 0;
    if (seller.businessCategory) pct += 17;
    if (seller.businessType) pct += 17;
    if (seller.deliveryLocation) pct += 17;
    if (seller.preferredLanguage) pct += 17;
    const socialDone =
      Boolean(seller.instagramLink?.trim()) || Boolean(seller.whatsappNumber?.trim());
    pct += socialDone ? 12 : 6;
    const stepBoost = Math.min(20, Math.max(0, seller.onboardingStep) * 2);
    pct = Math.min(99, Math.max(pct, stepBoost));
    return pct;
  }

  private buildSmartStoreCopy(seller: {
    name: string | null;
    businessCategory: string | null;
    businessType: string | null;
    deliveryLocation: string | null;
    preferredLanguage: string | null;
  }) {
    const category = seller.businessCategory || 'products';
    const ownerFirst = seller.name?.trim().split(/\s+/).filter(Boolean)[0];
    const location = seller.deliveryLocation || 'India';
    const bizType = seller.businessType || 'online store';

    const deliveryTimeline = (() => {
      const l = location.toLowerCase();
      if (l.includes('international')) return '7–14 business days';
      if (l.includes('pan-india') || l.includes('pan india'))
        return '4–7 business days';
      if (l.includes('regional')) return '3–5 business days';
      if (l.includes('local')) return '1–3 business days';
      return '3–6 business days';
    })();

    const storeName = (() => {
      if (ownerFirst && ownerFirst.length > 1) {
        const n = `${ownerFirst}'s ${category}`;
        return n.length > 56 ? `${ownerFirst}'s Store` : n;
      }
      return `${category} Store`;
    })();

    const description = `Shop curated ${category.toLowerCase()} from our ${bizType}. Reliable delivery across ${location}.`;

    const shippingPolicy = `Orders are packed with care and shipped across ${location}. Typical delivery: ${deliveryTimeline}. You will receive tracking updates by email or SMS when available.`;

    const refundPolicy = `We accept returns for damaged or incorrect items reported within 48 hours of delivery. For ${category.toLowerCase()}, eligible items may be returned within 7 days if unused and in original packaging unless otherwise stated at checkout.`;

    const privacyPolicy = `We collect only the information needed to process your orders and improve your shopping experience. Payment details are handled securely by our payment partners. We do not sell your personal data. Contact the store for data or deletion requests.`;

    const termsPolicy = `By shopping at this store you agree to these terms, our shipping and refund policies, and applicable law. Product images are representative; minor variation may occur. The seller may update policies with reasonable notice on the storefront.`;

    return {
      storeName: storeName.replace(/^Our's/, "Our"),
      description,
      deliveryTimeline,
      refundPolicy,
      shippingPolicy,
      privacyPolicy,
      termsPolicy,
    };
  }

  async completeOnboarding(sellerId: string) {
    return this.db.prisma.$transaction(async (tx) => {
      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        include: { stores: true },
      });

      if (!seller) throw new NotFoundException('Seller not found');

      if (seller.isOnboarded) {
        const store = seller.stores[0];
        return {
          message: 'Onboarding already completed',
          success: true,
          seller,
          store: store ?? null,
        };
      }

      const required = [
        seller.businessCategory,
        seller.businessType,
        seller.deliveryLocation,
        seller.preferredLanguage,
      ];
      if (required.some((x) => !x || !String(x).trim())) {
        throw new BadRequestException(
          'Complete category, business type, delivery area, and language before finishing.',
        );
      }

      const copy = this.buildSmartStoreCopy(seller);

      let store = seller.stores[0];

      if (!store) {
        const baseSlug = slugify(
          `${seller.name || 'store'}-${seller.businessCategory || 'shop'}`,
        );
        const finalSlug = `${baseSlug}-${randomSuffix(4)}`;

        store = await tx.store.create({
          data: {
            sellerId,
            name: copy.storeName,
            slug: finalSlug,
            status: 'TRIAL',
            isPublic: true,
            description: copy.description,
            language: seller.preferredLanguage ?? undefined,
            refundPolicy: copy.refundPolicy,
            shippingPolicy: copy.shippingPolicy,
            privacyPolicy: copy.privacyPolicy,
            termsPolicy: copy.termsPolicy,
            deliveryTimeline: copy.deliveryTimeline,
            theme: DEFAULT_ONBOARDING_THEME,
            onboardingCompleted: true,
          },
        });
      } else {
        store = await tx.store.update({
          where: { id: store.id },
          data: {
            name: copy.storeName,
            description: copy.description,
            language: seller.preferredLanguage ?? undefined,
            refundPolicy: copy.refundPolicy,
            shippingPolicy: copy.shippingPolicy,
            privacyPolicy: copy.privacyPolicy,
            termsPolicy: copy.termsPolicy,
            deliveryTimeline: copy.deliveryTimeline,
            theme: DEFAULT_ONBOARDING_THEME,
            onboardingCompleted: true,
          },
        });
      }

      await tx.category.createMany({
        skipDuplicates: true,
        data: [
          { storeId: store.id, name: 'All Products', slug: 'all-products' },
          { storeId: store.id, name: 'Best Sellers', slug: 'best-sellers' },
          { storeId: store.id, name: 'New Arrivals', slug: 'new-arrivals' },
        ],
      });

      const updated = await tx.seller.update({
        where: { id: sellerId },
        data: {
          isOnboarded: true,
          onboardingStep: 100,
        },
      });

      return {
        message: 'Onboarding completed successfully',
        success: true,
        seller: updated,
        store,
      };
    });
  }

  async getOnboardingProgress(sellerId: string) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    return {
      progress: this.computeOnboardingProgressPct(seller),
      isCompleted: seller.isOnboarded,
      onboardingStep: seller.onboardingStep,
    };
  }

  // ======================================================
  // STORE
  // ======================================================

  async createStore(sellerId: string, dto: any) {
    const seller = await this.db.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { stores: true },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    const limit = seller.isOnboarded ? 6 : 2;

    if (seller.stores.length >= limit) {
      throw new BadRequestException(
        'Store limit reached. Upgrade to create more stores.',
      );
    }

    const baseSlug = slugify(dto.name);
    const finalSlug = `${baseSlug}-${randomSuffix(4)}`;

    const store = await this.db.prisma.store.create({
      data: {
        sellerId,
        name: dto.name,
        slug: finalSlug,
        status: 'TRIAL',
        isPublic: true,
      },
    });

    return {
      message: 'Store created successfully',
      success: true,
      store,
    };
  }

  // ======================================================
  // PRODUCT
  // ======================================================

  async createProduct(sellerId: string, dto: any) {
    const store = await this.db.prisma.store.findFirst({
      where: {
        id: dto.storeId,
        sellerId,
      },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const uid = `PRD-${randomUUID().slice(0, 8)}`;

    let categoryConnections:
      | {
          create: {
            category: { connect: { id: string } };
          }[];
        }
      | undefined;

    if (dto.categoryIds?.length) {
      const validCategories = await this.db.prisma.category.findMany({
        where: {
          id: { in: dto.categoryIds },
          storeId: dto.storeId,
        },
      });

      if (validCategories.length !== dto.categoryIds.length) {
        throw new BadRequestException('Invalid categories');
      }

      categoryConnections = {
        create: dto.categoryIds.map((id: string) => ({
          category: { connect: { id } },
        })),
      };
    }

    const product = await this.db.prisma.product.create({
      data: {
        storeId: dto.storeId,
        uid,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        mrp: dto.mrp,
        stockQty: dto.stockQty ?? 0,
        sku: dto.sku,
        isActive: true,
        categories: categoryConnections,
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return {
      message: 'Product created successfully',
      success: true,
      product,
    };
  }

  // ======================================================
  // ORDER STATUS FLOW
  // ======================================================

  async updateOrderStatus(
    sellerId: string,
    orderId: string,
    status: OrderStatusType,
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
      data: { status },
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

  try {
  await this.notificationService.sendOrderStatusUpdate(updated, status);
} catch (e) {
  console.log('Email failed', e);
}

try {
  await this.notificationsService.create({
    sellerId: updated.store.sellerId,
    title: 'Order Updated',
    message: `Order ${updated.id} is now ${status}`,
    type: 'ORDER',
  });
} catch (e) {
  console.log('DB notification failed', e);
}

    return {
      message: 'Order status updated successfully',
      success: true,
      order: updated,
    };
  }

  // ======================================================
  // DASHBOARD
  // ======================================================

  async getDashboard(sellerId: string, storeId: string) {
    const store = await this.db.prisma.store.findFirst({
      where: { id: storeId, sellerId },
    });

    if (!store) throw new BadRequestException('Invalid store');

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      totalProducts,
      lowStockProducts,
      lowStockItems,
      recentOrders,
    ] = await Promise.all([
      this.db.prisma.order.count({ where: { storeId } }),
      this.db.prisma.order.count({
        where: { storeId, status: 'PENDING' },
      }),
      this.db.prisma.order.count({
        where: { storeId, status: 'DELIVERED' },
      }),
      this.db.prisma.order.count({
        where: { storeId, status: 'CANCELLED' },
      }),
      this.db.prisma.order.aggregate({
        where: { storeId, status: 'DELIVERED' },
        _sum: { totalAmount: true },
      }),
      this.db.prisma.product.count({ where: { storeId } }),
      this.db.prisma.product.count({
        where: { storeId, stockQty: { lte: 5 } },
      }),
      this.db.prisma.product.findMany({
        where: { storeId, stockQty: { lte: 5 } },
        select: {
          id: true,
          uid: true,
          name: true,
          stockQty: true,
          sku: true,
        },
        orderBy: { stockQty: 'asc' },
        take: 10,
      }),
      this.db.prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { name: true, email: true } },
        },
      }),
    ]);

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        status: store.status,
        isPublic: store.isPublic,
        theme: store.theme,
      },
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.totalAmount ?? 0,
        totalProducts,
        lowStockProducts,
      },
      lowStockItems,
      recentOrders,
    };
  }

  // ======================================================
  // CANCEL ORDER (SELLER)
  // ======================================================

  async getInvoice(sellerId: string, orderId: string, res: any) {
  const order = await this.db.prisma.order.findFirst({
    where: {
      id: orderId,
      store: { sellerId },
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


  async cancelOrder(sellerId: string, orderId: string) {
    return this.db.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          store: {
            sellerId,
          },
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === 'CANCELLED') {
        throw new BadRequestException('Order already cancelled');
      }

      if (!canCancel(order.status as any)) {
        throw new BadRequestException(
          `Cannot cancel order in ${order.status} state`,
        );
      }

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

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
        },
        include: {
          customer: true,
          store: {
            include: {
              seller: true,
            },
          },
        },
      });

      try {
        await this.notificationService.sendOrderStatusUpdate(
          updated,
          'CANCELLED',
        
        );
        try {
  await this.notificationsService.create({
    sellerId: updated.store.sellerId,
    title: 'Order Cancelled ❌',
    message: `Order ${updated.id} was cancelled`,
    type: 'ORDER',
  });
} catch (e) {
  console.log('DB notification failed', e);
}
      } catch (e) {
        console.log('Notification failed (non-blocking)', e);
      }

      return {
        message: 'Order cancelled by seller',
        orderId: updated.id,
      };
    });
  }
}