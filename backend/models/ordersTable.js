import database from "../database/db.js";

export async function createOrdersTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id CHAR(36) PRIMARY KEY,
        buyer_id CHAR(36) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        tax_price DECIMAL(10,2) NOT NULL,
        shipping_price DECIMAL(10,2) NOT NULL,
        order_status VARCHAR(50) DEFAULT 'Processing',
        paid_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Orders Table.", error);
    process.exit(1);
  }
}
