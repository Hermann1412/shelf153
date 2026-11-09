-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN "slug" VARCHAR(80);

-- Backfill existing stores: slug from the store name, numbered when two names collide
-- or when the name matches a reserved word.
WITH base AS (
  SELECT
    id,
    COALESCE(NULLIF(left(trim(both '-' from lower(regexp_replace(store_name, '[^a-zA-Z0-9]+', '-', 'g'))), 60), ''), 'boutique') AS slug_base,
    created_at
  FROM "seller_profiles"
), numbered AS (
  SELECT id, slug_base, ROW_NUMBER() OVER (PARTITION BY slug_base ORDER BY created_at, id) AS n
  FROM base
)
UPDATE "seller_profiles" AS profile
SET slug = CASE
  WHEN numbered.n = 1 AND numbered.slug_base NOT IN ('shelf153', 'admin', 'login', 'platform') THEN numbered.slug_base
  ELSE numbered.slug_base || '-' || numbered.n
END
FROM numbered
WHERE numbered.id = profile.id;

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_slug_key" ON "seller_profiles"("slug");
