ALTER TABLE "payments"
  ALTER COLUMN "payment_type" SET DEFAULT 'pawaPay',
  ADD COLUMN "provider" VARCHAR(50) NOT NULL DEFAULT 'AIRTEL_COD',
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'USD';

UPDATE "payments" SET "payment_type" = 'pawaPay' WHERE "payment_type" = 'Airtel Money';
