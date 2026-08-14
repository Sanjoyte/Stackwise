import express from "express";



import {
  createSubscription,
  deleteSubscription,
  getSubscriptionById,
  getSubscriptions,
  updateSubscription,
} from "../controllers/subscriptionController.js";
import { getSubscriptionOverlap } from "../controllers/overlapController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, createSubscription)
  .get(protect, getSubscriptions);

router.get("/overlap", protect, getSubscriptionOverlap);

router
  .route("/:id")
  .get(protect, getSubscriptionById)
  .put(protect, updateSubscription)
  .delete(protect, deleteSubscription);

export default router;
