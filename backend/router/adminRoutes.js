import express from "express";
import {
  getAllUsers,
  deleteUser,
  dashboardStats,
  updateSellerStatus,
} from "../controllers/adminController.js";
import { addExchangeRate, fetchFinanceOperations, importProviderFees } from "../controllers/financeController.js";
import {
  authorizedRoles,
  isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/finance", isAuthenticated, authorizedRoles("Admin"), fetchFinanceOperations);
router.post("/finance/exchange-rates", isAuthenticated, authorizedRoles("Admin"), addExchangeRate);
router.post("/finance/fees/import", isAuthenticated, authorizedRoles("Admin"), importProviderFees);

router.get(
  "/getallusers",
  isAuthenticated,
  authorizedRoles("Admin"),
  getAllUsers
); // DASHBOARD
router.delete(
  "/delete/:id",
  isAuthenticated,
  authorizedRoles("Admin"),
  deleteUser
);
router.get(
  "/fetch/dashboard-stats",
  isAuthenticated,
  authorizedRoles("Admin"),
  dashboardStats
);
router.patch(
  "/seller/:id/status",
  isAuthenticated,
  authorizedRoles("Admin"),
  updateSellerStatus
);

export default router;
