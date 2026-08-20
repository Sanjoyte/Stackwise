import express from "express";

import {
  getFinancialHealth,
} from "../controllers/financialHealthController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getFinancialHealth);

export default router;
