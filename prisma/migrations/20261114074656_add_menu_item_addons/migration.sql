-- DropIndex
DROP INDEX "areas_city_id_is_active_idx";

-- DropIndex
DROP INDEX "order_intents_expires_idx";

-- DropIndex
DROP INDEX "restaurant_hours_day_idx";

-- DropIndex
DROP INDEX "restaurants_cuisines_gin_idx";

-- AlterTable
ALTER TABLE "order_intent_items" ADD COLUMN     "addons_snapshot" JSONB;

-- CreateTable
CREATE TABLE "menu_item_addons" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_item_addons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_item_addons_menu_item_id_idx" ON "menu_item_addons"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_addons_id_restaurant_id_menu_item_id_key" ON "menu_item_addons"("id", "restaurant_id", "menu_item_id");

-- AddForeignKey
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_menu_item_id_restaurant_id_fkey" FOREIGN KEY ("menu_item_id", "restaurant_id") REFERENCES "menu_items"("id", "restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
