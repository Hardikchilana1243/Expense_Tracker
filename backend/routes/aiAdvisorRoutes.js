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

module.exports = router;
