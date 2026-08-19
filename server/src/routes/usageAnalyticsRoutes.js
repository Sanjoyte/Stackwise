import express from "express";
import { createUsageLog, deleteUsageLog, getUsageAnalytics } from "../controllers/usageAnalyticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", protect, getUsageAnalytics);
router.post("/logs", protect, createUsageLog);
router.delete("/logs/:id", protect, deleteUsageLog);
export default router;
