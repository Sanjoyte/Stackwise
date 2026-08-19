import User from "../models/User.js";

import {
  clearAuthCookie,
  generateToken,
  setAuthCookie,
} from "../utils/token.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  workType: user.workType,
  baseCurrency: user.baseCurrency,
  onboardingCompleted: user.onboardingCompleted,
  team: user.team || null,
  activeTeam: user.activeTeam || null,
  teams: user.teams || [],
  createdAt: user.createdAt,
});

export const signup = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Name must contain at least 2 characters",
      });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    const token = generateToken(
      user._id.toString()
    );

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message:
        "Your Stackwise account has been created",
      user: formatUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordIsCorrect =
      await user.comparePassword(password);

    if (!passwordIsCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(
      user._id.toString()
    );

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Welcome back to Stackwise",
      user: formatUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "You have been logged out",
  });
};

export const getCurrentUser = (req, res) => {
  return res.status(200).json({
    success: true,
    user: formatUser(req.user),
  });
};