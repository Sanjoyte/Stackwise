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
  scanReceipt,
  updateExpense,
} from "../controllers/expenseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadReceipt } from "../middleware/receiptUpload.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getExpenses).post(createExpense);
router.get("/summary", getExpenseSummary);
router.post("/import", importExpenses);
// Static paths MUST stay above "/:id" — Express matches in registration order, and "/:id"
// would otherwise swallow "receipt-scan" as an expense id.
router.post("/receipt-scan", uploadReceipt, scanReceipt);
router.post("/:id/receipt", uploadReceipt, attachExpenseReceipt);
router.delete("/:id/receipt", removeExpenseReceipt);
router.route("/:id").get(getExpenseById).patch(updateExpense).put(updateExpense).delete(deleteExpense);

export default router;
