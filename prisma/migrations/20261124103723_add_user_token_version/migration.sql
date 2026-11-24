-- AlterTable
ALTER TABLE "restaurant_delivery_areas" ALTER COLUMN "min_order_amount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
