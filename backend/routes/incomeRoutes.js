const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const incomeService = require("../services/incomeService");
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

const createIncomeValidation = validate([
  sanitizedStringRule("source", "Income Source"),
  amountRule("amount"),
  optionalStringRule("description"),
]);

const updateIncomeValidation = validate([
  sanitizedStringRule("source", "Income Source"),
  amountRule("amount"),
  optionalStringRule("description"),
]);

// Bulk delete selected income items
router.delete("/bulk", async (req, res) => {
  try {
    const requestingUserId = req.userId;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No income IDs provided for deletion" });
    }

    const result = await incomeService.deleteBulkIncome(requestingUserId, ids);
    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} income items deleted successfully.`,
    });
  } catch (error) {
    console.error("Bulk delete income error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete income items" });
  }
});

// Bulk delete all filtered income items
router.delete("/bulk-filtered", async (req, res) => {
  try {
    const requestingUserId = req.userId;
    const { search, category, dateRange, dateFrom, dateTo } = req.body || {};
    const result = await incomeService.deleteFilteredIncome(requestingUserId, {
      search,
      category,
      dateRange,
      dateFrom,
      dateTo,
    });
    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} filtered income items deleted successfully.`,
    });
  } catch (error) {
    console.error("Bulk delete filtered income error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete filtered income items" });
  }
});

// Get all income for a user (supports filtering, search, sorting, pagination)
router.get("/:userId", validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await incomeService.getIncomeByUser(userId, req.query);

    if (result && typeof result === "object" && !Array.isArray(result) && result.data) {
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        totalIncome: result.totalIncome,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get income error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch income" });
  }
});

// Add new income
router.post("/:userId", validateUserId, createIncomeValidation, async (req, res) => {
  try {
    const { userId } = req.params;
    const { source, amount, description } = req.body;

    const newIncome = await incomeService.createIncome(userId, { source, amount, description });

    try {
      const { createNotification } = require("../controllers/notificationController");
      createNotification(
        userId,
        "income",
        "💰 Income Credited",
        `Your account has been credited with ₹${parseFloat(amount).toLocaleString()} from ${source}.`
      );
    } catch (notificationErr) {
      console.error("Failed to trigger income notification:", notificationErr);
    }

    res.status(201).json({ success: true, data: newIncome });
  } catch (error) {
    console.error("Add income error:", error);
    res.status(500).json({ success: false, message: "Failed to add income" });
  }
});

// Update income
router.put("/:incomeId", validateMongoId("incomeId"), updateIncomeValidation, async (req, res) => {
  try {
    const { incomeId } = req.params;
    const requestingUserId = req.userId;
    const { source, amount, description } = req.body;

    const updatedIncome = await incomeService.updateIncome(incomeId, requestingUserId, { source, amount, description });

    if (!updatedIncome) {
      return res.status(404).json({ success: false, message: "Income not found" });
    }

    res.json({ success: true, data: updatedIncome });
  } catch (error) {
    if (error.code === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error("Update income error:", error);
    res.status(500).json({ success: false, message: "Failed to update income" });
  }
});

// Delete income
router.delete("/:incomeId", validateMongoId("incomeId"), async (req, res) => {
  try {
    const { incomeId } = req.params;
    const requestingUserId = req.userId;

    const deleted = await incomeService.deleteIncome(incomeId, requestingUserId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Income not found" });
    }

    res.json({ success: true, message: "Income deleted successfully" });
  } catch (error) {
    if (error.code === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error("Delete income error:", error);
    res.status(500).json({ success: false, message: "Failed to delete income" });
  }
});

module.exports = router;
