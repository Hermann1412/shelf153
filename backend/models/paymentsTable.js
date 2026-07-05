import database from "../database/db.js";

export async function createPaymentsTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id CHAR(36) PRIMARY KEY,
        order_id CHAR(36) NOT NULL UNIQUE,
        payment_type VARCHAR(20) DEFAULT 'Airtel Money',
        payment_status VARCHAR(20) DEFAULT 'Pending',
        transaction_id VARCHAR(255) UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Payments Table.", error);
    process.exit(1);
  }
}
