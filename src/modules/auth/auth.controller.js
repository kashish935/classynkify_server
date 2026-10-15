import { registerUser, loginUser } from "./auth.service.js";
import User from "./auth.model.js";

const safeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone || "",
  bio: u.bio || "",
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Works whichever key the JWT payload uses
const getUserId = (req) => req.user?.id || req.user?._id || req.user?.userId;

const findCurrentUser = async (req, res) => {
  const id = getUserId(req);
  if (!id) {
    console.log("Profile: no user id in token payload:", req.user);
    res.status(401).json({ success: false, message: "Invalid token, please log in again" });
    return null;
  }
  const user = await User.findById(id).catch(() => null);
  if (!user) {
    console.log("Profile: no user in DB for id:", id);
    res
      .status(404)
      .json({ success: false, message: "Account not found, please log out and log in again" });
    return null;
  }
  return user;
};

export const register = async (req, res) => {
  try {
    const { user, token } = await registerUser(req.body);
    res.status(201).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { user, token } = await loginUser(req.body);
    res.status(200).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await findCurrentUser(req, res);
    if (!user) return;
    res.status(200).json({ success: true, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await findCurrentUser(req, res);
    if (!user) return;

    const { name, email, phone, bio } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: "Name is required" });
      }
      user.name = String(name).trim();
    }

    if (email !== undefined) {
      const newEmail = String(email).trim();
      if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
          return res.status(400).json({ success: false, message: "Invalid email" });
        }
        const exists = await User.findOne({
          email: new RegExp(`^${escapeRegex(newEmail)}$`, "i"),
          _id: { $ne: user._id },
        });
        if (exists) {
          return res.status(400).json({ success: false, message: "Email already in use" });
        }
        user.email = newEmail;
      }
    }

    if (phone !== undefined) {
      const digits = String(phone).replace(/\D/g, "").slice(-10);
      if (digits && digits.length !== 10) {
        return res
          .status(400)
          .json({ success: false, message: "Enter a valid 10-digit phone number" });
      }
      user.phone = digits;
    }

    if (bio !== undefined) {
      if (String(bio).length > 300) {
        return res
          .status(400)
          .json({ success: false, message: "Bio must be 300 characters or less" });
      }
      user.bio = String(bio).trim();
    }

    await user.save();
    res.status(200).json({ success: true, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};