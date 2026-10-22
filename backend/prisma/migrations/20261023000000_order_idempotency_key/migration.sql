-- AlterTable
ALTER TABLE "orders" ADD COLUMN "idempotency_key" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "orders_buyer_id_idempotency_key_key" ON "orders"("buyer_id", "idempotency_key");
