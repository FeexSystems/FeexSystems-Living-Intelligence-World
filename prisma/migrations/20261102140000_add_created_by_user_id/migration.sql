-- AlterTable
ALTER TABLE "operations_enquiries" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "knowledge_documents" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operations_enquiries_created_by_user_id_idx" ON "operations_enquiries"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "properties_created_by_user_id_idx" ON "properties"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "farms_created_by_user_id_idx" ON "farms"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "knowledge_documents_created_by_user_id_idx" ON "knowledge_documents"("created_by_user_id");