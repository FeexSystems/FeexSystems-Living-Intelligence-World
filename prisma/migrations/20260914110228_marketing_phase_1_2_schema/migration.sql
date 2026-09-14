/*
  Warnings:

  - You are about to drop the column `stripe_price_id` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_product_id` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_customer_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the `stripe_webhook_events` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `owner_id` to the `teams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('session_start', 'session_end', 'feature_used', 'error', 'conversion', 'subscription_changed');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('AI_REQUEST', 'REPOSITORY', 'PIPELINE', 'DEPLOYMENT', 'SECURITY_SCAN', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "ContentLifecycleState" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketingChannelType" AS ENUM ('WEBSITE', 'SOCIAL', 'EMAIL', 'OTHER');

-- DropIndex
DROP INDEX "plans_stripe_price_id_key";

-- DropIndex
DROP INDEX "subscriptions_stripe_subscription_id_key";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "stripe_price_id",
DROP COLUMN "stripe_product_id";

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_subscription_id";

-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "invited_by" TEXT,
ADD COLUMN     "last_active_at" TIMESTAMP(3),
ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "owner_id" TEXT NOT NULL,
ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "stripe_webhook_events";

-- CreateTable
CREATE TABLE "user_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "event_data" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_metrics" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_security_scans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_data" JSONB NOT NULL,
    "scan_type" "SecurityScanType" NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "configuration" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_security_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_shares" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "resource_type" "ResourceType" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "shared_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_activity_logs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_model_projects" (
    "id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'github',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "repo_id" BIGINT,
    "first_observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_model_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_model_evidence" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_ref" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_model_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_model_artifacts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_model_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_model_technologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "world_model_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_model_relationships" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "world_model_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_model_events" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "event_type" TEXT NOT NULL,
    "commit_sha" TEXT,
    "changed_paths" JSONB NOT NULL DEFAULT '[]',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_model_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_products" (
    "id" TEXT NOT NULL,
    "world_model_project_id" TEXT,
    "repository_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "marketing_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_features" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "technology_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "marketing_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "marketing_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_content_assets" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "state" "ContentLifecycleState" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT,

    CONSTRAINT "marketing_content_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_content_asset_topics" (
    "asset_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,

    CONSTRAINT "marketing_content_asset_topics_pkey" PRIMARY KEY ("asset_id","topic_id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaign_products" (
    "campaign_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "marketing_campaign_products_pkey" PRIMARY KEY ("campaign_id","product_id")
);

-- CreateTable
CREATE TABLE "marketing_audiences" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "marketing_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MarketingChannelType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "marketing_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_claims" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_claim_evidence" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "world_model_evidence_id" TEXT,
    "marketing_evidence_id" TEXT,

    CONSTRAINT "marketing_claim_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_evidence" (
    "id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "description" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_events" (
    "id" TEXT NOT NULL,
    "world_model_project_id" TEXT,
    "product_id" TEXT,
    "asset_id" TEXT,
    "campaign_id" TEXT,
    "channel_id" TEXT,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "marketing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_claim_about" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "feature_id" TEXT,
    "technology_id" TEXT,

    CONSTRAINT "marketing_claim_about_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_claim_audit" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_claim_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_events_user_id_idx" ON "user_events"("user_id");

-- CreateIndex
CREATE INDEX "user_events_event_type_idx" ON "user_events"("event_type");

-- CreateIndex
CREATE INDEX "user_events_timestamp_idx" ON "user_events"("timestamp");

-- CreateIndex
CREATE INDEX "analytics_metrics_metric_name_idx" ON "analytics_metrics"("metric_name");

-- CreateIndex
CREATE INDEX "analytics_metrics_timestamp_idx" ON "analytics_metrics"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_team_id_email_key" ON "team_invitations"("team_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "resource_shares_team_id_resource_type_resource_id_key" ON "resource_shares"("team_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "team_activity_logs_team_id_timestamp_idx" ON "team_activity_logs"("team_id", "timestamp");

-- CreateIndex
CREATE INDEX "team_activity_logs_action_idx" ON "team_activity_logs"("action");

-- CreateIndex
CREATE INDEX "team_activity_logs_resource_idx" ON "team_activity_logs"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "world_model_projects_repository_key" ON "world_model_projects"("repository");

-- CreateIndex
CREATE INDEX "world_model_projects_is_pinned_idx" ON "world_model_projects"("is_pinned");

-- CreateIndex
CREATE INDEX "world_model_evidence_project_id_idx" ON "world_model_evidence"("project_id");

-- CreateIndex
CREATE INDEX "world_model_artifacts_project_id_idx" ON "world_model_artifacts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "world_model_artifacts_project_id_path_key" ON "world_model_artifacts"("project_id", "path");

-- CreateIndex
CREATE UNIQUE INDEX "world_model_technologies_name_key" ON "world_model_technologies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "world_model_relationships_source_id_target_id_relation_key" ON "world_model_relationships"("source_id", "target_id", "relation");

-- CreateIndex
CREATE INDEX "world_model_events_project_id_occurred_at_idx" ON "world_model_events"("project_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_topics_name_key" ON "marketing_topics"("name");

-- CreateIndex
CREATE INDEX "marketing_claim_audit_claim_id_occurred_at_idx" ON "marketing_claim_audit"("claim_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_security_scans" ADD CONSTRAINT "recurring_security_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_shares" ADD CONSTRAINT "resource_shares_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_shares" ADD CONSTRAINT "resource_shares_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_activity_logs" ADD CONSTRAINT "team_activity_logs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_model_evidence" ADD CONSTRAINT "world_model_evidence_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "world_model_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_model_artifacts" ADD CONSTRAINT "world_model_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "world_model_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_model_events" ADD CONSTRAINT "world_model_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "world_model_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_products" ADD CONSTRAINT "marketing_products_world_model_project_id_fkey" FOREIGN KEY ("world_model_project_id") REFERENCES "world_model_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_products" ADD CONSTRAINT "marketing_products_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_features" ADD CONSTRAINT "marketing_features_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "marketing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_features" ADD CONSTRAINT "marketing_features_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "world_model_technologies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_content_assets" ADD CONSTRAINT "marketing_content_assets_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "marketing_content_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_content_asset_topics" ADD CONSTRAINT "marketing_content_asset_topics_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "marketing_content_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_content_asset_topics" ADD CONSTRAINT "marketing_content_asset_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "marketing_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaign_products" ADD CONSTRAINT "marketing_campaign_products_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaign_products" ADD CONSTRAINT "marketing_campaign_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "marketing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_audiences" ADD CONSTRAINT "marketing_audiences_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "marketing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claims" ADD CONSTRAINT "marketing_claims_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "marketing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claim_evidence" ADD CONSTRAINT "marketing_claim_evidence_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "marketing_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claim_evidence" ADD CONSTRAINT "marketing_claim_evidence_world_model_evidence_id_fkey" FOREIGN KEY ("world_model_evidence_id") REFERENCES "world_model_evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claim_evidence" ADD CONSTRAINT "marketing_claim_evidence_marketing_evidence_id_fkey" FOREIGN KEY ("marketing_evidence_id") REFERENCES "marketing_evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_world_model_project_id_fkey" FOREIGN KEY ("world_model_project_id") REFERENCES "world_model_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "marketing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "marketing_content_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "marketing_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claim_about" ADD CONSTRAINT "marketing_claim_about_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "marketing_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claim_about" ADD CONSTRAINT "marketing_claim_about_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "marketing_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_claim_audit" ADD CONSTRAINT "marketing_claim_audit_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "marketing_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
