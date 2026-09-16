const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Budget = require("../models/Budget");

/* ─── Helper: parse userId ─── */
const parseUserId = (userId, res) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({ success: false, message: "Invalid user ID" });
    return null;
  }
  return new mongoose.Types.ObjectId(userId);
};

/* ─── Helper: check ownership ─── */
const checkOwnership = (userId, requestingUserId, res) => {
  if (userId !== requestingUserId.toString()) {
    res.status(403).json({ success: false, message: "Unauthorized access" });
    return false;
  }
  return true;
};

/* ─── Helper: currency formatting for insights ─── */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

exports.getSmartInsights = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    const insights = [];

    const now = new Date();
    // Current month start/end
    const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Previous month start/end
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Fetch data
    const [currExpenses, prevExpenses, budgets] = await Promise.all([
      Expense.find({ userId: objectId, date: { $gte: currMonthStart, $lte: currMonthEnd } }),
      Expense.find({ userId: objectId, date: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
      Budget.find({ userId: objectId, month: now.getMonth() + 1, year: now.getFullYear() }),
    ]);

    // 2. Aggregate Data
    let currTotal = 0;
    const currCategoryMap = {};
    const currDailyMap = {};

    currExpenses.forEach((exp) => {
      currTotal += exp.amount;
      currCategoryMap[exp.category] = (currCategoryMap[exp.category] || 0) + exp.amount;
      
      const day = new Date(exp.date).getDate();
      currDailyMap[day] = (currDailyMap[day] || 0) + exp.amount;
    });

    let prevTotal = 0;
    prevExpenses.forEach((exp) => {
      prevTotal += exp.amount;
    });

    // --- INSIGHT 1: Highest Spending Category (Info/Blue) ---
    if (Object.keys(currCategoryMap).length > 0) {
      const topCategory = Object.keys(currCategoryMap).reduce((a, b) => 
        currCategoryMap[a] > currCategoryMap[b] ? a : b
      );
      insights.push({
        id: "top_category",
        type: "info",
        icon: "📊",
        title: "Top Spending Area",
        message: `Your highest spending this month is on ${topCategory} (${fmt(currCategoryMap[topCategory])}).`,
      });
    }

    // --- INSIGHT 2: Month-over-Month Comparison (Warning or Success) ---
    if (prevTotal > 0) {
      const percentChange = ((currTotal - prevTotal) / prevTotal) * 100;
      if (percentChange > 15) {
        insights.push({
          id: "mom_increase",
          type: "warning",
          icon: "📈",
          title: "Spending Increase",
          message: `You've spent ${percentChange.toFixed(0)}% more than last month. Keep an eye on your expenses.`,
        });
      } else if (percentChange < -10) {
        insights.push({
          id: "mom_decrease",
          type: "suggestion",
          icon: "📉",
          title: "Great Job Saving!",
          message: `Your spending is down by ${Math.abs(percentChange).toFixed(0)}% compared to last month. Keep it up!`,
        });
      }
    }

    // --- INSIGHT 3: Budget Warnings (Danger/Red or Warning/Yellow) ---
    budgets.forEach((budget) => {
      const spent = currCategoryMap[budget.category] || 0;
      const pct = (spent / budget.limit) * 100;
      
      if (pct >= 100) {
        insights.push({
          id: `budget_exceeded_${budget._id}`,
          type: "danger",
          icon: "🚨",
          title: "Budget Exceeded",
          message: `You exceeded your ${budget.category} budget by ${fmt(spent - budget.limit)}.`,
        });
      } else if (pct >= 80) {
        insights.push({
          id: `budget_warning_${budget._id}`,
          type: "warning",
          icon: "⚠️",
          title: "Nearing Budget Limit",
          message: `You have used ${pct.toFixed(0)}% of your ${budget.category} budget.`,
        });
      }
    });

    // --- INSIGHT 4: Unusual Daily Spending (Anomaly Detection) ---
    const daysInMonth = now.getDate(); // Up to today
    if (daysInMonth > 5 && currExpenses.length > 5) {
      const avgDaily = currTotal / daysInMonth;
      
      // Find a day where spending was > 2.5x the average
      let anomalyDay = null;
      let anomalyAmount = 0;
      
      for (const [day, amount] of Object.entries(currDailyMap)) {
        if (amount > avgDaily * 2.5 && amount > 2000) {
          anomalyDay = day;
          anomalyAmount = amount;
          break; // Just report one major anomaly to avoid spam
        }
      }

      if (anomalyDay) {
        insights.push({
          id: "anomaly_detection",
          type: "danger",
          icon: "⚡",
          title: "Unusual Spending Spike",
          message: `Your expense on ${now.toLocaleString('default', { month: 'short' })} ${anomalyDay} was unusually high (${fmt(anomalyAmount)}).`,
        });
      }
    }

    // --- INSIGHT 5: Smart Savings Suggestion (Green) ---
    // Recommend cutting back on the 2nd highest expense if it's over 20% of total
    if (Object.keys(currCategoryMap).length > 1) {
      const sortedCategories = Object.keys(currCategoryMap).sort((a, b) => currCategoryMap[b] - currCategoryMap[a]);
      const secondHighest = sortedCategories[1];
      const amount = currCategoryMap[secondHighest];
      
      if (amount > (currTotal * 0.2)) {
        const potentialSavings = amount * 0.2; // Suggest saving 20% of it
        insights.push({
          id: "savings_suggestion",
          type: "suggestion",
          icon: "💡",
          title: "Savings Opportunity",
          message: `You can save ~${fmt(potentialSavings)} by reducing your ${secondHighest} expenses slightly next month.`,
        });
      }
    }

    // If no insights generated, add a generic positive one
    if (insights.length === 0) {
      insights.push({
        id: "all_good",
        type: "suggestion",
        icon: "🌱",
        title: "On Track",
        message: "You are doing great! Your finances are stable and on track this month.",
      });
    }

    // Prioritize insights: danger > warning > suggestion > info
    const priority = { danger: 0, warning: 1, suggestion: 2, info: 3 };
    insights.sort((a, b) => priority[a.type] - priority[b.type]);

    res.status(200).json({ success: true, data: insights });
  } catch (error) {
    console.error("Smart Insights Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate insights" });
  }
};
