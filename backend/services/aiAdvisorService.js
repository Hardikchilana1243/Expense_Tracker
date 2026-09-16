const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Budget = require("../models/Budget");

const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getPreviousMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
};

const getGrowthPercent = (current, previous) => {
  if (!previous) return 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const buildRecommendations = (summary, categories, merchants) => {
  const recommendations = [];

  if (summary.savingsRate < 15) {
    recommendations.push({
      id: "save-more",
      title: "Increase your savings buffer",
      message: `Your savings rate is ${summary.savingsRate.toFixed(1)}%. Try to redirect at least 10% of discretionary spend into savings.`,
      impact: "High",
    });
  }

  if (categories.length > 0) {
    const topCategory = categories[0];
    if (topCategory.amount > summary.totalExpense * 0.3) {
      recommendations.push({
        id: "lower-top-category",
        title: `Reduce ${topCategory.category} spending`,
        message: `You are spending ${fmtCurrency(topCategory.amount)} on ${topCategory.category}. A 10% reduction could unlock ${fmtCurrency(topCategory.amount * 0.1)} monthly.`,
        impact: "Medium",
      });
    }
  }

  if (merchants.length > 0) {
    const topMerchant = merchants[0];
    recommendations.push({
      id: "review-merchant",
      title: `Review ${topMerchant.merchant} usage`,
      message: `${topMerchant.merchant} appears ${topMerchant.count} times in your recent activity. Consider consolidating repeated purchases.`,
      impact: "Medium",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "steady",
      title: "Your spending pattern looks healthy",
      message: "You are maintaining a balanced spending rhythm. Keep tracking your habits for stronger savings.",
      impact: "Low",
    });
  }

  return recommendations;
};

const buildBudgetRecommendation = (income, categories) => {
  const base = income > 0 ? income : 1;
  const categoryBudgets = categories.slice(0, 5).map((item) => ({
    category: item.category,
    recommendedBudget: Math.round((item.amount / Math.max(base, 1)) * 10000),
  }));

  const savingsBudget = Math.round(base * 0.25);
  const totalRecommended = categoryBudgets.reduce((sum, item) => sum + item.recommendedBudget, 0) + savingsBudget;

  return {
    income,
    savings: savingsBudget,
    categories: categoryBudgets,
    totalRecommended: totalRecommended,
    note: totalRecommended > income ? "Adjust discretionary categories to stay within your income" : "Your recommended budget stays within your income range",
  };
};

const buildForecast = (summary, trendData) => {
  const currentExpense = summary.totalExpense;
  const projectedExpense = currentExpense * 1.7;
  const expectedSavings = Math.max(0, summary.totalIncome - projectedExpense);
  const expectedBalance = summary.totalIncome - projectedExpense;
  const expectedIncome = summary.totalIncome * 1.02;
  const confidence = Math.min(95, 78 + Math.max(0, trendData.length));

  return {
    currentExpense,
    projectedExpense,
    expectedSavings,
    expectedBalance,
    expectedIncome,
    confidence,
    label: projectedExpense > currentExpense ? "Spending trend is accelerating" : "Spending is stable",
  };
};

const buildHealthScore = (summary, categories, recurringExpenses) => {
  let score = 70;
  if (summary.savingsRate >= 20) score += 10;
  else if (summary.savingsRate >= 10) score += 5;

  if (summary.expenseRatio <= 70) score += 8;
  else if (summary.expenseRatio <= 85) score += 4;

  if (categories.length > 0) score += 3;
  if (recurringExpenses.length > 0) score += 2;

  const cappedScore = Math.min(100, score);
  let status = "Needs attention";
  if (cappedScore >= 85) status = "Excellent";
  else if (cappedScore >= 70) status = "Good";
  else if (cappedScore >= 55) status = "Fair";

  return {
    score: cappedScore,
    status,
    explanation: [
      `Savings rate is ${summary.savingsRate.toFixed(1)}%.`,
      categories[0] ? `Your biggest category is ${categories[0].category}.` : "Your spending is diversified.",
      recurringExpenses.length > 0 ? "Recurring obligations are present but manageable." : "No recurring obligations detected.",
    ],
  };
};

const buildAnalytics = (expenses, incomes) => {
  const merchantCounts = {};
  const categoryCounts = {};
  const dailySpend = {};
  const weeklySpend = {};
  const recurringExpenses = [];

  expenses.forEach((expense) => {
    const merchant = expense.description || "Uncategorized";
    merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;

    const category = expense.category || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    const dateValue = expense.date ? new Date(expense.date) : new Date();
    if (Number.isNaN(dateValue.getTime())) {
      return;
    }

    const dayKey = dateValue.toISOString().slice(0, 10);
    dailySpend[dayKey] = (dailySpend[dayKey] || 0) + expense.amount;

    const weekKey = `${dateValue.getFullYear()}-W${Math.ceil((dateValue.getDate() + 6) / 7)}`;
    weeklySpend[weekKey] = (weeklySpend[weekKey] || 0) + expense.amount;

    if (expense.description && /bill|subscription|rent|emi|loan|insurance|utility/i.test(expense.description)) {
      recurringExpenses.push({ description: expense.description, amount: expense.amount });
    }
  });

  const topMerchant = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1])[0];
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const highestDay = Object.entries(dailySpend).sort((a, b) => b[1] - a[1])[0];
  const highestWeek = Object.entries(weeklySpend).sort((a, b) => b[1] - a[1])[0];

  return {
    highestSpendingDay: highestDay ? { date: highestDay[0], amount: highestDay[1] } : null,
    highestSpendingWeek: highestWeek ? { week: highestWeek[0], amount: highestWeek[1] } : null,
    highestSpendingMerchant: topMerchant ? { merchant: topMerchant[0], count: topMerchant[1] } : null,
    highestSpendingCategory: topCategory ? { category: topCategory[0], count: topCategory[1] } : null,
    mostFrequentMerchant: topMerchant ? { merchant: topMerchant[0], count: topMerchant[1] } : null,
    mostFrequentCategory: topCategory ? { category: topCategory[0], count: topCategory[1] } : null,
    recurringExpenses,
    cashFlowTrend: incomes.length && expenses.length ? (incomes.reduce((sum, item) => sum + item.amount, 0) - expenses.reduce((sum, item) => sum + item.amount, 0)) : 0,
  };
};

