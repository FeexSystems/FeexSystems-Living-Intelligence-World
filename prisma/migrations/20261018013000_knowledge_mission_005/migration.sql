-- Mission 005 — Knowledge & Document AI
-- Additive: creates new tables/enums only.
-- Apply with: npx prisma migrate deploy

-- CreateEnum
CREATE TYPE "KnowledgeDocumentStatus" AS ENUM ('PROCESSING', 'READY', 'EXTRACTION_UNAVAILABLE', 'FAILED');

-- CreateEnum
CREATE TYPE "KnowledgeExtractionMethod" AS ENUM ('NATIVE_TEXT', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "storage_key" TEXT,
    "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "extraction_method" "KnowledgeExtractionMethod" NOT NULL DEFAULT 'NATIVE_TEXT',
    "page_count" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "page" INTEGER,
    "section" TEXT,
    "content" TEXT NOT NULL,
    "char_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_documents_team_id_created_at_idx" ON "knowledge_documents"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "knowledge_documents_content_hash_idx" ON "knowledge_documents"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_document_chunks_document_id_ordinal_key" ON "knowledge_document_chunks"("document_id", "ordinal");

-- CreateIndex
CREATE INDEX "knowledge_document_chunks_document_id_idx" ON "knowledge_document_chunks"("document_id");

-- AddForeignKey
ALTER TABLE "knowledge_document_chunks" ADD CONSTRAINT "knowledge_document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
