import express from "express";
import {
  fetchPaymentConfig,
  fetchSingleOrder,
  placeNewOrder,
  fetchMyOrders,
  fetchAllOrders,
  updateOrderStatus,
  deleteOrder,
  checkPaymentStatus,
  updatePaymentFee,
} from "../controllers/orderController.js";
import {
  isAuthenticated,
  authorizedRoles,
} from "../middlewares/authMiddleware.js";

const router = express.Router();
router.get("/payment/config", fetchPaymentConfig);
router.post("/new", isAuthenticated, placeNewOrder);
router.get("/orders/me", isAuthenticated, fetchMyOrders);
router.get("/payment/status/:orderId", isAuthenticated, checkPaymentStatus);
router.patch(
  "/payment/:orderId/fee",
  isAuthenticated,
  authorizedRoles("Admin"),
  updatePaymentFee,
);
router.get("/:orderId", isAuthenticated, fetchSingleOrder);
router.get(
  "/admin/getall",
  isAuthenticated,
  authorizedRoles("Admin"),
  fetchAllOrders
);
router.put(
  "/admin/update/:orderId",
  isAuthenticated,
  authorizedRoles("Admin"),
  updateOrderStatus
);
router.delete(
  "/admin/delete/:orderId",
  isAuthenticated,
  authorizedRoles("Admin"),
  deleteOrder
);

export default router;
