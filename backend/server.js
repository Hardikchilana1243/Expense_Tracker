require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const app = express();

// Trust reverse proxy (Vercel / AWS ELB / Cloudflare) for accurate client IP in rate limiting & cookies
app.set("trust proxy", 1);

// ✅ Helmet Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Diagnostic helper: Assert that middleware or route handler is a valid function before mounting
function assertMiddleware(name, handler) {
  if (typeof handler !== "function") {
    throw new TypeError(
      `[Startup Error] Middleware/Router '${name}' must be a function, but received type '${typeof handler}'. Check CommonJS exports in the module.`
    );
  }
  return handler;
}

const { generalApiLimiter } = require("./middleware/rateLimiterMiddleware");

// ✅ DB connection
const connectDB = require("./config/db");

// ✅ Routes
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const insightRoutes = require("./routes/insightRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const mockRoutes = require("./routes/mockRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const statementRoutes = require("./routes/statementRoutes");
const aiAdvisorRoutes = require("./routes/aiAdvisorRoutes");

// ================= MIDDLEWARE =================

// ✅ JSON parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("👉 Incoming:", req.method, req.url);
    next();
  });
}

// ✅ DB connection middleware for serverless execution
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection middleware error:", err);
    res.status(500).json({ success: false, message: "Database connection failure" });
  }
});

// ✅ Performance Monitoring Middleware (Logs requests > 800ms)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 800) {
      console.warn(`⚠️ [SLOW REQUEST] ${req.method} ${req.originalUrl} took ${duration}ms (${res.statusCode})`);
    }
  });
  next();
});

// ✅ CORS — allow local, custom CLIENT_URL, and Vercel domains dynamically
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost:") ||
      (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) ||
      /\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error("CORS Policy violation"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Cookie parser
app.use(cookieParser());

// Apply global general API rate limiter with explicit type assertion
app.use("/api/v1/", assertMiddleware("generalApiLimiter", generalApiLimiter));

// ================= HEALTH CHECK ROUTES =================
// Support root /health, /api/health, and /api/v1/health for direct service and rewritten health monitoring
const healthHandler = (req, res) => res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);
app.get("/api/v1/health", healthHandler);

// ================= ROUTES =================
app.use("/api/v1/auth", assertMiddleware("authRoutes", authRoutes));
app.use("/api/v1/dashboard", assertMiddleware("dashboardRoutes", dashboardRoutes));
app.use("/api/v1/expenses", assertMiddleware("expenseRoutes", expenseRoutes));
app.use("/api/v1/income", assertMiddleware("incomeRoutes", incomeRoutes));
app.use("/api/v1/budgets", assertMiddleware("budgetRoutes", budgetRoutes));
app.use("/api/v1/insights", assertMiddleware("insightRoutes", insightRoutes));
app.use("/api/v1/transactions", assertMiddleware("transactionRoutes", transactionRoutes));
app.use("/api/v1/mock", assertMiddleware("mockRoutes", mockRoutes));
app.use("/api/v1/notifications", assertMiddleware("notificationRoutes", notificationRoutes));
app.use("/api/v1/statements", assertMiddleware("statementRoutes", statementRoutes));
app.use("/api/v1/ai", assertMiddleware("aiAdvisorRoutes", aiAdvisorRoutes));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  connectDB().then(async () => {
    const MockBankAccount = require("./models/MockBankAccount");
    await MockBankAccount.seedMockData();
  });

  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    const { verifyEmailConfig } = require("./services/emailService");
    const { initScheduler } = require("./services/schedulerService");
    await verifyEmailConfig();
    initScheduler();

    console.log("\n[Notifications] Email routes registered:");
    console.log("  GET  /api/v1/notifications/email-status");
    console.log("  GET  /api/v1/notifications/preferences");
    console.log("  PUT  /api/v1/notifications/preferences\n");
  });
}
