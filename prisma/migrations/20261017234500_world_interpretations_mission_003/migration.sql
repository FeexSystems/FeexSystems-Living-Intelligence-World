-- Mission 003 — AI interpretations of the World Model.
-- Additive: creates one new table. No canonical table is altered.
-- Apply with: npx prisma migrate deploy

-- CreateTable
CREATE TABLE "world_model_interpretations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "claims" JSONB NOT NULL DEFAULT '[]',
    "limitations" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "correlation_id" TEXT,
    "supported_claim_count" INTEGER NOT NULL DEFAULT 0,
    "unsupported_claim_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_model_interpretations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "world_model_interpretations_project_id_created_at_idx" ON "world_model_interpretations"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "world_model_interpretations" ADD CONSTRAINT "world_model_interpretations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "world_model_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
