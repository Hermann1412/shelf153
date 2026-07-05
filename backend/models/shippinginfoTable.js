import database from "../database/db.js";

export async function createShippingInfoTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS shipping_info (
        id CHAR(36) PRIMARY KEY,
        order_id CHAR(36) NOT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        pincode VARCHAR(20) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Shipping Info Table.", error);
    process.exit(1);
  }
}
