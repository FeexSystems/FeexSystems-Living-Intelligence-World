-- Feex AI Operations — Mission 001
-- Creates the enquiry workflow tables and enums.
-- Apply with: npx prisma migrate deploy

-- CreateEnum
CREATE TYPE "OperationsEnquiryStatus" AS ENUM ('RECEIVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "OperationsEnquiryPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "operations_enquiries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "company" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "OperationsEnquiryStatus" NOT NULL DEFAULT 'RECEIVED',
    "category" TEXT,
    "priority" "OperationsEnquiryPriority" NOT NULL DEFAULT 'NORMAL',
    "confidence" DOUBLE PRECISION,
    "summary" TEXT,
    "draft_response" TEXT,
    "ai_provider" TEXT,
    "ai_model" TEXT,
    "error" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_enquiry_events" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_enquiry_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operations_enquiries_tenant_id_created_at_idx" ON "operations_enquiries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "operations_enquiries_status_idx" ON "operations_enquiries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "operations_enquiries_tenant_id_idempotency_key_key" ON "operations_enquiries"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "operations_enquiry_events_enquiry_id_created_at_idx" ON "operations_enquiry_events"("enquiry_id", "created_at");

-- AddForeignKey
ALTER TABLE "operations_enquiry_events" ADD CONSTRAINT "operations_enquiry_events_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "operations_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
