import database from "../database/db.js";

export async function createOrderItemTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id CHAR(36) PRIMARY KEY,
        order_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image TEXT,
        title TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Order Items Table.", error);
    process.exit(1);
  }
}
