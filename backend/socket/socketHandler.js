import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import database from "../database/db.js";
import { v4 as uuidv4 } from "uuid";

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
      credentials: true,
    },
  });

  // Authenticate every socket connection via the JWT cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map((c) => {
          const [key, ...val] = c.trim().split("=");
          return [key.trim(), decodeURIComponent(val.join("="))];
        })
      );
      const token = cookies.token;
      if (!token) return next(new Error("Not authenticated"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const { rows } = await database.query(
        "SELECT id, name, role, avatar FROM users WHERE id = ?",
        [decoded.id]
      );
      if (!rows[0]) return next(new Error("User not found"));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;

    if (user.role === "Admin") socket.join("admins_room");

    // ─── Customer: start or resume conversation ────────────────────────────
    socket.on("start_conversation", async () => {
      try {
        if (user.role === "Admin") return;

        let { rows } = await database.query(
          "SELECT * FROM conversations WHERE customer_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1",
          [user.id]
        );

        let conversation;
        let isNew = false;

        if (rows.length === 0) {
          const id = uuidv4();
          await database.query(
            "INSERT INTO conversations (id, customer_id) VALUES (?, ?)",
            [id, user.id]
          );
          const result = await database.query("SELECT * FROM conversations WHERE id = ?", [id]);
          conversation = result.rows[0];
          isNew = true;
        } else {
          conversation = rows[0];
        }

        socket.join(`conversation_${conversation.id}`);
        socket.emit("conversation:started", conversation);

        if (isNew) {
          const { rows: full } = await database.query(
            `SELECT c.*, cu.name AS customer_name, cu.avatar AS customer_avatar,
                    NULL AS last_message, NULL AS last_message_at, 0 AS unread_count
             FROM conversations c
             JOIN users cu ON c.customer_id = cu.id
             WHERE c.id = ?`,
            [conversation.id]
          );
          io.to("admins_room").emit("conversation:new", full[0]);
        }
      } catch (err) {
        console.error("start_conversation error:", err);
        socket.emit("error", { message: "Failed to start conversation." });
      }
    });

    // ─── Admin: join a specific conversation ──────────────────────────────
    socket.on("join_conversation", async (conversationId) => {
      try {
        const { rows } = await database.query(
          "SELECT * FROM conversations WHERE id = ?",
          [conversationId]
        );
        const conv = rows[0];
        if (!conv) return;
        if (user.role !== "Admin" && conv.customer_id !== user.id) return;

        socket.join(`conversation_${conversationId}`);

        if (user.role === "Admin" && !conv.admin_id) {
          await database.query(
            "UPDATE conversations SET admin_id = ?, updated_at = NOW() WHERE id = ?",
            [user.id, conversationId]
          );
          const { rows: updated } = await database.query(
            `SELECT c.*,
                    cu.name AS customer_name, cu.avatar AS customer_avatar,
                    au.name AS admin_name,
                    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                    (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_role = 'User') AS unread_count
             FROM conversations c
             JOIN users cu ON c.customer_id = cu.id
             LEFT JOIN users au ON c.admin_id = au.id
             WHERE c.id = ?`,
            [conversationId]
          );
          io.to("admins_room").emit("conversation:updated", updated[0]);
          io.to(`conversation_${conversationId}`).emit("conversation:assigned", {
            admin_name: user.name,
          });
        }
      } catch (err) {
        console.error("join_conversation error:", err);
      }
    });

    // ─── Send message ─────────────────────────────────────────────────────
    socket.on("send_message", async ({ conversationId, content }) => {
      try {
        if (!content?.trim()) return;

        const { rows: conv } = await database.query(
          "SELECT * FROM conversations WHERE id = ? AND status = 'open'",
          [conversationId]
        );
        if (!conv[0]) return;
        if (user.role !== "Admin" && conv[0].customer_id !== user.id) return;

        const msgId = uuidv4();
        await database.query(
          "INSERT INTO messages (id, conversation_id, sender_id, sender_role, content) VALUES (?, ?, ?, ?, ?)",
          [msgId, conversationId, user.id, user.role, content.trim()]
        );

        const { rows: msgRows } = await database.query(
          "SELECT * FROM messages WHERE id = ?",
          [msgId]
        );
        const message = { ...msgRows[0], sender_name: user.name, sender_avatar: user.avatar };

        await database.query(
          "UPDATE conversations SET updated_at = NOW() WHERE id = ?",
          [conversationId]
        );

        io.to(`conversation_${conversationId}`).emit("message:new", message);

        const { rows: updatedConv } = await database.query(
          `SELECT c.*,
                  cu.name AS customer_name, cu.avatar AS customer_avatar,
                  au.name AS admin_name,
                  (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                  (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                  (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_role = 'User') AS unread_count
           FROM conversations c
           JOIN users cu ON c.customer_id = cu.id
           LEFT JOIN users au ON c.admin_id = au.id
           WHERE c.id = ?`,
          [conversationId]
        );
        io.to("admins_room").emit("conversation:updated", updatedConv[0]);
      } catch (err) {
        console.error("send_message error:", err);
      }
    });

    // ─── Typing indicators ────────────────────────────────────────────────
    socket.on("typing", ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit("typing:indicator", {
        name: user.name,
        role: user.role,
      });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit("typing:stopped", {
        role: user.role,
      });
    });

    // ─── Admin closes conversation ─────────────────────────────────────────
    socket.on("close_conversation", async (conversationId) => {
      try {
        if (user.role !== "Admin") return;
        await database.query(
          "UPDATE conversations SET status = 'closed', updated_at = NOW() WHERE id = ?",
          [conversationId]
        );
        io.to(`conversation_${conversationId}`).emit("conversation:closed", conversationId);
        io.to("admins_room").emit("conversation:closed", conversationId);
      } catch (err) {
        console.error("close_conversation error:", err);
      }
    });
  });

  return io;
};
