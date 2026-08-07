import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { AUTH_COOKIE_NAME } from "../utils/token.js";

export const protect = async (
  req,
  res,
  next
) => {
  try {
    let token =
      req.cookies?.[AUTH_COOKIE_NAME];

    if (
      !token &&
      req.headers.authorization?.startsWith(
        "Bearer "
      )
    ) {
      token =
        req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is missing from the environment"
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.userId
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "The user connected to this session no longer exists",
      });
    }

    req.user = user;

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message:
        "Your session is invalid or has expired",
    });
  }
};