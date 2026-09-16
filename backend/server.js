require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ✅ Helmet Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

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

// Apply global general API rate limiter
app.use("/api/v1/", generalApiLimiter);

// ================= ROUTES =================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/income", incomeRoutes);
app.use("/api/v1/budgets", budgetRoutes);
app.use("/api/v1/insights", insightRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/mock", mockRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/statements", statementRoutes);
app.use("/api/v1/ai", aiAdvisorRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "OK" }));

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

