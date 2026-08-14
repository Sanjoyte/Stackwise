import express from "express";

import {
  getCashFlow,
} from "../controllers/cashFlowController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

router.get(
  "/",
  protect,
  getCashFlow
);

export default router;