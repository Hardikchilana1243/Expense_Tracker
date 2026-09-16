const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const expenseService = require("../services/expenseService");
const {
  validate,
  validateUserId,
  validateMongoId,
  amountRule,
  sanitizedStringRule,
  optionalStringRule,
} = require("../middleware/validationMiddleware");

// Apply auth middleware to all routes
router.use(authMiddleware);

const createExpenseValidation = validate([
  sanitizedStringRule("category", "Expense Category"),
  amountRule("amount"),
  optionalStringRule("description"),
  optionalStringRule("paymentMethod"),
]);

const updateExpenseValidation = validate([
  sanitizedStringRule("category", "Expense Category"),
  amountRule("amount"),
  optionalStringRule("description"),
  optionalStringRule("paymentMethod"),
]);

// Bulk delete selected expense items
router.delete("/bulk", async (req, res) => {
  try {
    const requestingUserId = req.userId;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No expense IDs provided for deletion" });
    }

    const result = await expenseService.deleteBulkExpenses(requestingUserId, ids);
    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} expense items deleted successfully.`,
    });
  } catch (error) {
    console.error("Bulk delete expense error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete expense items" });
  }
});

// Bulk delete all filtered expense items
router.delete("/bulk-filtered", async (req, res) => {
  try {
    const requestingUserId = req.userId;
    const { search, category, dateRange, dateFrom, dateTo } = req.body || {};
    const result = await expenseService.deleteFilteredExpenses(requestingUserId, {
      search,
      category,
      dateRange,
      dateFrom,
      dateTo,
    });
    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} filtered expense items deleted successfully.`,
    });
  } catch (error) {
    console.error("Bulk delete filtered expense error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete filtered expense items" });
  }
});

// Get all expenses for a user (supports filtering, search, sorting, pagination)
router.get("/:userId", validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await expenseService.getExpensesByUser(userId, req.query);

    if (result && typeof result === "object" && !Array.isArray(result) && result.data) {
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        totalExpense: result.totalExpense,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch expenses" });
  }
});

// Add new expense
router.post("/:userId", validateUserId, createExpenseValidation, async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, amount, description, paymentMethod } = req.body;

    const newExpense = await expenseService.createExpense(userId, { category, amount, description, paymentMethod });

    try {
      const { checkBudgetWarning } = require("../controllers/notificationController");
      checkBudgetWarning(userId, category, parseFloat(amount));
    } catch (notificationErr) {
      console.error("Failed to run budget warning check:", notificationErr);
    }

    res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ success: false, message: "Failed to add expense" });
  }
});

// Update expense
router.put("/:expenseId", validateMongoId("expenseId"), updateExpenseValidation, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const requestingUserId = req.userId;
    const { category, amount, description, paymentMethod } = req.body;

    const updatedExpense = await expenseService.updateExpense(expenseId, requestingUserId, { category, amount, description, paymentMethod });

    if (!updatedExpense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    res.json({ success: true, data: updatedExpense });
  } catch (error) {
    if (error.code === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error("Update expense error:", error);
    res.status(500).json({ success: false, message: "Failed to update expense" });
  }
});

// Delete expense
router.delete("/:expenseId", validateMongoId("expenseId"), async (req, res) => {
  try {
    const { expenseId } = req.params;
    const requestingUserId = req.userId;

    const deleted = await expenseService.deleteExpense(expenseId, requestingUserId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    res.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    if (error.code === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error("Delete expense error:", error);
    res.status(500).json({ success: false, message: "Failed to delete expense" });
  }
});

module.exports = router;
