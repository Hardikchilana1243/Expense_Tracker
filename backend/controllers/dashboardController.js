const Expense = require("../models/Expense");
const Income = require("../models/Income");
const mongoose = require("mongoose");

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

/* ══════════════════════════════════════════════
   GET /dashboard/expenses-by-category/:userId
   Returns pie chart data: array of {name, value}
══════════════════════════════════════════════ */
exports.getExpensesByCategory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    const expenses = await Expense.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: "$total",
        },
      },
      { $sort: { value: -1 } },
    ]);

    res.json({
      success: true,
      data: expenses || [],
    });
  } catch (error) {
    console.error("Get expenses by category error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ══════════════════════════════════════════════
   GET /dashboard/income-vs-expense/:userId
   Returns monthly comparison for last 12 months
   Format: [{month, income, expense}, ...]
══════════════════════════════════════════════ */
exports.getIncomeVsExpense = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    // Get last 12 months of data
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const incomes = await Income.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const expenses = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Create map for months
    const monthMap = {};
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Add last 12 months to map
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = {
        month: monthNames[d.getMonth()],
        income: 0,
        expense: 0,
      };
    }

    // Populate with actual data
    incomes.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap[key]) monthMap[key].income = item.total;
    });

    expenses.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap[key]) monthMap[key].expense = item.total;
    });

    const data = Object.values(monthMap);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get income vs expense error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ══════════════════════════════════════════════
   GET /dashboard/spending-trends/:userId
   Returns daily spending for last 30 days
   Format: [{date, amount}, ...]
══════════════════════════════════════════════ */
exports.getSpendingTrends = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    // Last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expenses = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: thirtyDaysAgo, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Create date map for all 30 days
    const dateMap = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      dateMap[dateStr] = { date: dateStr, amount: 0 };
    }

    // Populate with actual data
    expenses.forEach((item) => {
      if (dateMap[item._id]) {
        dateMap[item._id].amount = item.total;
      }
    });

    const data = Object.values(dateMap).reverse();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get spending trends error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ══════════════════════════════════════════════
   GET /dashboard/summary-stats/:userId
   Returns summary stats for current month vs last month
   Format: {
     thisMonthIncome,
     thisMonthExpense,
     lastMonthIncome,
     lastMonthExpense,
     highestCategory,
     highestCategoryAmount
   }
══════════════════════════════════════════════ */
exports.getSummaryStats = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    const now = new Date();
    
    // Current month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Fetch data
    const thisMonthIncomes = await Income.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: thisMonthStart, $lte: thisMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const thisMonthExpenses = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: thisMonthStart, $lte: thisMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const lastMonthIncomes = await Income.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const lastMonthExpenses = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Get highest expense category this month
    const highestCategory = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: thisMonthStart, $lte: thisMonthEnd },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);

    res.json({
      success: true,
      data: {
        thisMonthIncome: thisMonthIncomes[0]?.total || 0,
        thisMonthExpense: thisMonthExpenses[0]?.total || 0,
        lastMonthIncome: lastMonthIncomes[0]?.total || 0,
        lastMonthExpense: lastMonthExpenses[0]?.total || 0,
        highestCategory: highestCategory[0]?._id || "N/A",
        highestCategoryAmount: highestCategory[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get summary stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ══════════════════════════════════════════════
   GET /dashboard/transactions/:userId
   Returns recent transactions (used for recent tx table)
══════════════════════════════════════════════ */
exports.getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    // Get last 10 transactions
    const incomes = await Income.find({ userId: objectId })
      .select("source amount date description isImported")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    const expenses = await Expense.find({ userId: objectId })
      .select("category amount date description isImported")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // Map and combine
    const allTransactions = [
      ...incomes.map((i) => ({
        ...i,
        type: "income",
        category: i.source,
        _id: i._id,
      })),
      ...expenses.map((e) => ({
        ...e,
        type: "expense",
        _id: e._id,
      })),
    ];

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Take last 10
    const transactions = allTransactions.slice(0, 10);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ══════════════════════════════════════════════
   GET /dashboard/overview/:userId
   Consolidated Dashboard endpoint returning summary, stats, charts, and recent transactions in 1 request
══════════════════════════════════════════════ */
exports.getDashboardOverview = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!checkOwnership(userId, req.userId, res)) return;
    const objectId = parseUserId(userId, res);
    if (!objectId) return;

    const now = new Date();
    const startDate12M = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalIncomeRes,
      totalExpenseRes,
      expensesByCategoryRes,
      incomes12MRes,
      expenses12MRes,
      spendingTrendsRes,
      thisMonthIncomeRes,
      thisMonthExpenseRes,
      lastMonthIncomeRes,
      lastMonthExpenseRes,
      highestCategoryRes,
      recentIncomesRes,
      recentExpensesRes,
    ] = await Promise.all([
      Income.aggregate([{ $match: { userId: objectId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId: objectId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([
        { $match: { userId: objectId } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $project: { _id: 0, name: "$_id", value: "$total" } },
        { $sort: { value: -1 } },
      ]),
      Income.aggregate([
        { $match: { userId: objectId, date: { $gte: startDate12M } } },
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId: objectId, date: { $gte: startDate12M } } },
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId: objectId, date: { $gte: thirtyDaysAgo, $lte: now } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ]),
      Income.aggregate([{ $match: { userId: objectId, date: { $gte: thisMonthStart, $lte: thisMonthEnd } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId: objectId, date: { $gte: thisMonthStart, $lte: thisMonthEnd } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Income.aggregate([{ $match: { userId: objectId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId: objectId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([
        { $match: { userId: objectId, date: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),
      Income.find({ userId: objectId }).select("source amount date description isImported").sort({ date: -1 }).limit(10).lean(),
      Expense.find({ userId: objectId }).select("category amount date description isImported").sort({ date: -1 }).limit(10).lean(),
    ]);

    const totalIncome = totalIncomeRes[0]?.total || 0;
    const totalExpense = totalExpenseRes[0]?.total || 0;
    const totalBalance = totalIncome - totalExpense;

    // Build 12-month Income vs Expense array
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = { month: monthNames[d.getMonth()], income: 0, expense: 0 };
    }
    incomes12MRes.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap[key]) monthMap[key].income = item.total;
    });
    expenses12MRes.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (monthMap[key]) monthMap[key].expense = item.total;
    });

    // Build 30-day Spending Trends array
    const dateMap = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      dateMap[dateStr] = { date: dateStr, amount: 0 };
    }
    spendingTrendsRes.forEach((item) => {
      if (dateMap[item._id]) dateMap[item._id].amount = item.total;
    });

    // Combine recent transactions
    const recentTx = [
      ...recentIncomesRes.map((i) => ({ ...i, type: "income", category: i.source })),
      ...recentExpensesRes.map((e) => ({ ...e, type: "expense" })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: { totalIncome, totalExpense, totalBalance },
        summaryStats: {
          thisMonthIncome: thisMonthIncomeRes[0]?.total || 0,
          thisMonthExpense: thisMonthExpenseRes[0]?.total || 0,
          lastMonthIncome: lastMonthIncomeRes[0]?.total || 0,
          lastMonthExpense: lastMonthExpenseRes[0]?.total || 0,
          highestCategory: highestCategoryRes[0]?._id || "N/A",
          highestCategoryAmount: highestCategoryRes[0]?.total || 0,
        },
        expensesByCategory: expensesByCategoryRes || [],
        incomeVsExpense: Object.values(monthMap),
        spendingTrends: Object.values(dateMap).reverse(),
        transactions: recentTx,
      },
    });
  } catch (error) {
    console.error("Get dashboard overview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
