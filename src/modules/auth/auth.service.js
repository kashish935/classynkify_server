import User from "./auth.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const registerUser = async ({ name, email, phone, password, role }) => {
  const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(cleanPhone)) {
    throw new Error("Enter a valid 10-digit phone number");
  }

  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    phone: cleanPhone,
    password: hashed,
    role,
  });

  return { user, token: signToken(user) };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  return { user, token: signToken(user) };
};