const User = require("../models/User");
const ReportHistory = require("../models/ReportHistory");
const { generateMonthlyFinancialReport } = require("./reportService");
const { sendMonthlyEmailReport } = require("./emailService");

/**
 * Dispatch Monthly Financial Report for a single specified User ID (for Test Dispatch Report)
 */
const dispatchUserMonthlyReport = async (userId, targetMonth, targetYear) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const settings = user.notificationSettings || {};
  const reportPref = settings.monthlyReport || {};

  const reportData = await generateMonthlyFinancialReport(user._id, targetMonth, targetYear);
  const month = reportData.month;
  const year = reportData.year;

  const channels = {
    email: {
      attempted: false,
      success: false,
      status: "disabled",
      recipient: user.email || null,
      providerMessageId: null,
      message: null,
      code: null,
    },
  };

  // Email Channel (Independent execution)
  if (reportPref.email && user.email) {
    channels.email.attempted = true;
    try {
      console.log(`[Dispatch] Initiating email delivery for user ${user._id} (${user.email})...`);
      const emailRes = await sendMonthlyEmailReport(user.email, reportData, user.fullName);
      
      await ReportHistory.findOneAndUpdate(
        { userId: user._id, month, year, channel: "email" },
        {
          recipient: user.email,
          status: "sent",
          sentAt: new Date(),
          providerMessageId: emailRes.providerMessageId || null,
          failureReason: null,
        },
        { upsert: true, new: true }
      );

      channels.email.success = true;
      channels.email.status = "sent";
      channels.email.providerMessageId = emailRes.providerMessageId || null;
      channels.email.message = `Email report successfully delivered to ${user.email}`;
      console.log(`[Dispatch] Email report delivered to ${user.email} (Provider ID: ${emailRes.providerMessageId || "N/A"})`);
    } catch (emailErr) {
      console.error(`❌ Email report delivery failed for ${user.email}:`, emailErr.message);
      await ReportHistory.findOneAndUpdate(
        { userId: user._id, month, year, channel: "email" },
        {
          recipient: user.email,
          status: "failed",
          sentAt: new Date(),
          failureReason: emailErr.message,
          providerMessageId: null,
        },
        { upsert: true, new: true }
      );

      channels.email.success = false;
      channels.email.status = "failed";
      channels.email.code = emailErr.code || "EMAIL_DELIVERY_FAILED";
      channels.email.message = emailErr.message || "Email delivery failed";
    }
  } else {
    channels.email.message = "Monthly Email Report is disabled in your settings.";
  }

  const overallSuccess = channels.email.success;
  const overallStatus = channels.email.success ? "SUCCESS" : "FAILED";

  return {
    success: overallSuccess,
    overallStatus,
    channels,
    email: channels.email,
  };
};

/**
 * Execute Monthly Financial Report Dispatch for all eligible users (Scheduled Job)
 */
const runMonthlyReportJob = async (targetMonth, targetYear) => {
  const now = new Date();
  const month = targetMonth || now.getMonth() + 1;
  const year = targetYear || now.getFullYear();

  console.log(`\n🤖 [SCHEDULER] Starting Monthly Report Dispatch for ${month}/${year}...`);

  const users = await User.find({
    "notificationSettings.monthlyReport.email": true,
  });

  let emailCount = 0;

  for (const user of users) {
    try {
      const res = await dispatchUserMonthlyReport(user._id, month, year);
      if (res.email?.success) emailCount++;
    } catch (userErr) {
      console.error(`❌ Error dispatching report for user ${user._id}:`, userErr.message);
    }
  }

  console.log(`✅ [SCHEDULER] Dispatch complete: ${emailCount} Emails sent.\n`);
  return { emailCount };
};

/**
 * Check and run scheduled monthly reports for all users based on their dayOfMonth preference
 */
const checkAndRunScheduledReports = async () => {
  try {
    const now = new Date();
    const currentDay = now.getDate(); // 1 - 31
    const currentMonth = now.getMonth() + 1; // 1 - 12
    const currentYear = now.getFullYear();

    const users = await User.find({
      "notificationSettings.monthlyReport.email": true,
    });

    for (const user of users) {
      const settings = user.notificationSettings || {};
      const reportPref = settings.monthlyReport || {};
      const userScheduledDay = reportPref.dayOfMonth || 1;

      // Only run if today is the user's scheduled day of the month
      if (currentDay === userScheduledDay) {
        if (reportPref.email && user.email) {
          const alreadySentEmail = await ReportHistory.findOne({
            userId: user._id,
            month: currentMonth,
            year: currentYear,
            channel: "email",
          });

          if (!alreadySentEmail) {
            await dispatchUserMonthlyReport(user._id, currentMonth, currentYear);
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ [SCHEDULER] Error checking scheduled reports:", err.message);
  }
};

let schedulerInterval = null;
const initScheduler = () => {
  if (schedulerInterval) return; // Prevent duplicate initialization
  console.log("⏰ [SCHEDULER] Initialized background monthly report scheduler.");
  checkAndRunScheduledReports();
  schedulerInterval = setInterval(checkAndRunScheduledReports, 60 * 60 * 1000); // Check hourly
};

module.exports = {
  dispatchUserMonthlyReport,
  runMonthlyReportJob,
  initScheduler,
};
