-- CreateIndex
CREATE INDEX "tenant_key_backfill_log_table_name_idx" ON "tenant_key_backfill_log"("table_name");

-- CreateIndex
CREATE INDEX "tenant_key_backfill_log_new_tenant_idx" ON "tenant_key_backfill_log"("new_tenant");

