const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getSmartInsights } = require("../controllers/insightController");

// Protected routes
router.use(authMiddleware);

// GET /api/v1/insights/:userId
router.get("/:userId", getSmartInsights);
// Dual export compatibility: direct Express router function, default export, and named export
router.default = router;
router.router = router;

module.exports = router;
module.exports.default = router;
module.exports.router = router;
