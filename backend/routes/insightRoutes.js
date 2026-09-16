const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getSmartInsights } = require("../controllers/insightController");

// Protected routes
router.use(authMiddleware);

// GET /api/v1/insights/:userId
router.get("/:userId", getSmartInsights);

module.exports = router;
