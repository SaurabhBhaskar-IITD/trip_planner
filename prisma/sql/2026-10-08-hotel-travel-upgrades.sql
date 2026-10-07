-- Hotel & travel upgrade add-ons (2026-10-08) — 100% ADDITIVE.
--
-- Generated with `prisma migrate diff` from the committed schema to the new one.
-- No DROP / RENAME / type change: every new column is nullable or defaulted, so
-- the currently deployed planner keeps working against the altered tables.
--
-- Apply (Neon BRANCH first, production only after approval):
--   npx prisma db execute --file prisma/sql/2026-10-08-hotel-travel-upgrades.sql
-- Do NOT use `prisma db push` / `migrate dev` on this database.

-- CreateEnum
CREATE TYPE "AddonCategory" AS ENUM ('HOTEL_UPGRADE', 'TRAVEL_UPGRADE');

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "baseRoomOccupancy" INTEGER;

-- AlterTable
ALTER TABLE "trip_addon_options" ADD COLUMN     "availabilityNote" TEXT,
ADD COLUMN     "isRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roomOccupancy" INTEGER,
ADD COLUMN     "supplierCostOverrideMinor" BIGINT;

-- AlterTable
ALTER TABLE "addons" ADD COLUMN     "category" "AddonCategory";

-- CreateIndex
CREATE INDEX "addons_category_idx" ON "addons"("category");
