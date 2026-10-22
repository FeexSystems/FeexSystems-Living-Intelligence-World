-- Mission 004 — RentAll SmartOps & FarmPlug AI
-- Additive: creates new tables/enums only; no existing table is altered.
-- Apply with: npx prisma migrate deploy

-- ============================================================================
-- RentAll SmartOps — Rental & property operations
-- ============================================================================

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'VACANT');

-- CreateEnum
CREATE TYPE "PropertyUnitStatus" AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TenancyStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'PEST_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "owner_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_units" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_number" TEXT NOT NULL,
    "status" "PropertyUnitStatus" NOT NULL DEFAULT 'VACANT',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "rent_amount" DECIMAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenancies" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "tenant_user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "TenancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthly_rent" DECIMAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "tenancy_id" TEXT,
    "reported_by_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MaintenanceCategory" NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "ai_provider" TEXT,
    "ai_model" TEXT,
    "ai_recommendation" TEXT,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "property_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "property_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "properties_team_id_idx" ON "properties"("team_id");

-- CreateIndex
CREATE INDEX "property_units_property_id_idx" ON "property_units"("property_id");

-- CreateIndex
CREATE INDEX "tenancies_property_id_idx" ON "tenancies"("property_id");

-- CreateIndex
CREATE INDEX "tenancies_unit_id_idx" ON "tenancies"("unit_id");

-- CreateIndex
CREATE INDEX "tenancies_tenant_user_id_idx" ON "tenancies"("tenant_user_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_property_id_idx" ON "maintenance_requests"("property_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_unit_id_idx" ON "maintenance_requests"("unit_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_tenancy_id_idx" ON "maintenance_requests"("tenancy_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_reported_by_user_id_idx" ON "maintenance_requests"("reported_by_user_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");
-- ============================================================================
-- FarmPlug AI — Agricultural knowledge & decision support
-- ============================================================================

-- CreateEnum
CREATE TYPE FarmStatus AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE CropPlotStatus AS ENUM ('PLANTED', 'GROWING', 'HARVESTED', 'FALLOW');

-- CreateEnum
CREATE TYPE ObservationType AS ENUM ('PEST', 'DISEASE', 'WEATHER', 'GROWTH', 'SOIL', 'OTHER');

-- CreateEnum
CREATE TYPE ObservationSeverity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE AdvisoryRequestStatus AS ENUM ('PENDING', 'REVIEWED', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE farms (
    id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    size TEXT,
    primary_crop TEXT,
    status FarmStatus NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT farms_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE crop_plots (
    id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    name TEXT NOT NULL,
    crop_type TEXT,
    planted_at TIMESTAMP(3),
    area TEXT,
    status CropPlotStatus NOT NULL DEFAULT 'PLANTED',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT crop_plots_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE farm_observations (
    id TEXT NOT NULL,
    plot_id TEXT NOT NULL,
    reported_by_user_id TEXT NOT NULL,
    observation_type ObservationType NOT NULL,
    description TEXT NOT NULL,
    severity ObservationSeverity NOT NULL DEFAULT 'MEDIUM',
    observed_at TIMESTAMP(3) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT farm_observations_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE advisory_requests (
    id TEXT NOT NULL,
    plot_id TEXT NOT NULL,
    reported_by_user_id TEXT NOT NULL,
    question TEXT NOT NULL,
    observations TEXT,
    advisory_text TEXT,
    ai_provider TEXT,
    ai_model TEXT,
    confidence DOUBLE PRECISION,
    status AdvisoryRequestStatus NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT advisory_requests_pkey PRIMARY KEY (id)
);

-- AddForeignKey
ALTER TABLE crop_plots ADD CONSTRAINT crop_plots_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE farm_observations ADD CONSTRAINT farm_observations_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES crop_plots(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE advisory_requests ADD CONSTRAINT advisory_requests_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES crop_plots(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX farms_team_id_idx ON farms(team_id);

-- CreateIndex
CREATE INDEX crop_plots_farm_id_idx ON crop_plots(farm_id);

-- CreateIndex
CREATE INDEX farm_observations_plot_id_idx ON farm_observations(plot_id);

-- CreateIndex
CREATE INDEX farm_observations_reported_by_user_id_idx ON farm_observations(reported_by_user_id);

-- CreateIndex
CREATE INDEX farm_observations_observed_at_idx ON farm_observations(observed_at);

-- CreateIndex
CREATE INDEX advisory_requests_plot_id_idx ON advisory_requests(plot_id);

-- CreateIndex
CREATE INDEX advisory_requests_reported_by_user_id_idx ON advisory_requests(reported_by_user_id);

-- CreateIndex
CREATE INDEX advisory_requests_status_idx ON advisory_requests(status);
