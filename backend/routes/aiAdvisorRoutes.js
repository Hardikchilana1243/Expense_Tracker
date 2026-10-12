const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAdvisorSummary,
  getAdvisorRecommendations,
  getAdvisorForecast,
  getFinancialHealth,
} = require("../controllers/aiAdvisorController");

router.use(authMiddleware);

router.get(["/summary", "/summary/:userId"], getAdvisorSummary);
router.get(["/recommendations", "/recommendations/:userId"], getAdvisorRecommendations);
router.get(["/forecast", "/forecast/:userId"], getAdvisorForecast);
router.get(["/financial-health", "/financial-health/:userId"], getFinancialHealth);
// Dual export compatibility: direct Express router function, default export, and named export
router.default = router;
router.router = router;

module.exports = router;
module.exports.default = router;
module.exports.router = router;
