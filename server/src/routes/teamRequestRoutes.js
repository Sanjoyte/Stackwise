import express from "express";

import {
  approveRequest,
  createRequest,
  getBudgetImpact,
  getRequestById,
  listRequests,
  rejectRequest,
  requestModification,
  updateRequest,
} from "../controllers/teamRequestController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(listRequests).post(createRequest);

router.get("/:id", getRequestById);
router.get("/:id/budget-impact", getBudgetImpact);
router.patch("/:id", updateRequest);

router.post("/:id/approve", approveRequest);
router.post("/:id/reject", rejectRequest);
router.post("/:id/request-modification", requestModification);

export default router;
