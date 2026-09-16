const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && secret.includes("your_secret_key"))) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET must be set to a secure environment variable in production!");
    }
    return "dev_default_jwt_secret_key_expense_tracker_2026";
  }
  return secret;
};

const buildCookieOptions = (maxAgeDays = 7) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
});

const createAuthErrorResponse = (error = "unauthorized", message = "Authentication required") => ({
  success: false,
  error,
  message,
});

const signJwt = (payload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

const verifyJwt = (token) => {
  return jwt.verify(token, getJwtSecret());
};

const extractToken = (req) => {
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }

  return null;
};

module.exports = {
  buildCookieOptions,
  createAuthErrorResponse,
  signJwt,
  verifyJwt,
  extractToken,
  getJwtSecret,
};
