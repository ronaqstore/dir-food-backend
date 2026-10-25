-- AlterTable
ALTER TABLE "areas" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "area_aliases" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "area_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "area_aliases_city_id_normalized_key" ON "area_aliases"("city_id", "normalized");

-- CreateIndex
CREATE INDEX "area_aliases_city_id_normalized_idx" ON "area_aliases"("city_id", "normalized");

-- CreateIndex
CREATE INDEX "areas_city_id_is_active_is_verified_idx" ON "areas"("city_id", "is_active", "is_verified");

-- AddForeignKey
ALTER TABLE "area_aliases" ADD CONSTRAINT "area_aliases_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_aliases" ADD CONSTRAINT "area_aliases_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

