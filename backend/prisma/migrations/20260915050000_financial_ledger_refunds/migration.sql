ALTER TABLE "sale_refunds"
  ADD COLUMN "provider_amount" DECIMAL(18,2),
  ADD COLUMN "provider_currency" VARCHAR(3),
  ADD COLUMN "provider" VARCHAR(50),
  ADD COLUMN "phone" VARCHAR(20),
  ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
  ADD COLUMN "accounting_applied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "initiated_by" UUID,
  ADD COLUMN "processed_at" TIMESTAMP(3),
  ADD COLUMN "last_checked_at" TIMESTAMP(3),
  ADD COLUMN "next_check_at" TIMESTAMP(3),
  ADD COLUMN "check_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failure_code" VARCHAR(100),
  ADD COLUMN "failure_message" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "sale_refunds" AS sr
SET "provider_amount" = sr."gross_amount",
    "provider_currency" = sr."currency",
    "provider" = p."provider",
    "phone" = regexp_replace(si."phone", '[^0-9]', '', 'g'),
    "status" = 'Completed',
    "accounting_applied" = true,
    "processed_at" = sr."created_at"
FROM "payments" p
JOIN "orders" o ON o."id" = p."order_id"
JOIN "shipping_info" si ON si."order_id" = o."id"
WHERE sr."payment_id" = p."id";

ALTER TABLE "sale_refunds"
  ALTER COLUMN "provider_amount" SET NOT NULL,
  ALTER COLUMN "provider_currency" SET NOT NULL,
  ALTER COLUMN "provider" SET NOT NULL,
  ALTER COLUMN "phone" SET NOT NULL;

CREATE INDEX "sale_refunds_reconciliation_idx"
  ON "sale_refunds"("status", "next_check_at", "created_at");

CREATE UNIQUE INDEX "sale_refunds_one_pending_per_payment_idx"
  ON "sale_refunds"("payment_id")
  WHERE "status" IN ('Pending', 'Accepted', 'Processing', 'Enqueued');

ALTER TABLE "seller_payouts"
  ADD COLUMN "seller_earnings_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "debt_recovered_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "payout_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "seller_payouts" SET "seller_earnings_amount" = "source_amount";

CREATE TABLE "financial_ledger_entries" (
  "id" UUID NOT NULL,
  "idempotency_key" VARCHAR(255) NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "order_id" UUID,
  "payment_id" UUID,
  "seller_id" UUID,
  "refund_id" UUID,
  "payout_id" UUID,
  "external_reference" VARCHAR(255),
  "source" VARCHAR(20) NOT NULL DEFAULT 'Automatic',
  "admin_user_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_ledger_entries_idempotency_key_key" ON "financial_ledger_entries"("idempotency_key");
CREATE INDEX "financial_ledger_entries_seller_id_currency_created_at_idx" ON "financial_ledger_entries"("seller_id", "currency", "created_at");
CREATE INDEX "financial_ledger_entries_order_id_created_at_idx" ON "financial_ledger_entries"("order_id", "created_at");
CREATE INDEX "financial_ledger_entries_type_created_at_idx" ON "financial_ledger_entries"("type", "created_at");

CREATE TABLE "seller_debts" (
  "id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "refund_id" UUID NOT NULL,
  "original_amount" DECIMAL(12,2) NOT NULL,
  "recovered_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "remaining_amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(20) NOT NULL DEFAULT 'Open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_debts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_debts_refund_id_key" ON "seller_debts"("refund_id");
CREATE INDEX "seller_debts_seller_id_status_created_at_idx" ON "seller_debts"("seller_id", "status", "created_at");

CREATE TABLE "seller_debt_recoveries" (
  "id" UUID NOT NULL,
  "debt_id" UUID NOT NULL,
  "payout_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_debt_recoveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seller_debt_recoveries_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "seller_debts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "seller_debt_recoveries_debt_id_payout_id_key" ON "seller_debt_recoveries"("debt_id", "payout_id");
CREATE INDEX "seller_debt_recoveries_payout_id_idx" ON "seller_debt_recoveries"("payout_id");

CREATE TABLE "exchange_rates" (
  "id" UUID NOT NULL,
  "source_currency" VARCHAR(3) NOT NULL,
  "destination_currency" VARCHAR(3) NOT NULL,
  "rate" DECIMAL(18,6) NOT NULL,
  "effective_at" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exchange_rates_source_currency_destination_currency_active_effective_at_idx"
  ON "exchange_rates"("source_currency", "destination_currency", "active", "effective_at");

CREATE TABLE "financial_adjustment_audits" (
  "id" UUID NOT NULL,
  "entity_type" VARCHAR(40) NOT NULL,
  "entity_id" UUID NOT NULL,
  "field" VARCHAR(50) NOT NULL,
  "previous_value" DECIMAL(18,2) NOT NULL,
  "new_value" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "source" VARCHAR(20) NOT NULL DEFAULT 'Admin',
  "admin_user_id" UUID,
  "external_reference" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_adjustment_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_adjustment_audits_entity_type_entity_id_created_at_idx"
  ON "financial_adjustment_audits"("entity_type", "entity_id", "created_at");
CREATE UNIQUE INDEX "financial_adjustment_audits_external_reference_key"
  ON "financial_adjustment_audits"("external_reference");

-- Seed reconstructable accounting entries for existing final payments.
INSERT INTO "financial_ledger_entries" ("id", "idempotency_key", "type", "amount", "currency", "order_id", "payment_id", "source", "created_at")
SELECT gen_random_uuid(), 'payment:' || p."id" || ':sale', 'SALE', p."gross_sales_amount", p."accounting_currency", p."order_id", p."id", 'Migration', p."created_at"
FROM "payments" p WHERE p."payment_status" = 'Paid'
ON CONFLICT ("idempotency_key") DO NOTHING;

INSERT INTO "financial_ledger_entries" ("id", "idempotency_key", "type", "amount", "currency", "order_id", "payment_id", "source", "created_at")
SELECT gen_random_uuid(), 'payment:' || p."id" || ':commission', 'PLATFORM_COMMISSION', p."gross_commission", p."accounting_currency", p."order_id", p."id", 'Migration', p."created_at"
FROM "payments" p WHERE p."payment_status" = 'Paid'
ON CONFLICT ("idempotency_key") DO NOTHING;

INSERT INTO "financial_ledger_entries" ("id", "idempotency_key", "type", "amount", "currency", "order_id", "payment_id", "seller_id", "source", "created_at")
SELECT gen_random_uuid(), 'item:' || i."id" || ':seller-payable', 'SELLER_PAYABLE', i."seller_net_amount", p."accounting_currency", i."order_id", p."id", i."seller_id", 'Migration', p."created_at"
FROM "order_items" i JOIN "payments" p ON p."order_id" = i."order_id"
WHERE p."payment_status" = 'Paid' AND i."seller_id" IS NOT NULL
ON CONFLICT ("idempotency_key") DO NOTHING;
