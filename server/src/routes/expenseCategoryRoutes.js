import express from "express";

import {
  addCategory,
  getCategories,
  getCategoryDetail,
  getCategorySpending,
} from "../controllers/expenseCategoryController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
 * GET
 * /api/expense-categories
 *
 * Used by Expense form dropdown.
 */
router.get(
  "/",
  protect,
  getCategories
);

/*
 * GET
 * /api/expense-categories/spending?period=monthly
 */
router.get(
  "/spending",
  protect,
  getCategorySpending
);

/*
 * POST
 * /api/expense-categories
 */
router.post(
  "/",
  protect,
  addCategory
);

/*
 * GET
 * /api/expense-categories/food-groceries?period=monthly
 */
router.get(
  "/:slug",
  protect,
  getCategoryDetail
);

export default router;