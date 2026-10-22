ALTER TABLE "seller_payouts"
  ADD COLUMN "source_amount" DECIMAL(12,2),
  ADD COLUMN "source_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1;

UPDATE "seller_payouts"
SET "source_amount" = "amount"
WHERE "source_amount" IS NULL;

ALTER TABLE "seller_payouts"
  ALTER COLUMN "source_amount" SET NOT NULL;
