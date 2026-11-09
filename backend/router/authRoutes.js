import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  logout,
  register,
  resetPassword,
  updatePassword,
  updateProfile,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";
import { accountLimiter, loginLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

router.post("/register", accountLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", isAuthenticated, getUser);
// POST so another site cannot sign a customer out with a plain link or image.
router.post("/logout", logout);
router.post("/password/forgot", accountLimiter, forgotPassword);
router.put("/password/reset/:token", accountLimiter, resetPassword);
router.put("/password/update", isAuthenticated, updatePassword);
router.put("/profile/update", isAuthenticated, updateProfile);

export default router;
