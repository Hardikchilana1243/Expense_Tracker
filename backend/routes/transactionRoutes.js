const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const transactionService = require("../services/transactionService");
const { validateUserId, validateMongoId } = require("../middleware/validationMiddleware");

// Protect all routes
router.use(authMiddleware);

// POST /api/v1/transactions/reclassify
router.post("/reclassify", async (req, res) => {
  try {
    const userId = req.userId;
    const { onlyOthers = false } = req.body || {};
    const result = await transactionService.reclassifyTransactionsForUser(userId, { onlyOthers });
    res.status(200).json({ success: true, message: `Reclassified ${result.reclassifiedCount} transactions successfully`, data: result });
  } catch (err) {
    console.error("Reclassification error:", err);
    res.status(500).json({ success: false, message: err.message || "Reclassification failed" });
  }
});

// POST /api/v1/transactions/preference
router.post("/preference", async (req, res) => {
  try {
    const userId = req.userId;
    const { merchant, category } = req.body || {};
    if (!merchant || !category) {
      return res.status(400).json({ success: false, message: "Merchant and category are required" });
    }
    const result = await transactionService.saveUserMerchantPreference(userId, merchant, category);
    res.status(200).json({ success: true, message: "Merchant preference saved", data: result });
  } catch (err) {
    console.error("Save merchant preference error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to save merchant preference" });
  }
});

// GET /api/v1/transactions/classification-review
router.get("/classification-review", async (req, res) => {
  try {
    const userId = req.userId;
    const result = await transactionService.getClassificationReviewData(userId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Classification review error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch classification review" });
  }
});

// GET /api/v1/transactions/:userId
router.get("/:userId", validateUserId, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await transactionService.getTransactionsByUser(userId, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("Fetch transactions error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
});

// DELETE /api/v1/transactions/:userId/:type/:id
router.delete("/:userId/:type/:id", validateUserId, validateMongoId("id"), async (req, res) => {
  try {
    const { userId, type, id } = req.params;
    await transactionService.deleteTransaction(userId, type, id);
    res.status(200).json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete transaction" });
  }
});

module.exports = router;
