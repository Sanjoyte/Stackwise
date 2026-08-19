import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  initiateTeamRequestPayment,
  initiateSubscriptionPayment,
  listPayments,
  sslSuccess,
  sslFail,
  sslCancel,
  sslIpn,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/sslcommerz/success", sslSuccess);
router.post("/sslcommerz/fail", sslFail);
router.post("/sslcommerz/cancel", sslCancel);
router.post("/sslcommerz/ipn", sslIpn);

router.get("/", protect, listPayments);
router.post("/team-requests/:id/initiate", protect, initiateTeamRequestPayment);
router.post("/subscriptions/:id/initiate", protect, initiateSubscriptionPayment);

export default router;
