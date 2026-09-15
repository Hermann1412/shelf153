ALTER TABLE "order_items"
  ADD COLUMN "gross_amount" DECIMAL(12,2),
  ADD COLUMN "commission_rate" DECIMAL(7,6),
  ADD COLUMN "platform_commission" DECIMAL(12,2),
  ADD COLUMN "seller_net_amount" DECIMAL(12,2),
  ADD COLUMN "refunded_gross_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refunded_commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refunded_seller_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "order_items"
SET
  "gross_amount" = ROUND("price" * "quantity", 2),
  "commission_rate" = 0.07,
  "platform_commission" = ROUND(("price" * "quantity") * 0.07, 2),
  "seller_net_amount" = ROUND("price" * "quantity", 2) - ROUND(("price" * "quantity") * 0.07, 2);

ALTER TABLE "order_items"
  ALTER COLUMN "gross_amount" SET NOT NULL,
  ALTER COLUMN "commission_rate" SET NOT NULL,
  ALTER COLUMN "platform_commission" SET NOT NULL,
  ALTER COLUMN "seller_net_amount" SET NOT NULL;

ALTER TABLE "payments"
  ADD COLUMN "accounting_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN "commission_rate" DECIMAL(7,6),
  ADD COLUMN "gross_sales_amount" DECIMAL(12,2),
  ADD COLUMN "gross_commission" DECIMAL(12,2),
  ADD COLUMN "payment_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "payment_fee_refunded" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "platform_net_revenue" DECIMAL(12,2),
  ADD COLUMN "seller_net_amount" DECIMAL(12,2),
  ADD COLUMN "refunded_gross_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refunded_commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refunded_seller_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "accounting_status" VARCHAR(20) NOT NULL DEFAULT 'Pending';

UPDATE "payments" AS payment
SET
  "commission_rate" = 0.07,
  "gross_sales_amount" = totals.gross_sales,
  "gross_commission" = totals.commission,
  "platform_net_revenue" = totals.commission,
  "seller_net_amount" = totals.seller_net,
  "accounting_status" = CASE
    WHEN payment."payment_status" = 'Paid' THEN 'Final'
    WHEN payment."payment_status" = 'Failed' THEN 'Void'
    ELSE 'Pending'
  END
FROM (
  SELECT
    "order_id",
    SUM("gross_amount") AS gross_sales,
    SUM("platform_commission") AS commission,
    SUM("seller_net_amount") AS seller_net
  FROM "order_items"
  GROUP BY "order_id"
) AS totals
WHERE payment."order_id" = totals."order_id";

UPDATE "payments"
SET
  "commission_rate" = COALESCE("commission_rate", 0.07),
  "gross_sales_amount" = COALESCE("gross_sales_amount", 0),
  "gross_commission" = COALESCE("gross_commission", 0),
  "platform_net_revenue" = COALESCE("platform_net_revenue", 0),
  "seller_net_amount" = COALESCE("seller_net_amount", 0)
WHERE "commission_rate" IS NULL
   OR "gross_sales_amount" IS NULL
   OR "gross_commission" IS NULL
   OR "platform_net_revenue" IS NULL
   OR "seller_net_amount" IS NULL;

ALTER TABLE "payments"
  ALTER COLUMN "commission_rate" SET NOT NULL,
  ALTER COLUMN "gross_sales_amount" SET NOT NULL,
  ALTER COLUMN "gross_commission" SET NOT NULL,
  ALTER COLUMN "platform_net_revenue" SET NOT NULL,
  ALTER COLUMN "seller_net_amount" SET NOT NULL;

CREATE TABLE "sale_refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "external_reference" VARCHAR(255) NOT NULL,
  "payment_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "gross_amount" DECIMAL(12,2) NOT NULL,
  "commission_amount" DECIMAL(12,2) NOT NULL,
  "seller_amount" DECIMAL(12,2) NOT NULL,
  "payment_fee_refund" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "platform_net_adjustment" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "provider_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sale_refunds_external_reference_key" ON "sale_refunds"("external_reference");
CREATE INDEX "sale_refunds_payment_id_created_at_idx" ON "sale_refunds"("payment_id", "created_at");
CREATE INDEX "sale_refunds_order_item_id_created_at_idx" ON "sale_refunds"("order_item_id", "created_at");

ALTER TABLE "sale_refunds"
  ADD CONSTRAINT "sale_refunds_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sale_refunds"
  ADD CONSTRAINT "sale_refunds_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_financial_amounts_check" CHECK (
  "gross_amount" >= 0 AND "platform_commission" >= 0 AND "seller_net_amount" >= 0
  AND "refunded_gross_amount" >= 0 AND "refunded_gross_amount" <= "gross_amount"
);

ALTER TABLE "payments" ADD CONSTRAINT "payments_financial_amounts_check" CHECK (
  "gross_sales_amount" >= 0 AND "gross_commission" >= 0 AND "seller_net_amount" >= 0
  AND "payment_fee" >= 0 AND "payment_fee_refunded" >= 0
  AND "refunded_gross_amount" >= 0 AND "refunded_gross_amount" <= "gross_sales_amount"
);
