import express from "express";
import {
  createTeam,
  getMyTeam,
  getMyTeams,
  joinTeam,
  regenerateInviteCode,
  switchActiveTeam,
} from "../controllers/teamController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.post("/", createTeam);
router.post("/join", joinTeam);
router.get("/my-team", getMyTeam);
router.get("/my-teams", getMyTeams);
router.post("/:id/activate", switchActiveTeam);
router.post("/regenerate-code", regenerateInviteCode);
export default router;
