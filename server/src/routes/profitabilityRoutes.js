import express from "express";
import { getProfitability, getClientProfitability } from "../controllers/profitabilityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All profitability routes are protected
router.use(protect);

router.route("/").get(getProfitability);

router.route("/:clientId").get(getClientProfitability);

export default router;