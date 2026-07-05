import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shelf153_ecommerce",
  waitForConnections: true,
  connectionLimit: 10,
  typeCast(field, next) {
    if (field.type === "JSON") {
      const val = field.string();
      try {
        return val ? JSON.parse(val) : null;
      } catch {
        return val;
      }
    }
    return next();
  },
});

// Test connection on startup
try {
  const conn = await pool.getConnection();
  console.log("Connected to the database successfully");
  conn.release();
} catch (error) {
  console.error("Database connection failed:", error.message);
  process.exit(1);
}

// Compatibility wrapper — keeps all controllers using result.rows
const db = {
  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return { rows: Array.isArray(rows) ? rows : [] };
  },
};

export default db;
