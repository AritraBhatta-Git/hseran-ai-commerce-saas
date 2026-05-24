import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './providers/prisma/prisma.module';
import { RedisModule } from './providers/redis/redis.module';

import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { SellerModule } from './modules/seller/seller.module';
import { PublicModule } from './modules/public/public.module';
import { CartModule } from './modules/cart/cart.module';
import { AuthCoreModule } from './modules/auth-core/auth-core.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { AddressModule } from './modules/address/address.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { CustomerOrdersModule } from './modules/customer-orders/customer-orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EmailModule } from './notifications/email/email.module';
import { StoreModule } from './modules/store/store.module';
import { CustomerModule } from './modules/customer/customer.module';
import { SellerOrdersModule } from './modules/seller-orders/seller-orders.module';
import { NotificationModule } from './notifications/notification.module';
import { NotificationsCenterModule } from './modules/notifications-center/notifications-center.module.ts';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    PublicModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    SellerModule,
    CartModule,
    AuthCoreModule,
    CustomerAuthModule,
    AddressModule,
    CheckoutModule,
    CustomerOrdersModule,
    InventoryModule,
    EmailModule,
    StoreModule,
    CustomerModule,
    SellerOrdersModule,
    NotificationModule,
    NotificationsCenterModule,
    ProductModule,
    CategoryModule,
    AiModule,
  ],
})
export class AppModule {}

