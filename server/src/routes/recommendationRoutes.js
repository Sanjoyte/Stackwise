import express from "express";
import {
  getAlternativeRecommendations,
  updateRecommendationUsage
} from "../controllers/recommendationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get(
  "/alternatives",
  protect,
  getAlternativeRecommendations
);


router.put(
  "/usage/:id",
  protect,
  updateRecommendationUsage
);


export default router;