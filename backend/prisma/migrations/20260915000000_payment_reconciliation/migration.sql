ALTER TABLE "payments"
  ADD COLUMN "last_checked_at" TIMESTAMP(3),
  ADD COLUMN "check_attempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "payments_reconciliation_idx"
  ON "payments" ("payment_status", "last_checked_at", "created_at");
