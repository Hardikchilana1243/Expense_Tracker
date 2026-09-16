const User = require("../models/User");
const Notification = require("../models/Notification");
const ReportHistory = require("../models/ReportHistory");
const { runMonthlyReportJob, dispatchUserMonthlyReport } = require("../services/schedulerService");

// ================= EXISTING NOTIFICATIONS CRUD =================
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    if (userId !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
    await Notification.findOneAndUpdate({ _id: notificationId, userId }, { read: true });
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
};

exports.createNotification = async (userId, type, title, message) => {
  try {
    await Notification.create({ userId, type, title, message });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

exports.checkBudgetWarning = async (userId, category, amount) => {
  try {
    const Budget = require("../models/Budget");
    const Expense = require("../models/Expense");
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();

    const budget = await Budget.findOne({ userId, category, month: m, year: y });
    if (!budget) return;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const result = await Expense.aggregate([
      { $match: { userId: budget.userId, category, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, totalSpent: { $sum: "$amount" } } },
    ]);

    const totalSpent = result[0]?.totalSpent || 0;
    const pct = (totalSpent / budget.limit) * 100;

    if (pct >= 100) {
      await exports.createNotification(
        userId,
        "budget_warning",
        "🚨 Budget Exceeded",
        `Your budget for ${category} has been exceeded! (Spent: ₹${totalSpent.toLocaleString()} / Limit: ₹${budget.limit.toLocaleString()})`
      );
    } else if (pct >= 80) {
      await exports.createNotification(
        userId,
        "budget_warning",
        "⚠️ Budget Warning",
        `You have used ${pct.toFixed(0)}% of your ${category} budget.`
      );
    }
  } catch (error) {
    console.error("checkBudgetWarning error:", error);
  }
};

// ================= PREFERENCES ENDPOINTS =================

// GET /api/v1/notifications/preferences
exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const prefs = user.notificationSettings || {
      email: { enabled: true },
      monthlyReport: { enabled: true, email: true, dayOfMonth: 1 },
    };

    res.json({
      success: true,
      data: {
        email: user.email,
        notificationSettings: prefs,
      },
    });
  } catch (err) {
    console.error("getPreferences error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch preferences" });
  }
};

// PUT /api/v1/notifications/preferences
exports.updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { emailEnabled, monthlyEmail, dayOfMonth } = req.body;

    user.notificationSettings = user.notificationSettings || {};
    user.notificationSettings.email = user.notificationSettings.email || {};
    user.notificationSettings.monthlyReport = user.notificationSettings.monthlyReport || {};

    if (typeof emailEnabled === "boolean") user.notificationSettings.email.enabled = emailEnabled;
    if (typeof monthlyEmail === "boolean") user.notificationSettings.monthlyReport.email = monthlyEmail;

    if (typeof dayOfMonth === "number" && dayOfMonth >= 1 && dayOfMonth <= 28) {
      user.notificationSettings.monthlyReport.dayOfMonth = dayOfMonth;
    }

    await user.save();

    res.json({
      success: true,
      message: "Preferences saved successfully",
      data: user.notificationSettings,
    });
  } catch (err) {
    console.error("updatePreferences error:", err);
    res.status(500).json({ success: false, message: "Failed to update preferences" });
  }
};

// GET /api/v1/notifications/report-history
exports.getReportHistory = async (req, res) => {
  try {
    const history = await ReportHistory.find({ userId: req.userId }).sort({ sentAt: -1 }).limit(20);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error("getReportHistory error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch report history" });
  }
};

// GET /api/v1/notifications/debug-report-query
exports.getDebugReportQuery = async (req, res) => {
  try {
    const { generateMonthlyFinancialReport } = require("../services/reportService");
    const { month, year } = req.query;
    const reportData = await generateMonthlyFinancialReport(req.userId, month, year);

    res.json({
      success: true,
      data: {
        userId: String(req.userId).slice(0, 6) + "***",
        month: `${reportData.year}-${String(reportData.month).padStart(2, "0")}`,
        monthName: reportData.monthName,
        year: reportData.year,
        transactionsFound: reportData.summary.transactionCount,
        incomeCount: reportData.summary.incomeCount,
        expenseCount: reportData.summary.expenseCount,
        totalIncome: reportData.summary.totalIncome,
        totalExpenses: reportData.summary.totalExpense,
        netSavings: reportData.summary.netSavings,
        savingsRate: reportData.summary.savingsRate,
        topCategories: reportData.topCategories,
      },
    });
  } catch (err) {
    console.error("getDebugReportQuery error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to run debug report query" });
  }
};

// POST /api/v1/notifications/trigger-monthly-reports
exports.triggerMonthlyReports = async (req, res) => {
  try {
    const { month, year } = req.body;
    const dispatchResult = await dispatchUserMonthlyReport(req.userId, month, year);
    res.json({
      success: dispatchResult.success,
      overallStatus: dispatchResult.overallStatus,
      message: "Monthly report test dispatch processed.",
      channels: dispatchResult.channels,
      results: dispatchResult,
    });
  } catch (err) {
    console.error("triggerMonthlyReports error:", err);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || "Failed to trigger monthly report test dispatch",
    });
  }
};

// GET /api/v1/notifications/email-status
exports.getEmailStatus = async (req, res) => {
  try {
    const { verifyEmailConfig } = require("../services/emailService");
    const status = await verifyEmailConfig();
    res.json({ success: true, status });
  } catch (err) {
    console.error("getEmailStatus error:", err);
    res.status(500).json({ success: false, message: "Failed to check email status" });
  }
};

// GET /api/v1/notifications/provider-status
exports.getProviderStatus = async (req, res) => {
  try {
    const { verifyEmailConfig } = require("../services/emailService");
    const emailStatus = await verifyEmailConfig();

    res.json({
      success: true,
      email: emailStatus,
    });
  } catch (err) {
    console.error("getProviderStatus error:", err);
    res.status(500).json({ success: false, message: "Failed to check provider status" });
  }
};

// GET/POST /api/v1/notifications/cron/monthly-reports (Vercel Cron endpoint)
exports.handleVercelCronMonthlyReports = async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      const customHeader = req.headers["x-cron-secret"];
      if (authHeader !== `Bearer ${cronSecret}` && customHeader !== cronSecret) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid CRON_SECRET" });
      }
    }

    const { checkAndRunScheduledReports } = require("../services/schedulerService");
    await checkAndRunScheduledReports();
    res.json({ success: true, message: "Vercel cron monthly reports triggered successfully" });
  } catch (err) {
    console.error("handleVercelCronMonthlyReports error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to trigger cron monthly reports" });
  }
};
