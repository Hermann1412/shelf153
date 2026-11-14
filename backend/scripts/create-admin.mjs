// Creates an admin account, or promotes an existing account to admin and resets its password.
//
// Usage (from the backend folder):
//   node scripts/create-admin.mjs <email> <password> [name]
// The target database is DATABASE_URL from backend/.env. To create the admin on another database
// (e.g. production), set it for this one command:
//   PowerShell: $env:DATABASE_URL="postgresql://..."; node scripts/create-admin.mjs admin@example.com "S3cret-pass"
//   Bash:       DATABASE_URL="postgresql://..." node scripts/create-admin.mjs admin@example.com "S3cret-pass"
import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../database/db.js";
import { isValidPassword, PASSWORD_RULE_MESSAGE } from "../utils/passwordPolicy.js";

const [rawEmail, password, name = "Admin"] = process.argv.slice(2);
const email = String(rawEmail || "").trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [name]");
  process.exit(1);
}
if (!isValidPassword(password)) {
  console.error(PASSWORD_RULE_MESSAGE);
  process.exit(1);
}

try {
  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  // password_changed_at signs out any session that used the previous password.
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { role: "Admin", password: hashed, password_changed_at: new Date() },
        select: { email: true, role: true },
      })
    : await prisma.user.create({
        data: { name: name.trim(), email, password: hashed, role: "Admin" },
        select: { email: true, role: true },
      });
  const host = (() => { try { return new URL(process.env.DATABASE_URL).hostname; } catch { return "?"; } })();
  console.log(`${existing ? "Promoted" : "Created"} ${user.role}: ${user.email} (database host: ${host})`);
} catch (error) {
  console.error("Failed:", error.code || "", error.message.trim());
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
