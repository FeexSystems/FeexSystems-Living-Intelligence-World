-- CreateEnum: WorldLifecycleState
CREATE TYPE "WorldLifecycleState" AS ENUM ('PROPOSED', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'EOL');

-- CreateEnum: WorldVerificationVerdict
CREATE TYPE "WorldVerificationVerdict" AS ENUM ('NOT_VERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum: WorldSourceType
CREATE TYPE "WorldSourceType" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'FLOWZONE', 'SELF_DECLARED');

-- CreateEnum: WorldStatus
CREATE TYPE "WorldStatus" AS ENUM ('ACTIVE', 'DORMANT', 'ARCHIVED', 'TERMINATED');

-- AlterTable
ALTER TABLE "world_model_projects" ADD COLUMN     "world_category" TEXT,
ADD COLUMN     "world_modality" TEXT,
ADD COLUMN     "world_status" TEXT,
ADD COLUMN     "world_lifecycle" "WorldLifecycleState",
ADD COLUMN     "world_year" INTEGER,
ADD COLUMN     "world_label" TEXT,
ADD COLUMN     "world_role" TEXT,
ADD COLUMN     "world_owner_org" TEXT,
ADD COLUMN     "world_licenses" TEXT,
ADD COLUMN     "verification_verdict" "WorldVerificationVerdict" NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN     "verification_note" TEXT,
ADD COLUMN     "verification_last_seen" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "world_model_projects_world_status_idx" ON "world_model_projects"("world_status");

-- CreateIndex
CREATE INDEX "world_model_projects_world_category_idx" ON "world_model_projects"("world_category");

-- CreateIndex
CREATE INDEX "world_model_projects_world_lifecycle_idx" ON "world_model_projects"("world_lifecycle");

-- CreateIndex
CREATE INDEX "world_model_projects_verification_verdict_idx" ON "world_model_projects"("verification_verdict");