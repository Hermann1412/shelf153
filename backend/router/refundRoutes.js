import express from "express";
import { checkRefundStatus, createRefund, fetchRefunds } from "../controllers/refundController.js";
import { authorizedRoles, isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", isAuthenticated, authorizedRoles("Admin"), fetchRefunds);
router.post(
  "/order/:orderId/item/:orderItemId",
  isAuthenticated,
  authorizedRoles("Admin"),
  createRefund,
);
router.get("/:refundId/status", isAuthenticated, authorizedRoles("Admin"), checkRefundStatus);

export default router;
