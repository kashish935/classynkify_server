import express from "express";
import { doubtSolver } from "./ai.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/doubt-solver", protect, doubtSolver);

export default router;