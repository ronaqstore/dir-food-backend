-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN "is_deal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "original_price" BIGINT;
