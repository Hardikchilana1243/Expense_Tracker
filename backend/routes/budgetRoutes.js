const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  validate,
  validateUserId,
  validateMongoId,
  amountRule,
  sanitizedStringRule,
} = require("../middleware/validationMiddleware");
const {
  getBudgets,
  createOrUpdateBudget,
  deleteBudget,
  getBudgetAlerts,
} = require("../controllers/budgetController");

// All routes are protected
router.use(authMiddleware);

const createBudgetValidation = validate([
  sanitizedStringRule("category", "Budget Category"),
  amountRule("limit"),
]);

// GET  /api/v1/budgets/:userId          → all budgets with spent data
// POST /api/v1/budgets/:userId          → create or update a budget
router
  .route("/:userId")
  .get(validateUserId, getBudgets)
  .post(validateUserId, createBudgetValidation, createOrUpdateBudget);

// DELETE /api/v1/budgets/:userId/:budgetId
router.delete("/:userId/:budgetId", validateUserId, validateMongoId("budgetId"), deleteBudget);

// GET /api/v1/budgets/:userId/alerts    → only warning/exceeded budgets
router.get("/:userId/alerts", validateUserId, getBudgetAlerts);

module.exports = router;
