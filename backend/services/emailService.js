/**
 * Check if email provider is configured in environment
 */
const isSmtpConfigured = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  return Boolean(
    host &&
    user &&
    pass &&
    user !== "your-email@example.com" &&
    user !== "your-email@gmail.com" &&
    pass !== "your-app-password"
  );
};

const isResendConfigured = () => {
  const key = (process.env.RESEND_API_KEY || "").trim();
  return Boolean(key && key !== "your-resend-api-key" && key !== "re_123456789");
};

const isEmailConfigured = () => isSmtpConfigured() || isResendConfigured();

/**
 * Send Monthly Financial Report via Email using Nodemailer (SMTP) or Resend API
 */
const sendMonthlyEmailReport = async (userEmail, reportData, userName) => {
  if (!userEmail) {
    throw new Error("User email is required");
  }

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "reports@expensetracker.com";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5; text-align: center;">📊 Monthly Financial Report</h2>
      <p style="text-align: center; color: #64748b; font-size: 14px;">Period: <strong>${reportData.monthName} ${reportData.year}</strong></p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
      
      <p>Hello <strong>${userName || "Valued User"}</strong>,</p>
      <p>Here is your monthly financial performance summary:</p>

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 5px 0;">💵 <strong>Total Income:</strong> ${fmt(reportData.summary.totalIncome)}</p>
        <p style="margin: 5px 0;">💸 <strong>Total Expenses:</strong> ${fmt(reportData.summary.totalExpense)}</p>
        <p style="margin: 5px 0;">💰 <strong>Net Savings:</strong> ${fmt(reportData.summary.netSavings)} (${reportData.summary.savingsRate}% Savings Rate)</p>
      </div>

      <h4 style="color: #1e293b;">Top Spending Categories</h4>
      <ul>
        ${reportData.topCategories.map(c => `<li><strong>${c.category}:</strong> ${fmt(c.amount)}</li>`).join("") || "<li>No expense data</li>"}
      </ul>

      <h4 style="color: #1e293b;">💡 Financial Recommendation</h4>
      <p style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 10px; color: #15803d; font-size: 14px;">
        ${reportData.aiAnalysis?.recommendations[0] || "Maintain your tracking habit to stay on top of budget goals!"}
      </p>

      <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px;">
        Expense Tracker Inc. • Automated Financial Insights
      </p>
    </div>
  `;

  // 1. Resend API
  if (isResendConfigured()) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [userEmail],
          subject: `Monthly Financial Report - ${reportData.monthName} ${reportData.year}`,
          html: htmlContent,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Resend API Error:", resData);
        const err = new Error(resData?.message || "Failed to send email via Resend API");
        err.code = "EMAIL_API_ERROR";
        throw err;
      }
      return { success: true, providerMessageId: resData.id || null };
    } catch (err) {
      console.error("Resend API delivery error:", err.message);
      throw err;
    }
  }

  // 2. Nodemailer SMTP
  if (isSmtpConfigured()) {
    try {
      const nodemailer = require("nodemailer");
      const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
      const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
      const user = process.env.SMTP_USER || process.env.EMAIL_USER;
      const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from: `"Expense Tracker Reports" <${fromAddress}>`,
        to: userEmail,
        subject: `Monthly Financial Report - ${reportData.monthName} ${reportData.year}`,
        html: htmlContent,
      });

      return { success: true, providerMessageId: info.messageId || null };
    } catch (err) {
      console.error("Nodemailer SMTP Error:", err.message);
      const errObj = new Error(err.message || "Failed to deliver email via SMTP");
      errObj.code = "EMAIL_SMTP_ERROR";
      throw errObj;
    }
  }

  const err = new Error("Email delivery service is not configured. Missing SMTP or Resend credentials.");
  err.code = "EMAIL_PROVIDER_NOT_CONFIGURED";
  throw err;
};

/**
 * Verify SMTP connection safely without exposing passwords
 */
const verifyEmailConfig = async () => {
  if (isResendConfigured()) {
    console.log("[Email] Resend API configuration: READY");
    return { configured: true, provider: "resend", connected: true, message: "Resend API configured." };
  }

  if (isSmtpConfigured()) {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.verify();
      console.log(`[Email] SMTP configuration: READY (Host: ${host}, Port: ${port}, User: ${user})`);
      return {
        configured: true,
        provider: "smtp",
        connected: true,
        host,
        port,
        user,
        message: "SMTP server is ready to deliver messages.",
      };
    } catch (err) {
      console.error(`[Email] SMTP configuration: CONNECTION ERROR (${err.message})`);
      return {
        configured: true,
        provider: "smtp",
        connected: false,
        host,
        port,
        user,
        error: err.message,
      };
    }
  }

  console.log("[Email] SMTP configuration: NOT CONFIGURED");
  return {
    configured: false,
    connected: false,
    message: "Email delivery credentials not configured in environment variables.",
  };
};

module.exports = {
  isEmailConfigured,
  verifyEmailConfig,
  sendMonthlyEmailReport,
};
