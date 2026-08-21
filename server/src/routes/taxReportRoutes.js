import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  previewReport,
  generateReport,
  getReports,
  getReportById,
  downloadReportPDF,
  getJurisdictions,
} from "../controllers/taxReportController.js";

import {
  triggerAiScan,
  getAiDeductionFlags,
  getMissedDeductions,
  acceptDeductionFlag,
  dismissDeductionFlag,
  acceptMissedSuggestion,
  dismissMissedSuggestion,
  getScanStatus,
} from "../controllers/aiDeductionController.js";

const router = express.Router();

router.use(protect);

router.get("/jurisdictions", getJurisdictions);
router.post("/preview", previewReport);
router.post("/generate", generateReport);
router.get("/", getReports);

// AI Deduction Scan (Phase 4)
router.post("/ai-scan/run", triggerAiScan);
router.get("/ai-scan/status", getScanStatus);
router.get("/ai-scan/flags", getAiDeductionFlags);
router.get("/ai-scan/suggestions", getMissedDeductions);
router.post("/ai-scan/flags/:id/accept", acceptDeductionFlag);
router.post("/ai-scan/flags/:id/dismiss", dismissDeductionFlag);
router.post("/ai-scan/suggestions/:id/accept", acceptMissedSuggestion);
router.post("/ai-scan/suggestions/:id/dismiss", dismissMissedSuggestion);

router.get("/:id", getReportById);
router.get("/:id/download", downloadReportPDF);

export default router;
