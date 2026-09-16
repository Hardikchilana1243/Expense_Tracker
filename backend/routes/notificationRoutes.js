const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { validateUserId, validateMongoId } = require("../middleware/validationMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  getReportHistory,
  triggerMonthlyReports,
  getDebugReportQuery,
  getEmailStatus,
  getProviderStatus,
  handleVercelCronMonthlyReports,
} = require("../controllers/notificationController");

// System / Vercel Cron Endpoint (Secured by CRON_SECRET)
router.all("/cron/monthly-reports", handleVercelCronMonthlyReports);

// Apply auth middleware to ALL user-facing protected routes
router.use(authMiddleware);

// Diagnostic Provider Configuration Health Routes
router.get("/email-status", getEmailStatus);
router.get("/provider-status", getProviderStatus);

// GET & PUT /api/v1/notifications/preferences
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

// Report Delivery History, Debug & Manual Trigger
router.get("/report-history", getReportHistory);
router.get("/debug-report-query", getDebugReportQuery);
router.post("/trigger-monthly-reports", triggerMonthlyReports);

// Notification Feed CRUD
router.get("/:userId", validateUserId, getNotifications);
router.put("/:userId/read-all", validateUserId, markAllAsRead);
router.put("/:userId/:notificationId/read", validateUserId, validateMongoId("notificationId"), markAsRead);

module.exports = router;
