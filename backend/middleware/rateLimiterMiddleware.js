const rateLimit = require("express-rate-limit");

const createStructuredLimiter = ({ windowMs, max, message, code = "RATE_LIMITED" }) => {
  const windowSec = Math.ceil(windowMs / 1000);
  return rateLimit({
    windowMs,
    max: process.env.NODE_ENV === "development" ? max * 3 : max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.setHeader("Retry-After", windowSec);
      console.warn(`[RateLimit] ⚠️ 429 Triggered | Method: ${req.method} | URL: ${req.originalUrl || req.url} | IP: ${req.ip}`);
      return res.status(429).json({
        success: false,
        code,
        message: message || "Too many requests. Please try again shortly.",
        retryAfter: windowSec,
      });
    },
  });
};

// 1. Brute-force protection for login (10 per 15m in prod, 30 in dev)
const loginLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please wait 15 minutes before trying again.",
});

// 2. Abuse prevention for signup (15 per 15m in prod, 45 in dev)
const signupLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many account creation requests. Please try again later.",
});

// 3. Google auth limiter (20 per 15m in prod, 60 in dev)
const googleAuthLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many Google authentication attempts. Please try again later.",
});

// 4. Session check limiter for /auth/me (300 per 15m in prod, 900 in dev)
const sessionAuthLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many session check requests. Please slow down.",
});

// 5. General API limiter for non-auth dashboard endpoints (1200 per 15m)
const generalApiLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  message: "Too many requests. Please slow down.",
});

module.exports = {
  loginLimiter,
  signupLimiter,
  googleAuthLimiter,
  sessionAuthLimiter,
  generalApiLimiter,
};
