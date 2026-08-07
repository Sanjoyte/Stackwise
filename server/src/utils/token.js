import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "stackwise_token";

const getBaseCookieOptions = () => {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

export const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing from the environment"
    );
  }

  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

export const setAuthCookie = (res, token) => {
  const cookieDays =
    Number(process.env.JWT_COOKIE_DAYS) || 7;

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getBaseCookieOptions(),
    maxAge: cookieDays * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(
    AUTH_COOKIE_NAME,
    getBaseCookieOptions()
  );
};