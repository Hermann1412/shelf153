import express from "express";
import {
  fetchAllShops,
  fetchPublicStore,
  fetchStoresForAdmin,
  applyToBecomeSeller,
  getStoreProfile,
  updateStoreProfile,
  fetchSellerProducts,
  fetchSellerOrders,
  updateOrderItemStatus,
  sellerDashboardStats,
} from "../controllers/sellerController.js";
import { fetchMyReports } from "../controllers/reportController.js";
import {
  authorizedRoles,
  isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/all", fetchAllShops);
router.get("/public/:slug", fetchPublicStore);
router.get("/stores", isAuthenticated, authorizedRoles("Admin"), fetchStoresForAdmin);
router.post("/apply", isAuthenticated, applyToBecomeSeller);

// Seller-space routes. "Admin" may open any store through ?store=<sellerId|platform>;
// a seller is always limited to their own store (see resolveStore in sellerController).
// Applicants (still "User") read their own application to see whether it is pending or refused.
// Sellers manage their catalog only: orders (with customers' contact details) and sales figures
// stay with the main admin, who sends each store a monthly report instead.
router.get("/store-profile", isAuthenticated, authorizedRoles("Seller", "User", "Admin"), getStoreProfile);
router.put("/store-profile", isAuthenticated, authorizedRoles("Seller"), updateStoreProfile);
router.get("/products", isAuthenticated, authorizedRoles("Seller", "Admin"), fetchSellerProducts);
router.get("/reports", isAuthenticated, authorizedRoles("Seller"), fetchMyReports);
router.get("/orders", isAuthenticated, authorizedRoles("Admin"), fetchSellerOrders);
router.put(
  "/order-item/:itemId/status",
  isAuthenticated,
  authorizedRoles("Admin"),
  updateOrderItemStatus
);
router.get(
  "/dashboard-stats",
  isAuthenticated,
  authorizedRoles("Admin"),
  sellerDashboardStats
);

export default router;
