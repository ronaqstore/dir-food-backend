-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- Insert Default Seed City for Lower Dir
INSERT INTO "cities" ("id", "name", "slug", "sort_order", "is_active", "created_at", "updated_at")
VALUES ('01920000-0000-7000-8000-000000000001', 'Lower Dir', 'lower-dir', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Drop Old Unique Indexes
DROP INDEX IF EXISTS "areas_name_key";
DROP INDEX IF EXISTS "areas_slug_key";

-- AlterTable areas (nullable city_id first, backfill, then enforce NOT NULL)
ALTER TABLE "areas" ADD COLUMN "city_id" UUID;
ALTER TABLE "areas" ADD COLUMN "is_custom_created" BOOLEAN NOT NULL DEFAULT false;

UPDATE "areas" SET "city_id" = '01920000-0000-7000-8000-000000000001' WHERE "city_id" IS NULL;

ALTER TABLE "areas" ALTER COLUMN "city_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "areas_city_id_is_active_idx" ON "areas"("city_id", "is_active");
CREATE UNIQUE INDEX "areas_city_id_name_key" ON "areas"("city_id", "name");
CREATE UNIQUE INDEX "areas_city_id_slug_key" ON "areas"("city_id", "slug");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable restaurants (add city_id, backfill, add index & FK)
ALTER TABLE "restaurants" ADD COLUMN "city_id" UUID;

UPDATE "restaurants" SET "city_id" = '01920000-0000-7000-8000-000000000001' WHERE "city_id" IS NULL;

CREATE INDEX "restaurants_city_id_status_idx" ON "restaurants"("city_id", "status");
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

