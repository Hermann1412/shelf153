import express from "express";
import {
  fetchAllShops,
  applyToBecomeSeller,
  getStoreProfile,
  updateStoreProfile,
  fetchSellerProducts,
  fetchSellerOrders,
  updateOrderItemStatus,
  sellerDashboardStats,
} from "../controllers/sellerController.js";
import {
  authorizedRoles,
  isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/all", fetchAllShops);
router.post("/apply", isAuthenticated, applyToBecomeSeller);
router.get("/store-profile", isAuthenticated, authorizedRoles("Seller"), getStoreProfile);
router.put("/store-profile", isAuthenticated, authorizedRoles("Seller"), updateStoreProfile);
router.get("/products", isAuthenticated, authorizedRoles("Seller"), fetchSellerProducts);
router.get("/orders", isAuthenticated, authorizedRoles("Seller"), fetchSellerOrders);
router.put(
  "/order-item/:itemId/status",
  isAuthenticated,
  authorizedRoles("Seller"),
  updateOrderItemStatus
);
router.get(
  "/dashboard-stats",
  isAuthenticated,
  authorizedRoles("Seller"),
  sellerDashboardStats
);

export default router;
