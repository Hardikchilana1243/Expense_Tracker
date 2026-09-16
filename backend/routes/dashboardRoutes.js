const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getExpensesByCategory,
  getIncomeVsExpense,
  getSpendingTrends,
  getSummaryStats,
  getTransactions,
  getDashboardOverview,
} = require("../controllers/dashboardController");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const mongoose = require("mongoose");

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get consolidated dashboard overview (1-request load)
router.get("/overview/:userId", getDashboardOverview);

// Get dashboard summary (all-time totals)
router.get("/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;

    // Check if user is accessing their own data
    if (userId !== requestingUserId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Calculate total income
    const incomeData = await Income.aggregate([
      { $match: { userId: objectId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalIncome = incomeData.length > 0 ? incomeData[0].total : 0;

    // Calculate total expense
    const expenseData = await Expense.aggregate([
      { $match: { userId: objectId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpense = expenseData.length > 0 ? expenseData[0].total : 0;

    const balance = totalIncome - totalExpense;

    res.json({
      success: true,
      data: {
        totalBalance: balance,
        totalIncome,
        totalExpense,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get recent transactions (both income and expenses)
router.get("/transactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;

    // Check if user is accessing their own data
    if (userId !== requestingUserId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Get expenses and income for the user
    const expenses = await Expense.find({ userId: objectId });
    const income = await Income.find({ userId: objectId });

    // Combine and format transactions
    const transactions = [
      ...expenses.map((e) => ({
        _id: e._id,
        amount: e.amount,
        description: e.description,
        type: "expense",
        category: e.category,
        paymentMethod: e.paymentMethod,
        date: e.date,
        createdAt: e.createdAt,
      })),
      ...income.map((i) => ({
        _id: i._id,
        amount: i.amount,
        description: i.description,
        type: "income",
        source: i.source,
        date: i.date,
        createdAt: i.createdAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get recent 10 transactions
    const recentTransactions = transactions.slice(0, 10);

    res.json({
      success: true,
      data: recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard transactions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================== CHART DATA ENDPOINTS ==================

// 1. Get expenses by category (for Pie Chart)
router.get("/expenses-by-category/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;

    if (userId !== requestingUserId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Aggregate expenses by category
    const categoryData = await Expense.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: "$category",
          value: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { value: -1 } },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: 1,
          count: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: categoryData,
    });
  } catch (error) {
    console.error("Expenses by category error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get income vs expense monthly comparison (for Bar Chart)
router.get("/income-vs-expense/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;

    if (userId !== requestingUserId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Get expenses by month
    const expenseByMonth = await Expense.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    // Get income by month
    const incomeByMonth = await Income.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    // Combine and format for chart
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = {};

    // Add expenses
    expenseByMonth.forEach((item) => {
      const key = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      if (!chartData[key]) {
        chartData[key] = { month: key, expense: 0, income: 0 };
      }
      chartData[key].expense = item.amount;
    });

    // Add income
    incomeByMonth.forEach((item) => {
      const key = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      if (!chartData[key]) {
        chartData[key] = { month: key, expense: 0, income: 0 };
      }
      chartData[key].income = item.amount;
    });

    // Get last 12 months
    const data = Object.values(chartData).reverse().slice(-12);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Income vs expense error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get spending trends (daily for last 30 days - for Line Chart)
router.get("/spending-trends/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;

    if (userId !== requestingUserId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get daily expense totals for last 30 days
    const trendData = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format for chart
    const formattedData = trendData.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day);
      const dateStr = date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
      return {
        date: dateStr,
        amount: item.amount,
      };
    });

    res.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Spending trends error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Get summary statistics for cards (for quick stats)
router.get("/summary-stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;

    if (userId !== requestingUserId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Get this month's data
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthExpense = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: currentMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const thisMonthIncome = await Income.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: currentMonthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Get last month's data
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const lastMonthExpense = await Expense.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Get highest expense category
    const highestCategory = await Expense.aggregate([
      { $match: { userId: objectId } },
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
        thisMonthExpense: thisMonthExpense[0]?.total || 0,
        thisMonthIncome: thisMonthIncome[0]?.total || 0,
        lastMonthExpense: lastMonthExpense[0]?.total || 0,
        highestCategory: highestCategory[0]?._id || "N/A",
        highestCategoryAmount: highestCategory[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Summary stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
