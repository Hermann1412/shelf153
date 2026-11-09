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
router.get("/store-profile", isAuthenticated, authorizedRoles("Seller", "User", "Admin"), getStoreProfile);
router.put("/store-profile", isAuthenticated, authorizedRoles("Seller"), updateStoreProfile);
router.get("/products", isAuthenticated, authorizedRoles("Seller", "Admin"), fetchSellerProducts);
router.get("/orders", isAuthenticated, authorizedRoles("Seller", "Admin"), fetchSellerOrders);
router.put(
  "/order-item/:itemId/status",
  isAuthenticated,
  authorizedRoles("Seller", "Admin"),
  updateOrderItemStatus
);
router.get(
  "/dashboard-stats",
  isAuthenticated,
  authorizedRoles("Seller", "Admin"),
  sellerDashboardStats
);

export default router;
