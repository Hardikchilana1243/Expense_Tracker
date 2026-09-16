const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { validateUserId } = require("../middleware/validationMiddleware");
const {
  linkBankAccount,
  importTransactions,
  getBankAccounts
} = require("../controllers/mockController");

// Apply auth middleware to ALL routes
router.use(authMiddleware);

// POST /api/v1/mock/:userId/link - Link bank account
router.post("/:userId/link", validateUserId, linkBankAccount);

// POST /api/v1/mock/:userId/import - Import transactions
router.post("/:userId/import", validateUserId, importTransactions);

// GET /api/v1/mock/:userId - Get linked account details
router.get("/:userId", validateUserId, getBankAccounts);

module.exports = router;