const calculateMonthlyAnalysis = ({ currentExpenses = [], previousExpenses = [], currentIncomes = [], previousIncomes = [] }) => {
  const totalExpense = currentExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = currentIncomes.reduce((sum, item) => sum + item.amount, 0);
  const previousExpense = previousExpenses.reduce((sum, item) => sum + item.amount, 0);
  const previousIncome = previousIncomes.reduce((sum, item) => sum + item.amount, 0);

  const categories = Object.entries(
    currentExpenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {})
  ).map(([category, amount]) => ({ category, amount }));

  const merchants = Object.entries(
    currentExpenses.reduce((acc, item) => {
      const merchant = item.description || "Uncategorized";
      acc[merchant] = (acc[merchant] || 0) + 1;
      return acc;
    }, {})
  ).map(([merchant, count]) => ({ merchant, count }));

  const sortedCategories = categories.sort((a, b) => b.amount - a.amount);
  const sortedMerchants = merchants.sort((a, b) => b.count - a.count);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const biggestExpenseCategory = sortedCategories[0] || null;
  const biggestMerchant = sortedMerchants[0] || null;
  const averageDailySpending = totalExpense / 30;
  const averageWeeklySpending = totalExpense / 4;
  const averageMonthlySpending = totalExpense;
  const expenseGrowth = getGrowthPercent(totalExpense, previousExpense);
  const incomeGrowth = getGrowthPercent(totalIncome, previousIncome);

  const summary = {
    totalIncome,
    totalExpense,
    savingsRate,
    expenseRatio,
    biggestExpenseCategory,
    biggestMerchant,
    averageDailySpending,
    averageWeeklySpending,
    averageMonthlySpending,
    expenseGrowth,
    incomeGrowth,
  };

  return {
    summary,
    recommendations: buildRecommendations(summary, sortedCategories, sortedMerchants),
    budgetRecommendation: buildBudgetRecommendation(totalIncome, sortedCategories),
    forecast: buildForecast(summary, []),
    financialHealth: buildHealthScore(summary, sortedCategories, []),
    analytics: buildAnalytics(currentExpenses, currentIncomes),
  };
};

const fetchAdvisorData = async (userId) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const { start: currentStart, end: currentEnd } = getMonthRange(now);
  const { start: previousStart, end: previousEnd } = getPreviousMonthRange(now);

  const [currentExpenses, previousExpenses, currentIncomes, previousIncomes, budgets] = await Promise.all([
    Expense.find({ userId: objectId, date: { $gte: currentStart, $lte: currentEnd } }).lean(),
    Expense.find({ userId: objectId, date: { $gte: previousStart, $lte: previousEnd } }).lean(),
    Income.find({ userId: objectId, date: { $gte: currentStart, $lte: currentEnd } }).lean(),
    Income.find({ userId: objectId, date: { $gte: previousStart, $lte: previousEnd } }).lean(),
    Budget.find({ userId: objectId, month: now.getMonth() + 1, year: now.getFullYear() }).lean(),
  ]);

  const analysis = calculateMonthlyAnalysis({
    currentExpenses,
    previousExpenses,
    currentIncomes,
    previousIncomes,
  });

  const summary = {
    ...analysis.summary,
    budgets,
    comparison: {
      incomeGrowth: analysis.summary.incomeGrowth,
      expenseGrowth: analysis.summary.expenseGrowth,
      savingsImprovement: analysis.summary.savingsRate - (previousIncomes.reduce((sum, item) => sum + item.amount, 0) > 0 ? (((previousIncomes.reduce((sum, item) => sum + item.amount, 0) - previousExpenses.reduce((sum, item) => sum + item.amount, 0)) / previousIncomes.reduce((sum, item) => sum + item.amount, 0)) * 100) : 0),
    },
  };

  return {
    summary,
    recommendations: analysis.recommendations,
    forecast: analysis.forecast,
    budgetRecommendation: analysis.budgetRecommendation,
    financialHealth: analysis.financialHealth,
    analytics: analysis.analytics,
  };
};

module.exports = {
  calculateMonthlyAnalysis,
  fetchAdvisorData,
};
