import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(private db: PrismaService) {}

  async addToCart(customerId: string, dto: AddToCartDto) {
    return this.db.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: dto.productId,
          storeId: dto.storeId,
          isActive: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // If variant specified, validate it
      let variantStock = product.stockQty;
      if (dto.variantId) {
        const variant = await tx.productVariant.findFirst({
          where: { id: dto.variantId, productId: dto.productId, isActive: true },
        });
        if (!variant) {
          throw new NotFoundException('Variant not found or inactive');
        }
        variantStock = variant.stockQty;
      }

      if (variantStock < dto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      let cart = await tx.cart.findUnique({
        where: {
          storeId_customerId: {
            storeId: dto.storeId,
            customerId,
          },
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            storeId: dto.storeId,
            customerId,
          },
        });
      }

      // Find existing cart item (matching product + variant combo)
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
        },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + dto.quantity;

        if (newQuantity > variantStock) {
          throw new BadRequestException('Exceeds available stock');
        }

        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            priceSnapshot: product.price,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            variantId: dto.variantId ?? null,
            quantity: dto.quantity,
            priceSnapshot: product.price,
          },
        });
      }

      return {
        message: 'Added to cart successfully',
        success: true,
      };
    });
  }

  async getCart(customerId: string, storeId: string) {
    const cart = await this.db.prisma.cart.findUnique({
      where: {
        storeId_customerId: {
          storeId,
          customerId,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      return { items: [], total: 0 };
    }

    const items = cart.items.map((item) => ({
      ...item,
      isAvailable: item.variant
        ? item.variant.stockQty >= item.quantity
        : item.product.stockQty >= item.quantity,
    }));

    const total = items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.quantity,
      0,
    );

    return {
      items,
      total,
    };
  }

  async removeItem(customerId: string, itemId: string) {
    const item = await this.db.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          customerId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.db.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return {
      message: 'Item removed successfully',
      success: true,
    };
  }

  async updateQuantity(
    customerId: string,
    itemId: string,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const item = await this.db.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          customerId,
        },
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const maxStock = item.variant ? item.variant.stockQty : item.product.stockQty;

    if (quantity > maxStock) {
      throw new BadRequestException('Exceeds available stock');
    }

    await this.db.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
        priceSnapshot: item.product.price,
      },
    });

    return {
      message: 'Quantity updated successfully',
      success: true,
    };
  }

  async clearCart(customerId: string, storeId: string) {
    const cart = await this.db.prisma.cart.findUnique({
      where: {
        storeId_customerId: {
          storeId,
          customerId,
        },
      },
    });

    if (!cart) {
      return { message: 'Cart already empty' };
    }

    await this.db.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      message: 'Cart cleared successfully',
      success: true,
    };
  }
}