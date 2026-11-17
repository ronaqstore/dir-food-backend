-- AlterTable
ALTER TABLE "restaurants" DROP CONSTRAINT IF EXISTS "restaurants_cuisines_max_chk";
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_cuisines_max_chk" CHECK (cardinality(cuisines) <= 50);
