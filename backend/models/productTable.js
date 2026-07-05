import database from "../database/db.js";

export async function createProductsTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS products (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(7,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        ratings DECIMAL(3,2) DEFAULT 0,
        images JSON,
        stock INT NOT NULL,
        created_by CHAR(36) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Products Table.", error);
    process.exit(1);
  }
}
