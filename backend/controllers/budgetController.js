const budgetService = require("../services/budgetService");

exports.getBudgets = async (req, res) => {
  try {
    const { userId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const result = await budgetService.getBudgetsWithSpent(userId, month, year);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("getBudgets error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch budgets" });
  }
};

exports.createOrUpdateBudget = async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, limit, month, year } = req.body;

    const budget = await budgetService.createOrUpdateBudget(userId, { category, limit, month, year });
    res.status(200).json({ success: true, data: budget, message: "Budget saved successfully" });
  } catch (err) {
    console.error("createOrUpdateBudget error:", err);
    res.status(500).json({ success: false, message: "Failed to save budget" });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { userId, budgetId } = req.params;
    const deleted = await budgetService.deleteBudget(userId, budgetId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Budget not found" });
    }

    res.json({ success: true, message: "Budget deleted successfully" });
  } catch (err) {
    console.error("deleteBudget error:", err);
    res.status(500).json({ success: false, message: "Failed to delete budget" });
  }
};

exports.getBudgetAlerts = async (req, res) => {
  try {
    const { userId } = req.params;
    const alerts = await budgetService.getBudgetAlerts(userId);
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error("getBudgetAlerts error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch budget alerts" });
  }
};
