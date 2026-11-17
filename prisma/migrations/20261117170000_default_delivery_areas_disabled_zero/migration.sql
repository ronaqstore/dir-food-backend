-- AlterTable
ALTER TABLE "restaurant_delivery_areas" ALTER COLUMN "is_active" SET DEFAULT false;
ALTER TABLE "restaurant_delivery_areas" ALTER COLUMN "delivery_fee" SET DEFAULT 0;
ALTER TABLE "restaurant_delivery_areas" ALTER COLUMN "min_order_amount" SET DEFAULT 0;

-- Update existing records to disabled with 0 delivery fee and 0 min order amount
UPDATE "restaurant_delivery_areas" SET "is_active" = false, "delivery_fee" = 0, "min_order_amount" = 0;
