import database from "../database/db.js";

export async function createSellerProfilesTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS seller_profiles (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL UNIQUE,
        store_name VARCHAR(150) NOT NULL,
        store_description TEXT,
        store_logo JSON DEFAULT NULL,
        payout_phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'Approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    console.error("❌ Failed To Create Seller Profiles Table.", error);
    process.exit(1);
  }
}
