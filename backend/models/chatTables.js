import database from "../database/db.js";

export async function createChatTables() {
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id CHAR(36) PRIMARY KEY,
        customer_id CHAR(36) NOT NULL,
        admin_id CHAR(36) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await database.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id CHAR(36) PRIMARY KEY,
        conversation_id CHAR(36) NOT NULL,
        sender_id CHAR(36) NOT NULL,
        sender_role VARCHAR(10) NOT NULL,
        content TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error("❌ Failed To Create Chat Tables.", error);
    process.exit(1);
  }
}
