ALTER TABLE "seller_profiles"
  ADD COLUMN "payout_provider" VARCHAR(50);

CREATE TABLE "seller_payouts" (
  "id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
  "provider_payload" JSONB,
  "processed_at" TIMESTAMP(3),
  "last_checked_at" TIMESTAMP(3),
  "check_attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_items" ADD COLUMN "payout_id" UUID;

CREATE INDEX "seller_payouts_seller_id_created_at_idx" ON "seller_payouts"("seller_id", "created_at");
CREATE INDEX "seller_payouts_reconciliation_idx" ON "seller_payouts"("status", "last_checked_at", "created_at");
CREATE INDEX "order_items_payout_id_idx" ON "order_items"("payout_id");

ALTER TABLE "seller_payouts"
  ADD CONSTRAINT "seller_payouts_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_payout_id_fkey"
  FOREIGN KEY ("payout_id") REFERENCES "seller_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
