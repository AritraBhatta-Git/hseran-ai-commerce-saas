-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "businessCategory" TEXT,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "deliveryLocation" TEXT,
ADD COLUMN     "instagramLink" TEXT,
ADD COLUMN     "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;
