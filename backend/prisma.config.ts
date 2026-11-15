import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI commands (migrate deploy, etc.) take an advisory lock, which connection poolers such as
// Neon's "-pooler" endpoint do not support reliably. When DIRECT_DATABASE_URL is set (the direct,
// non-pooled address), the CLI uses it; the running app keeps using DATABASE_URL (see database/db.js).
const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required.");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
