import express from "express";

import {
  attachExpenseReceipt,
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  getExpenseSummary,
  importExpenses,
  removeExpenseReceipt,
  updateExpense,
} from "../controllers/expenseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadReceipt } from "../middleware/receiptUpload.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getExpenses).post(createExpense);
router.get("/summary", getExpenseSummary);
router.post("/import", importExpenses);
router.post("/:id/receipt", uploadReceipt, attachExpenseReceipt);
router.delete("/:id/receipt", removeExpenseReceipt);
router.route("/:id").get(getExpenseById).patch(updateExpense).put(updateExpense).delete(deleteExpense);

export default router;
