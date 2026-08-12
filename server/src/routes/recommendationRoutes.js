import express from "express";
import { getAlternativeRecommendations } from "../controllers/recommendationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/alternatives", protect, getAlternativeRecommendations);
export default router;
