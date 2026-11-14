// Copies the catalog from one database to another: customer and seller accounts, seller stores,
// products and site settings. Admin accounts are not copied (create them with create-admin.mjs),
// and nothing already present in the target is overwritten, so the script can be run again safely.
//
// Usage (from the backend folder). Source = DATABASE_URL in backend/.env (the local database):
//   PowerShell: $env:TARGET_DATABASE_URL="postgresql://..."; node scripts/copy-catalog.mjs
//   Bash:       TARGET_DATABASE_URL="postgresql://..." node scripts/copy-catalog.mjs
// Add --dry-run to only print what would be copied.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
const dryRun = process.argv.includes("--dry-run");
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return "?"; } };

if (!sourceUrl || !targetUrl) {
  console.error("Set TARGET_DATABASE_URL (and DATABASE_URL or SOURCE_DATABASE_URL for the source).");
  process.exit(1);
}
if (hostOf(sourceUrl) === hostOf(targetUrl) && new URL(sourceUrl).pathname === new URL(targetUrl).pathname) {
  console.error("Source and target are the same database.");
  process.exit(1);
}

const connect = (url) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const source = connect(sourceUrl);
const target = connect(targetUrl);

try {
  console.log(`From ${hostOf(sourceUrl)} to ${hostOf(targetUrl)}${dryRun ? " (dry run)" : ""}`);

  // Accounts that own the catalog. A target account with the same email is kept as is.
  const users = await source.user.findMany({ where: { role: { in: ["User", "Seller"] } } });
  const existingEmails = new Set(
    (await target.user.findMany({ where: { email: { in: users.map((u) => u.email) } }, select: { email: true } }))
      .map((u) => u.email),
  );
  const newUsers = users.filter((u) => !existingEmails.has(u.email));
  const copiedIds = new Set(newUsers.map((u) => u.id));

  const profiles = (await source.sellerProfile.findMany()).filter((p) => copiedIds.has(p.user_id));
  const products = (await source.product.findMany()).filter((p) => copiedIds.has(p.created_by));
  const settings = await source.siteSettings.findUnique({ where: { id: "singleton" } });

  console.log(`accounts: ${newUsers.length} to copy, ${existingEmails.size} already in target`);
  console.log(`stores: ${profiles.length}, products: ${products.length}, site settings: ${settings ? 1 : 0}`);
  if (dryRun) process.exit(0);

  await target.$transaction(async (tx) => {
    // Products keep a rating but not their reviews, so start them unrated in the target.
    await tx.user.createMany({ data: newUsers, skipDuplicates: true });
    await tx.sellerProfile.createMany({ data: profiles, skipDuplicates: true });
    await tx.product.createMany({ data: products.map((p) => ({ ...p, ratings: 0 })), skipDuplicates: true });
    if (settings) {
      const { updated_at: _updatedAt, ...values } = settings;
      const current = await tx.siteSettings.findUnique({ where: { id: "singleton" } });
      // Only fill settings the target has not set yet.
      const missing = Object.fromEntries(Object.entries(values).filter(([key, value]) => value && !current?.[key]));
      await tx.siteSettings.upsert({ where: { id: "singleton" }, update: missing, create: values });
    }
  }, { timeout: 60000 });

  const [userCount, productCount] = await Promise.all([target.user.count(), target.product.count()]);
  console.log(`Done. Target now has ${userCount} accounts and ${productCount} products.`);
} catch (error) {
  console.error("Copy failed, nothing was changed:", error.code || "", error.message.trim());
  process.exitCode = 1;
} finally {
  await source.$disconnect();
  await target.$disconnect();
}
