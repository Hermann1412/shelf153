import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import prisma from "../database/db.js";

const conversationInclude = {
  customer: { select: { name: true, avatar: true } },
  admin: { select: { name: true } },
  messages: { orderBy: { created_at: "desc" }, take: 1 },
};

const formatConversation = (conversation) => {
  const { customer, admin, messages, ...rest } = conversation;
  return {
    ...rest,
    customer_name: customer?.name,
    customer_avatar: customer?.avatar,
    admin_name: admin?.name || null,
    last_message: messages?.[0]?.content || null,
    last_message_at: messages?.[0]?.created_at || null,
    unread_count: conversation.unread_count ?? 0,
  };
};

export const getOrCreateConversation = catchAsyncErrors(async (req, res) => {
  let conversation = await prisma.conversation.findFirst({
    where: { customer_id: req.user.id, status: "open" }, include: { admin: { select: { name: true } } }, orderBy: { created_at: "desc" },
  });
  if (!conversation) conversation = await prisma.conversation.create({ data: { customer_id: req.user.id }, include: { admin: { select: { name: true } } } });
  const { admin, ...rest } = conversation;
  res.status(200).json({ success: true, conversation: { ...rest, admin_name: admin?.name || null } });
});

export const getAllConversations = catchAsyncErrors(async (_req, res) => {
  const rows = await prisma.conversation.findMany({ include: conversationInclude, orderBy: { updated_at: "desc" } });
  const unread = await prisma.message.groupBy({
    by: ["conversation_id"], where: { is_read: false, sender_role: "User" }, _count: { _all: true },
  });
  const conversations = rows.map((row) => formatConversation({
    ...row, unread_count: unread.find((entry) => entry.conversation_id === row.id)?._count._all || 0,
  }));
  res.status(200).json({ success: true, conversations });
});

export const getMessages = catchAsyncErrors(async (req, res, next) => {
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) return next(new ErrorHandler("Conversation not found.", 404));
  if (req.user.role !== "Admin" && conversation.customer_id !== req.user.id) return next(new ErrorHandler("Access denied.", 403));
  const rows = await prisma.message.findMany({
    where: { conversation_id: conversation.id },
    include: { sender: { select: { name: true, avatar: true } } }, orderBy: { created_at: "asc" },
  });
  await prisma.message.updateMany({
    where: { conversation_id: conversation.id, sender_role: { not: req.user.role }, is_read: false }, data: { is_read: true },
  });
  const messages = rows.map(({ sender, ...message }) => ({ ...message, sender_name: sender.name, sender_avatar: sender.avatar }));
  res.status(200).json({ success: true, messages });
});

export const closeConversation = catchAsyncErrors(async (req, res, next) => {
  const existing = await prisma.conversation.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return next(new ErrorHandler("Conversation not found.", 404));
  await prisma.conversation.update({ where: { id: existing.id }, data: { status: "closed" } });
  res.status(200).json({ success: true, message: "Conversation closed." });
});
