import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../database/db.js";

const conversationDetails = async (id) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, avatar: true } },
      admin: { select: { name: true } },
      messages: { orderBy: { created_at: "desc" }, take: 1 },
    },
  });
  if (!conversation) return null;
  const unread_count = await prisma.message.count({
    where: { conversation_id: id, is_read: false, sender_role: "User" },
  });
  const { customer, admin, messages, ...rest } = conversation;
  return {
    ...rest, customer_name: customer.name, customer_avatar: customer.avatar,
    admin_name: admin?.name || null, last_message: messages[0]?.content || null,
    last_message_at: messages[0]?.created_at || null, unread_count,
  };
};

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL], credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = Object.fromEntries(cookieHeader.split(";").filter(Boolean).map((cookie) => {
        const [key, ...value] = cookie.trim().split("=");
        return [key, decodeURIComponent(value.join("="))];
      }));
      if (!cookies.token) return next(new Error("Not authenticated"));
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET_KEY);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }, select: { id: true, name: true, role: true, avatar: true },
      });
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    if (user.role === "Admin") socket.join("admins_room");

    socket.on("start_conversation", async () => {
      try {
        if (user.role === "Admin") return;
        let conversation = await prisma.conversation.findFirst({
          where: { customer_id: user.id, status: "open" }, orderBy: { created_at: "desc" },
        });
        let isNew = false;
        if (!conversation) {
          conversation = await prisma.conversation.create({ data: { customer_id: user.id } });
          isNew = true;
        }
        socket.join(`conversation_${conversation.id}`);
        socket.emit("conversation:started", conversation);
        if (isNew) io.to("admins_room").emit("conversation:new", await conversationDetails(conversation.id));
      } catch (error) {
        console.error("start_conversation error:", error);
        socket.emit("error", { message: "Failed to start conversation." });
      }
    });

    socket.on("join_conversation", async (conversationId) => {
      try {
        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conversation || (user.role !== "Admin" && conversation.customer_id !== user.id)) return;
        socket.join(`conversation_${conversationId}`);
        if (user.role === "Admin" && !conversation.admin_id) {
          await prisma.conversation.update({ where: { id: conversationId }, data: { admin_id: user.id } });
          io.to("admins_room").emit("conversation:updated", await conversationDetails(conversationId));
          io.to(`conversation_${conversationId}`).emit("conversation:assigned", { admin_name: user.name });
        }
      } catch (error) {
        console.error("join_conversation error:", error);
      }
    });

    socket.on("send_message", async ({ conversationId, content } = {}) => {
      try {
        if (!content?.trim() || content.trim().length > 5000) return;
        const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, status: "open" } });
        if (!conversation || (user.role !== "Admin" && conversation.customer_id !== user.id)) return;
        const row = await prisma.message.create({
          data: { conversation_id: conversationId, sender_id: user.id, sender_role: user.role, content: content.trim() },
        });
        const message = { ...row, sender_name: user.name, sender_avatar: user.avatar };
        await prisma.conversation.update({ where: { id: conversationId }, data: { updated_at: new Date() } });
        io.to(`conversation_${conversationId}`).emit("message:new", message);
        io.to("admins_room").emit("conversation:updated", await conversationDetails(conversationId));
      } catch (error) {
        console.error("send_message error:", error);
      }
    });

    const emitTyping = async (event, conversationId) => {
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { customer_id: true } });
      if (!conversation || (user.role !== "Admin" && conversation.customer_id !== user.id)) return;
      socket.to(`conversation_${conversationId}`).emit(event, { name: user.name, role: user.role });
    };
    socket.on("typing", ({ conversationId } = {}) => emitTyping("typing:indicator", conversationId));
    socket.on("stop_typing", ({ conversationId } = {}) => emitTyping("typing:stopped", conversationId));

    socket.on("close_conversation", async (conversationId) => {
      try {
        if (user.role !== "Admin") return;
        const updated = await prisma.conversation.updateMany({ where: { id: conversationId, status: "open" }, data: { status: "closed" } });
        if (!updated.count) return;
        io.to(`conversation_${conversationId}`).emit("conversation:closed", conversationId);
        io.to("admins_room").emit("conversation:closed", conversationId);
      } catch (error) {
        console.error("close_conversation error:", error);
      }
    });
  });
  return io;
};
