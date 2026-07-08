import express from "express";
import {
  getAllUsers,
  deleteUser,
  dashboardStats,
  updateSellerStatus,
} from "../controllers/adminController.js";
import {
  authorizedRoles,
  isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

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
