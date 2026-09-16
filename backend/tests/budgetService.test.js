const test = require("node:test");
const assert = require("node:assert/strict");
const budgetService = require("../services/budgetService");

test("budgetService module exports required budget & alert functions", () => {
  assert.equal(typeof budgetService.getBudgetsWithSpent, "function");
  assert.equal(typeof budgetService.createOrUpdateBudget, "function");
  assert.equal(typeof budgetService.deleteBudget, "function");
  assert.equal(typeof budgetService.getBudgetAlerts, "function");
});
