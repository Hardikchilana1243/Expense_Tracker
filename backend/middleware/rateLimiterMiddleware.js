const expressRateLimit = require("express-rate-limit");

// Robust resolution supporting CommonJS, default export, or named export across runtimes
const rateLimit = typeof expressRateLimit === "function"
  ? expressRateLimit
  : (expressRateLimit?.rateLimit || expressRateLimit?.default);

if (typeof rateLimit !== "function") {
  throw new TypeError(
    `[rateLimiterMiddleware] Failed to resolve rateLimit function from 'express-rate-limit'. Received type: ${typeof expressRateLimit}`
  );
}

const createStructuredLimiter = ({
  windowMs,
  limit,
  message,
  code = "RATE_LIMITED",
}) => {
  const windowSec = Math.ceil(windowMs / 1000);

  const limiter = rateLimit({
    windowMs,
    limit:
      process.env.NODE_ENV === "development"
        ? limit * 3
        : limit,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      trustProxy: false,
      xForwardedForHeader: false,
    },
    handler: (req, res) => {
      res.setHeader("Retry-After", windowSec);

      console.warn(
        `[RateLimit] ⚠️ 429 Triggered | Method: ${req.method} | URL: ${req.originalUrl || req.url} | IP: ${req.ip}`
      );

      return res.status(429).json({
        success: false,
        code,
        message:
          message ||
          "Too many requests. Please try again shortly.",
        retryAfter: windowSec,
      });
    },
  });

  if (typeof limiter !== "function") {
    throw new TypeError(
      `[rateLimiterMiddleware] rateLimit() did not return a valid middleware function. Got: ${typeof limiter}`
    );
  }

  return limiter;
};

// 1. Login
const loginLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message:
    "Too many login attempts. Please wait 15 minutes before trying again.",
});

// 2. Signup
const signupLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message:
    "Too many account creation requests. Please try again later.",
});

// 3. Google authentication
const googleAuthLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message:
    "Too many Google authentication attempts. Please try again later.",
});

// 4. Session check
const sessionAuthLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message:
    "Too many session check requests. Please slow down.",
});

// 5. General API
const generalApiLimiter = createStructuredLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  message:
    "Too many requests. Please slow down.",
});

const exportedLimiters = {
  loginLimiter,
  signupLimiter,
  googleAuthLimiter,
  sessionAuthLimiter,
  generalApiLimiter,
};

// Startup validation check on all exported rate limiters
for (const [name, fn] of Object.entries(exportedLimiters)) {
  if (typeof fn !== "function") {
    throw new TypeError(
      `[rateLimiterMiddleware] Export '${name}' is not a function (got ${typeof fn}). Middleware initialization failed.`
    );
  }
}

module.exports = exportedLimiters;