import database from "../database/db.js";

export async function createUserTable() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(10) DEFAULT 'User',
        avatar JSON DEFAULT NULL,
        reset_password_token TEXT DEFAULT NULL,
        reset_password_expire DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Users Table.", error);
    process.exit(1);
  }
}
