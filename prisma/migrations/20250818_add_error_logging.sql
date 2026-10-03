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

-- CreateIndex
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs"("timestamp");

-- CreateIndex
CREATE INDEX "error_logs_type_idx" ON "error_logs"("type");

-- CreateIndex
CREATE INDEX "error_logs_user_id_idx" ON "error_logs"("user_id");

-- CreateIndex
CREATE INDEX "error_logs_endpoint_idx" ON "error_logs"("endpoint");

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
