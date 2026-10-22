import express from "express";
import {
  checkPayoutStatus,
  createSellerPayout,
  fetchPayouts,
  fetchPayoutSummary,
  updatePayoutFee,
} from "../controllers/payoutController.js";
import { authorizedRoles, isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", isAuthenticated, authorizedRoles("Admin", "Seller"), fetchPayouts);
router.get("/summary", isAuthenticated, authorizedRoles("Admin"), fetchPayoutSummary);
router.post("/seller/:sellerId", isAuthenticated, authorizedRoles("Admin"), createSellerPayout);
router.patch("/:payoutId/fee", isAuthenticated, authorizedRoles("Admin"), updatePayoutFee);
router.get("/:payoutId/status", isAuthenticated, authorizedRoles("Admin", "Seller"), checkPayoutStatus);

export default router;
