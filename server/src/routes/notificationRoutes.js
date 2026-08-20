import express from "express";

import {
  getNotificationSettings,
  previewNotifications,
  runNotifications,
  updateNotificationSettings,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(getNotificationSettings).put(updateNotificationSettings);
router.get("/preview", previewNotifications);
router.post("/run", runNotifications);

export default router;
