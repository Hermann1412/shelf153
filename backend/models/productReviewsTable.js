import database from "../database/db.js";

export async function createProductReviewsTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id CHAR(36) PRIMARY KEY,
        product_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        rating DECIMAL(2,1) NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Reviews Table.", error);
    process.exit(1);
  }
}
