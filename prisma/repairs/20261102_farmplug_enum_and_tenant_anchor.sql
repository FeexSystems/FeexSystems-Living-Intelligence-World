-- ============================================================================
-- Repair: FarmPlug enum drift + tenant anchor columns + missing @map fields
-- ============================================================================
-- Applied manually on 2026-11-02 because `prisma migrate diff` proposed a
-- destructive superset (16 business columns dropped). This script contains ONLY
-- the changes required to make the live database match schema.prisma.
--
-- SAFETY: every table modified here was verified to hold 0 rows beforehand.
--
-- NOTE: This file is documentation of what was executed. `_prisma_migrations`
-- was NOT updated, because editing an already-applied migration is unsafe and
-- creating a *new* Prisma migration requires a clean `migrate diff`, which the
-- unresolved column-level drift blocks (see docs/PRISMA-ENUM-DRIFT.md).
-- ============================================================================
BEGIN;
-- 1. Detach the lowercase enum columns (all five tables empty) ---------------
ALTER TABLE "crop_plots" DROP COLUMN IF EXISTS "status";
ALTER TABLE "farm_observations" DROP COLUMN IF EXISTS "observation_type";
ALTER TABLE "farm_observations" DROP COLUMN IF EXISTS "severity";
ALTER TABLE "advisory_requests" DROP COLUMN IF EXISTS "status";
ALTER TABLE "farms" DROP COLUMN IF EXISTS "status";
-- 2. Drop the lowercase enum types ------------------------------------------
DROP TYPE IF EXISTS "farmstatus";
DROP TYPE IF EXISTS "cropplotstatus";
DROP TYPE IF EXISTS "observationseverity";
DROP TYPE IF EXISTS "observationtype";
DROP TYPE IF EXISTS "advisoryrequeststatus";
-- 3. Recreate as schema-declared PascalCase types ---------------------------
CREATE TYPE "FarmStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CropPlotStatus" AS ENUM ('PLANTED', 'GROWING', 'HARVESTED', 'FALLOW');
CREATE TYPE "ObservationType" AS ENUM (
  'PEST',
  'DISEASE',
  'WEATHER',
  'GROWTH',
  'SOIL',
  'OTHER'
);
CREATE TYPE "ObservationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AdvisoryRequestStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPLIED', 'REJECTED');
-- 4. Re-attach columns with correct types + defaults -------------------------
ALTER TABLE "farms"
ADD COLUMN "status" "FarmStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "crop_plots"
ADD COLUMN "status" "CropPlotStatus" NOT NULL DEFAULT 'PLANTED';
ALTER TABLE "farm_observations"
ADD COLUMN "observation_type" "ObservationType" NOT NULL;
ALTER TABLE "farm_observations"
ADD COLUMN "severity" "ObservationSeverity" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "advisory_requests"
ADD COLUMN "status" "AdvisoryRequestStatus" NOT NULL DEFAULT 'PENDING';
-- 5. Tenant-key migration anchor (D-3) --------------------------------------
ALTER TABLE "operations_enquiries"
ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "farms"
ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "knowledge_documents"
ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
CREATE INDEX IF NOT EXISTS "operations_enquiries_created_by_user_id_idx" ON "operations_enquiries"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "properties_created_by_user_id_idx" ON "properties"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "farms_created_by_user_id_idx" ON "farms"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "knowledge_documents_created_by_user_id_idx" ON "knowledge_documents"("created_by_user_id");
COMMIT;
-- ============================================================================
-- Schema-side changes that accompanied this script (prisma/schema.prisma):
--   Farm.primaryCrop              -> @map("primary_crop")
--   CropPlot.cropType             -> @map("crop_type")
--   CropPlot.plantedAt            -> @map("planted_at")
--   FarmObservation.observationType -> @map("observation_type")
--   AdvisoryRequest.advisoryText  -> @map("advisory_text")
--   AdvisoryRequest.aiProvider    -> @map("ai_provider")
--   AdvisoryRequest.aiModel       -> @map("ai_model")
--   MaintenanceRequest.aiProvider / aiModel / aiRecommendation -> @map(...)
--   PropertyUnit.unitNumber       -> @map("unit_number")
--   PropertyUnit.rentAmount       -> @map("rent_amount")
--   Tenancy.monthlyRent           -> @map("monthly_rent")
--   KnowledgeDocument.extractionMethod -> @map("extraction_method")
--
-- These were annotations only: the live columns were already snake_case, so
-- no DDL was required for them. Before the fix, Prisma emitted camelCase SQL
-- against a snake_case database and every affected query failed.
-- ============================================================================