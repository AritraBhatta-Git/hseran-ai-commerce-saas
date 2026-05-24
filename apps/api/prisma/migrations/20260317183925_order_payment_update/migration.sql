-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- DropIndex
DROP INDEX "Address_customerId_idx";

-- DropIndex
DROP INDEX "AuthSession_adminId_idx";

-- DropIndex
DROP INDEX "AuthSession_customerId_idx";

-- DropIndex
DROP INDEX "AuthSession_role_idx";

-- DropIndex
DROP INDEX "AuthSession_sellerId_idx";

-- DropIndex
DROP INDEX "Cart_customerId_idx";

-- DropIndex
DROP INDEX "Cart_storeId_idx";

-- DropIndex
DROP INDEX "CartItem_cartId_idx";

-- DropIndex
DROP INDEX "CartItem_cartId_productId_key";

-- DropIndex
DROP INDEX "CartItem_productId_idx";

-- DropIndex
DROP INDEX "EmailVerification_customerId_idx";

-- DropIndex
DROP INDEX "Order_customerId_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Order_storeId_idx";

-- DropIndex
DROP INDEX "OrderItem_orderId_idx";

-- DropIndex
DROP INDEX "OrderItem_productId_idx";

-- DropIndex
DROP INDEX "OtpRequest_expiresAt_idx";

-- DropIndex
DROP INDEX "OtpRequest_phone_idx";

-- DropIndex
DROP INDEX "ProductCategory_categoryId_idx";

-- DropIndex
DROP INDEX "ProductCategory_productId_idx";

-- DropIndex
DROP INDEX "ProductImage_productId_idx";

-- DropIndex
DROP INDEX "StockLog_productId_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shippingAddressLine1" TEXT,
ADD COLUMN     "shippingAddressLine2" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingCountry" TEXT,
ADD COLUMN     "shippingFullName" TEXT,
ADD COLUMN     "shippingPhone" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT,
ADD COLUMN     "shippingState" TEXT;
