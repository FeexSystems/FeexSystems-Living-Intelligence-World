-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentLifecycleState" ADD VALUE 'IDEA';
ALTER TYPE "ContentLifecycleState" ADD VALUE 'RESEARCH';
ALTER TYPE "ContentLifecycleState" ADD VALUE 'BRIEF';
ALTER TYPE "ContentLifecycleState" ADD VALUE 'REVIEW';
ALTER TYPE "ContentLifecycleState" ADD VALUE 'APPROVED';
ALTER TYPE "ContentLifecycleState" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "marketing_campaigns" ADD COLUMN     "beefree_design_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "template_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "property_units" ALTER COLUMN "rent_amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "tenancies" ALTER COLUMN "monthly_rent" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "endpoint" TEXT,
    "user_id" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL DEFAULT 'error',

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_designs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL',
    "beefree_design_id" TEXT,
    "template_id" TEXT,
    "beefree_json" JSONB NOT NULL DEFAULT '{}',
    "html_content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaign_versions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "design_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "brief" JSONB DEFAULT '{}',
    "beefree_json" JSONB NOT NULL DEFAULT '{}',
    "html_content" TEXT,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_campaign_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_experiments" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "decision" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_experiment_variants" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "marketing_experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_observations" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "mcpTools" JSONB[],
    "a2aCapabilities" TEXT[],
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expression" TEXT NOT NULL,
    "dimensions" JSONB[],
    "filters" JSONB[],
    "cacheTTL" INTEGER NOT NULL DEFAULT 3600,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "metrics" JSONB[],
    "audience" JSONB,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_interactions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "userId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "confidence" DOUBLE PRECISION,
    "evidenceUsed" JSONB NOT NULL,
    "mcpToolsCalled" JSONB NOT NULL,
    "a2aMessages" JSONB NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_evaluations" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "evaluator" TEXT NOT NULL,
    "accuracyScore" DOUBLE PRECISION,
    "completenessScore" DOUBLE PRECISION,
    "helpfulnessScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "groundTruth" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs"("timestamp");

-- CreateIndex
CREATE INDEX "error_logs_type_idx" ON "error_logs"("type");

-- CreateIndex
CREATE INDEX "error_logs_user_id_idx" ON "error_logs"("user_id");

-- CreateIndex
CREATE INDEX "error_logs_endpoint_idx" ON "error_logs"("endpoint");

-- CreateIndex
CREATE INDEX "marketing_designs_campaign_id_idx" ON "marketing_designs"("campaign_id");

-- CreateIndex
CREATE INDEX "marketing_campaign_versions_campaign_id_version_idx" ON "marketing_campaign_versions"("campaign_id", "version" DESC);

-- CreateIndex
CREATE INDEX "marketing_observations_variant_id_metric_occurred_at_idx" ON "marketing_observations"("variant_id", "metric", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "advisory_requests_status_idx" ON "advisory_requests"("status");

-- CreateIndex
CREATE INDEX "ai_requests_user_id_idx" ON "ai_requests"("user_id");

-- CreateIndex
CREATE INDEX "ai_requests_status_idx" ON "ai_requests"("status");

-- CreateIndex
CREATE INDEX "ai_requests_created_at_idx" ON "ai_requests"("created_at");

-- CreateIndex
CREATE INDEX "deployments_repository_id_idx" ON "deployments"("repository_id");

-- CreateIndex
CREATE INDEX "deployments_pipeline_id_idx" ON "deployments"("pipeline_id");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "pipelines_repository_id_idx" ON "pipelines"("repository_id");

-- CreateIndex
CREATE INDEX "recurring_security_scans_user_id_idx" ON "recurring_security_scans"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "repositories_user_id_idx" ON "repositories"("user_id");

-- CreateIndex
CREATE INDEX "resource_shares_workspace_id_idx" ON "resource_shares"("workspace_id");

-- CreateIndex
CREATE INDEX "security_scans_user_id_idx" ON "security_scans"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "team_invitations_team_id_idx" ON "team_invitations"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "teams_owner_id_idx" ON "teams"("owner_id");

-- CreateIndex
CREATE INDEX "workspaces_team_id_idx" ON "workspaces"("team_id");

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_designs" ADD CONSTRAINT "marketing_designs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaign_versions" ADD CONSTRAINT "marketing_campaign_versions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaign_versions" ADD CONSTRAINT "marketing_campaign_versions_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "marketing_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_experiments" ADD CONSTRAINT "marketing_experiments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_experiment_variants" ADD CONSTRAINT "marketing_experiment_variants_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "marketing_experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_observations" ADD CONSTRAINT "marketing_observations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "marketing_experiment_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_interactions" ADD CONSTRAINT "agent_interactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "analytics_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_evaluations" ADD CONSTRAINT "agent_evaluations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "analytics_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

