import express from "express";
import { register, login, getProfile, updateProfile } from "./auth.controller.js";
import { forgotPassword, resetPassword } from "./password.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

export default router;