const { fetchAdvisorData } = require("../services/aiAdvisorService");

const parseUserId = (req, res) => {
  const userId = req.params.userId || req.query.userId || req.userId;
  if (!userId) {
    res.status(400).json({ success: false, message: "User ID is required" });
    return null;
  }
  return userId;
};

const respond = async (req, res, handler) => {
  try {
    const userId = parseUserId(req, res);
    if (!userId) return;
    const data = await handler(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("AI Advisor Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate AI advisor insights" });
  }
};

exports.getAdvisorSummary = (req, res) => respond(req, res, (userId) => fetchAdvisorData(userId));
exports.getAdvisorRecommendations = (req, res) => respond(req, res, async (userId) => {
  const data = await fetchAdvisorData(userId);
  return data.recommendations;
});
exports.getAdvisorForecast = (req, res) => respond(req, res, async (userId) => {
  const data = await fetchAdvisorData(userId);
  return data.forecast;
});
exports.getFinancialHealth = (req, res) => respond(req, res, async (userId) => {
  const data = await fetchAdvisorData(userId);
  return data.financialHealth;
});
