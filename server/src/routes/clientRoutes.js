import express from "express";
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from "../controllers/clientController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All client routes are protected
router.use(protect);

router.route("/").get(getClients).post(createClient);
router.route("/:id").put(updateClient).delete(deleteClient);

export default router;