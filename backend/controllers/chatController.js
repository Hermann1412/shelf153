import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../database/db.js";
import { v4 as uuidv4 } from "uuid";

export const getOrCreateConversation = catchAsyncErrors(async (req, res) => {
  const customerId = req.user.id;

  let { rows } = await database.query(
    `SELECT c.*, u.name AS admin_name
     FROM conversations c
     LEFT JOIN users u ON c.admin_id = u.id
     WHERE c.customer_id = ? AND c.status = 'open'
     ORDER BY c.created_at DESC LIMIT 1`,
    [customerId]
  );

  if (rows.length === 0) {
    const id = uuidv4();
    await database.query(
      "INSERT INTO conversations (id, customer_id) VALUES (?, ?)",
      [id, customerId]
    );
    const result = await database.query("SELECT * FROM conversations WHERE id = ?", [id]);
    rows = result.rows;
  }

  res.status(200).json({ success: true, conversation: rows[0] });
});

export const getAllConversations = catchAsyncErrors(async (req, res) => {
  const { rows } = await database.query(`
    SELECT c.*,
           cu.name AS customer_name,
           cu.avatar AS customer_avatar,
           au.name AS admin_name,
           (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
           (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_role = 'User') AS unread_count
    FROM conversations c
    JOIN users cu ON c.customer_id = cu.id
    LEFT JOIN users au ON c.admin_id = au.id
    ORDER BY COALESCE(
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
      c.created_at
    ) DESC
  `);

  res.status(200).json({ success: true, conversations: rows });
});

export const getMessages = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const { rows: conv } = await database.query(
    "SELECT * FROM conversations WHERE id = ?",
    [id]
  );
  if (!conv[0]) return next(new ErrorHandler("Conversation not found.", 404));
  if (userRole !== "Admin" && conv[0].customer_id !== userId) {
    return next(new ErrorHandler("Access denied.", 403));
  }

  const { rows } = await database.query(
    `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC`,
    [id]
  );

  await database.query(
    "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_role != ? AND is_read = 0",
    [id, userRole]
  );

  res.status(200).json({ success: true, messages: rows });
});

export const closeConversation = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await database.query(
    "UPDATE conversations SET status = 'closed', updated_at = NOW() WHERE id = ?",
    [id]
  );
  res.status(200).json({ success: true, message: "Conversation closed." });
});
