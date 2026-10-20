-- AlterTable
ALTER TABLE "restaurant_delivery_areas" ADD COLUMN "min_order_amount" BIGINT;

-- Add check constraint for min_order_amount >= 0
ALTER TABLE "restaurant_delivery_areas"
  ADD CONSTRAINT rda_min_order_chk CHECK (min_order_amount IS NULL OR min_order_amount >= 0);

