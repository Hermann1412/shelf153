// One-time migration: import Kami Luxury's data from the old MySQL database
// (shelf153_ecommerce, via XAMPP) into the new Postgres/Prisma database.
// Product/logo images are re-uploaded to Cloudinary since the old local
// static-file route (/public) no longer exists.
//
// Usage: node scripts/migrate-legacy-mysql-data.mjs
// Reads DATABASE_URL, CLOUDINARY_* and LEGACY_MYSQL_* from backend/.env by default.
// To target a different database (e.g. Render production), override on
// the command line: DATABASE_URL="postgresql://..." node scripts/migrate-legacy-mysql-data.mjs

import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import mysql from "mysql2/promise";
import { v2 as cloudinary } from "cloudinary";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Render's external Postgres endpoint requires SSL; local dev Postgres doesn't support it.
const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
});
const prisma = new PrismaClient({ adapter });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, "..", "public", "product-images");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
});

function localFilePathFromOldUrl(oldUrl) {
  const filename = oldUrl.split("/").pop();
  return path.join(IMAGES_DIR, filename);
}

async function uploadToCloudinary(localPath, folder, width) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder,
    width,
    crop: "scale",
  });
  return { url: result.secure_url, public_id: result.public_id };
}

async function main() {
  if (process.env.LEGACY_MYSQL_PASSWORD === undefined) {
    throw new Error("Set LEGACY_MYSQL_PASSWORD (and optionally LEGACY_MYSQL_HOST/USER/DATABASE) in backend/.env.");
  }
  const legacy = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "localhost",
    user: process.env.LEGACY_MYSQL_USER || "root",
    password: process.env.LEGACY_MYSQL_PASSWORD,
    database: process.env.LEGACY_MYSQL_DATABASE || "shelf153_ecommerce",
  });

  console.log("Connected to legacy MySQL database.");

  const [users] = await legacy.query("SELECT * FROM users");
  const [sellerProfiles] = await legacy.query("SELECT * FROM seller_profiles");
  const [products] = await legacy.query("SELECT * FROM products");

  console.log(`Found ${users.length} users, ${sellerProfiles.length} seller profile(s), ${products.length} products.`);

  // Maps a legacy user id to whichever id actually ends up used in this
  // database (the legacy id itself, or a pre-existing account's real id
  // if one already exists with the same email).
  const userIdMap = {};

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`User ${u.email} already exists (id ${existing.id}) — skipping, will link to it.`);
      userIdMap[u.id] = existing.id;
      continue;
    }
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        avatar: u.avatar ? JSON.parse(u.avatar) : null,
        reset_password_token: u.reset_password_token,
        reset_password_expire: u.reset_password_expire,
        created_at: u.created_at,
      },
    });
    userIdMap[u.id] = u.id;
  }
  console.log(`Imported ${users.length} users.`);

  for (const sp of sellerProfiles) {
    let storeLogo = null;
    if (sp.store_logo) {
      const oldLogo = JSON.parse(sp.store_logo);
      const localPath = localFilePathFromOldUrl(oldLogo.url);
      storeLogo = await uploadToCloudinary(localPath, "Ecommerce_Store_Logos", 300);
      console.log(`Uploaded store logo -> ${storeLogo.url}`);
    }
    await prisma.sellerProfile.upsert({
      where: { id: sp.id },
      update: {},
      create: {
        id: sp.id,
        user_id: userIdMap[sp.user_id] || sp.user_id,
        store_name: sp.store_name,
        store_description: sp.store_description,
        store_logo: storeLogo,
        payout_phone: sp.payout_phone,
        status: sp.status,
        created_at: sp.created_at,
      },
    });
  }
  console.log(`Imported ${sellerProfiles.length} seller profile(s).`);

  let count = 0;
  for (const p of products) {
    const oldImages = p.images ? JSON.parse(p.images) : [];
    const newImages = [];
    for (const img of oldImages) {
      const localPath = localFilePathFromOldUrl(img.url);
      newImages.push(await uploadToCloudinary(localPath, "Ecommerce_Product_Images", 1000));
    }
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        ratings: p.ratings,
        images: newImages,
        stock: p.stock,
        created_by: userIdMap[p.created_by] || p.created_by,
        created_at: p.created_at,
      },
    });
    count += 1;
    console.log(`[${count}/${products.length}] Imported product: ${p.name}`);
  }

  await legacy.end();
  await prisma.$disconnect();
  console.log("Migration complete.");
}

main().catch(async (error) => {
  console.error("Migration failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
