import express from "express";
import {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
} from "../controllers/incomeController.js";
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All income routes are protected
router.use(protect);

router.route("/")
  .post(createIncome)
  .get(getIncomes);

router.route("/:id")
  .get(getIncomeById)
  .put(updateIncome)
  .delete(deleteIncome);

export default router;
