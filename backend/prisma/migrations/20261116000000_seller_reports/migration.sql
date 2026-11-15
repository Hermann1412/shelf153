-- CreateTable
CREATE TABLE "seller_reports" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "data" JSONB NOT NULL,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by" UUID,

    CONSTRAINT "seller_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_reports_seller_id_period_key" ON "seller_reports"("seller_id", "period");

-- AddForeignKey
ALTER TABLE "seller_reports" ADD CONSTRAINT "seller_reports_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
