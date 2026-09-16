const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const mongoose = require("mongoose");

const getBudgetsWithSpent = async (userId, month, year) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  const budgets = await Budget.find({ userId: objectId, month: m, year: y }).lean();
  if (budgets.length === 0) {
    return { data: [], month: m, year: y };
  }

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);

  const spentByCategory = await Expense.aggregate([
    { $match: { userId: objectId, date: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$category", spent: { $sum: "$amount" } } },
  ]);

  const spentMap = {};
  spentByCategory.forEach((item) => {
    spentMap[item._id] = item.spent;
  });

  const enriched = budgets.map((b) => {
    const spent = spentMap[b.category] || 0;
    const remaining = b.limit - spent;
    const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 999) : 0;

    let alertLevel = "safe";
    if (pct >= 100) alertLevel = "exceeded";
    else if (pct >= 80) alertLevel = "warning";

    return {
      ...b,
      spent,
      remaining,
      percentage: parseFloat(pct.toFixed(1)),
      alertLevel,
    };
  });

  const order = { exceeded: 0, warning: 1, safe: 2 };
  enriched.sort((a, b) => order[a.alertLevel] - order[b.alertLevel]);

  return { data: enriched, month: m, year: y };
};

const createOrUpdateBudget = async (userId, { category, limit, month, year }) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  return Budget.findOneAndUpdate(
    { userId: objectId, category: category.trim(), month: m, year: y },
    { limit, month: m, year: y },
    { upsert: true, new: true, runValidators: true }
  );
};

const deleteBudget = async (userId, budgetId) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const budget = await Budget.findOneAndDelete({ _id: budgetId, userId: objectId });
  return Boolean(budget);
};

const getBudgetAlerts = async (userId) => {
  const { data } = await getBudgetsWithSpent(userId);
  return data.filter((b) => b.alertLevel !== "safe");
};

module.exports = {
  getBudgetsWithSpent,
  createOrUpdateBudget,
  deleteBudget,
  getBudgetAlerts,
};
