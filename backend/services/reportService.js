const mongoose = require("mongoose");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const { calculateMonthlyAnalysis } = require("./aiAdvisorService");

/**
 * Auto-resolve target report month & year for a user
 * If no explicit month/year is passed, checks current month first.
 * If current month has 0 transactions but user has transactions in DB, resolves to latest month with data.
 */
const resolveReportMonthAndYear = async (objectId, explicitMonth, explicitYear) => {
  const now = new Date();

  if (explicitMonth && explicitYear) {
    return { month: parseInt(explicitMonth, 10), year: parseInt(explicitYear, 10) };
  }

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Check if current month has any transactions
  const startOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
  const startOfNextCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));

  const [currentExpCount, currentIncCount] = await Promise.all([
    Expense.countDocuments({ userId: objectId, date: { $gte: startOfCurrentMonth, $lt: startOfNextCurrentMonth } }),
    Income.countDocuments({ userId: objectId, date: { $gte: startOfCurrentMonth, $lt: startOfNextCurrentMonth } }),
  ]);

  if (currentExpCount + currentIncCount > 0) {
    return { month: currentMonth, year: currentYear };
  }

  // Current month has 0 transactions -> check if user has any transactions in DB
  const [latestExp, latestInc] = await Promise.all([
    Expense.findOne({ userId: objectId }).sort({ date: -1 }).select("date").lean(),
    Income.findOne({ userId: objectId }).sort({ date: -1 }).select("date").lean(),
  ]);

  let latestDate = null;
  if (latestExp?.date && latestInc?.date) {
    latestDate = new Date(latestExp.date) > new Date(latestInc.date) ? new Date(latestExp.date) : new Date(latestInc.date);
  } else if (latestExp?.date) {
    latestDate = new Date(latestExp.date);
  } else if (latestInc?.date) {
    latestDate = new Date(latestInc.date);
  }

  if (latestDate && !Number.isNaN(latestDate.getTime())) {
    const resolvedMonth = latestDate.getUTCMonth() + 1;
    const resolvedYear = latestDate.getUTCFullYear();
    return { month: resolvedMonth, year: resolvedYear };
  }

  return { month: currentMonth, year: currentYear };
};

/**
 * Generate comprehensive monthly financial report strictly scoped for a specific user ID
 */
const generateMonthlyFinancialReport = async (userId, month, year) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error("Invalid User ID");
    err.code = "INVALID_USER_ID";
    throw err;
  }

  const objectId = new mongoose.Types.ObjectId(userId);
  const resolved = await resolveReportMonthAndYear(objectId, month, year);
  const m = resolved.month;
  const y = resolved.year;

  // Robust UTC Month Range [startOfMonth, startOfNextMonth)
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

  // Previous month dates [prevStartDate, prevNextMonthDate)
  const prevDate = new Date(Date.UTC(y, m - 2, 1, 0, 0, 0, 0));
  const prevMonth = prevDate.getUTCMonth() + 1;
  const prevYear = prevDate.getUTCFullYear();
  const prevStartDate = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0, 0));
  const prevEndDate = new Date(Date.UTC(prevYear, prevMonth, 1, 0, 0, 0, 0));

  // Fetch Current Month Data for user
  const currentIncomes = await Income.find({
    userId: objectId,
    date: { $gte: startDate, $lt: endDate },
  }).lean();

  const currentExpenses = await Expense.find({
    userId: objectId,
    date: { $gte: startDate, $lt: endDate },
  }).lean();

  // Fetch Previous Month Data for user
  const previousIncomes = await Income.find({
    userId: objectId,
    date: { $gte: prevStartDate, $lt: prevEndDate },
  }).lean();

  const previousExpenses = await Expense.find({
    userId: objectId,
    date: { $gte: prevStartDate, $lt: prevEndDate },
  }).lean();

  // Fetch Budgets for current month
  const budgets = await Budget.find({
    userId: objectId,
    month: m,
    year: y,
  }).lean();

  // Summary Metrics
  const totalIncome = currentIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const totalExpense = currentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? parseFloat(((Math.max(0, netSavings) / totalIncome) * 100).toFixed(1)) : 0;

  // Safe Debug Logging
  console.log(`[MONTHLY REPORT DEBUG]`);
  console.log(`  userId: ${String(userId).slice(0, 6)}***`);
  console.log(`  requestedPeriod: ${y}-${String(m).padStart(2, "0")}`);
  console.log(`  startDate: ${startDate.toISOString()}`);
  console.log(`  endDate: ${endDate.toISOString()}`);
  console.log(`  totalTransactionsFound: ${currentIncomes.length + currentExpenses.length}`);
  console.log(`  incomeCount: ${currentIncomes.length}, totalIncome: ₹${totalIncome}`);
  console.log(`  expenseCount: ${currentExpenses.length}, totalExpenses: ₹${totalExpense}`);

  // Highest single expense
  let highestExpense = null;
  if (currentExpenses.length > 0) {
    const sorted = [...currentExpenses].sort((a, b) => b.amount - a.amount);
    highestExpense = {
      category: sorted[0].category,
      amount: sorted[0].amount,
      description: sorted[0].description || "Expense",
      date: sorted[0].date,
    };
  }

  // Top spending categories
  const categoryMap = {};
  currentExpenses.forEach((exp) => {
    categoryMap[exp.category] = (categoryMap[exp.category] || 0) + (Number(exp.amount) || 0);
  });

  const topCategories = Object.keys(categoryMap)
    .map((cat) => ({ category: cat, amount: categoryMap[cat] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Budget summary & alerts
  const budgetSummary = budgets.map((b) => {
    const spent = categoryMap[b.category] || 0;
    const pct = b.limit > 0 ? parseFloat(((spent / b.limit) * 100).toFixed(1)) : 0;
    return {
      category: b.category,
      limit: b.limit,
      spent,
      pct,
      isExceeded: pct >= 100,
    };
  });

  // AI Advisor Analysis & Recommendations
  let aiAnalysis = null;
  try {
    aiAnalysis = calculateMonthlyAnalysis({
      currentExpenses,
      previousExpenses,
      currentIncomes,
      previousIncomes,
    });
  } catch (aiErr) {
    console.error("AI Analysis calculation fallback:", aiErr.message);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[m - 1];

  const reportData = {
    userId: String(userId),
    month: m,
    year: y,
    monthName,
    summary: {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      transactionCount: currentIncomes.length + currentExpenses.length,
      incomeCount: currentIncomes.length,
      expenseCount: currentExpenses.length,
    },
    highestExpense,
    topCategories,
    budgetSummary,
    aiAnalysis,
  };

  // Pre-dispatch Validation Assertions
  if (
    typeof reportData.summary.totalIncome !== "number" ||
    Number.isNaN(reportData.summary.totalIncome) ||
    typeof reportData.summary.totalExpense !== "number" ||
    Number.isNaN(reportData.summary.totalExpense) ||
    typeof reportData.summary.netSavings !== "number" ||
    Number.isNaN(reportData.summary.netSavings)
  ) {
    const err = new Error("Report generation failed: Output metrics contain invalid numeric values.");
    err.code = "REPORT_GENERATION_FAILED";
    throw err;
  }

  return reportData;
};

module.exports = {
  generateMonthlyFinancialReport,
  resolveReportMonthAndYear,
};
