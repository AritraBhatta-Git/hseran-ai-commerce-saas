-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "deliveryTimeline" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theme" TEXT DEFAULT 'default';
