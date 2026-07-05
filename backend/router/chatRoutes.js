import express from "express";
import {
  getOrCreateConversation,
  getAllConversations,
  getMessages,
  closeConversation,
} from "../controllers/chatController.js";
import {
  isAuthenticated,
  authorizedRoles,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/conversation", isAuthenticated, getOrCreateConversation);
router.get(
  "/conversations",
  isAuthenticated,
  authorizedRoles("Admin"),
  getAllConversations
);
router.get(
  "/conversation/:id/messages",
  isAuthenticated,
  getMessages
);
router.put(
  "/conversation/:id/close",
  isAuthenticated,
  authorizedRoles("Admin"),
  closeConversation
);

export default router;
