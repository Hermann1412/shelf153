ALTER TABLE "payments"
  ADD COLUMN "amount" DECIMAL(12,2),
  ADD COLUMN "source_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1;

UPDATE "payments" AS payment
SET "amount" = orders."total_price"
FROM "orders" AS orders
WHERE payment."order_id" = orders."id"
  AND payment."amount" IS NULL;

ALTER TABLE "payments"
  ALTER COLUMN "amount" SET NOT NULL;
