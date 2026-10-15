import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], default: "student" },
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, maxlength: 300, default: "" },

    // Forgot-password OTP
    resetOtpHash: { type: String, default: "" },
    resetOtpExpires: { type: Date },
    resetOtpAttempts: { type: Number, default: 0 },
    resetOtpSentAt: { type: Date },
    resetPhone: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);