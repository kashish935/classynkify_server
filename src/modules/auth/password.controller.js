import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "./auth.model.js";
import { sendOtpSms } from "../../utils/sendSms.js";

const OTP_TTL = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp + process.env.JWT_SECRET).digest("hex");

const normalizePhone = (p = "") => String(p).replace(/\D/g, "").slice(-10);
const isValidPhone = (p) => /^\d{10}$/.test(p);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const findByEmail = (email) =>
  User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });

export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await findByEmail(email);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email" });
    }

    const phone = normalizePhone(user.phone);
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message:
          "No valid phone number is saved for this account. Log in and add one in your Profile first.",
      });
    }

    if (
      user.resetOtpSentAt &&
      Date.now() - user.resetOtpSentAt.getTime() < RESEND_COOLDOWN
    ) {
      return res
        .status(429)
        .json({ success: false, message: "Please wait a minute before requesting a new OTP" });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpires = new Date(Date.now() + OTP_TTL);
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = new Date();
    await user.save();

    try {
      await sendOtpSms(phone, otp);
    } catch (smsErr) {
      user.resetOtpHash = "";
      user.resetOtpExpires = undefined;
      user.resetOtpSentAt = undefined;
      await user.save();
      return res.status(500).json({ success: false, message: smsErr.message });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to ******${phone.slice(-4)}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    const otp = String(req.body.otp || "").trim();
    const { newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Email, OTP and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 characters" });
    }

    const user = await findByEmail(email);
    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() < Date.now()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or invalid. Please request a new one." });
    }

    if (user.resetOtpAttempts >= MAX_ATTEMPTS) {
      return res
        .status(400)
        .json({ success: false, message: "Too many wrong attempts. Please request a new OTP." });
    }

    if (user.resetOtpHash !== hashOtp(otp)) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetOtpHash = "";
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    user.resetOtpSentAt = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};