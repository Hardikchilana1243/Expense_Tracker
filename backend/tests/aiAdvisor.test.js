const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateMonthlyAnalysis } = require("../services/aiAdvisorService");

test("calculateMonthlyAnalysis derives growth and recommendations from real transaction arrays", () => {
  const result = calculateMonthlyAnalysis({
    currentExpenses: [
      { amount: 1000, category: "Food", description: "Lunch" },
      { amount: 500, category: "Transport", description: "Metro" },
    ],
    previousExpenses: [{ amount: 800, category: "Food", description: "Lunch" }],
    currentIncomes: [{ amount: 4000 }, { amount: 1000 }],
    previousIncomes: [{ amount: 3500 }],
  });

  assert.equal(result.summary.totalExpense, 1500);
  assert.equal(result.summary.totalIncome, 5000);
  assert.equal(result.summary.expenseGrowth, 87.5);
  assert.equal(result.summary.incomeGrowth, 42.857142857142854);
  assert.ok(result.recommendations.length > 0);
  assert.ok(result.budgetRecommendation.categories.some((item) => item.category === "Food"));
});
