import express from "express";
import {
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  logFromTemplate,
} from "../controllers/incomeTemplateController.js";
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All income template routes are protected
router.use(protect);

router.route("/")
  .post(createTemplate)
  .get(getTemplates);

router.route("/:id")
  .put(updateTemplate)
  .delete(deleteTemplate);

router.route("/:id/log")
  .post(logFromTemplate);

export default router;
