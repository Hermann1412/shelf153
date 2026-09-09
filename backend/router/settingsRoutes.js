import express from "express";
import {
  getSiteSettings,
  updateSiteSettings,
} from "../controllers/settingsController.js";
import { authorizedRoles, isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getSiteSettings);
router.patch("/", isAuthenticated, authorizedRoles("Admin"), updateSiteSettings);

export default router;
