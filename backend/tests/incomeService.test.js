const test = require("node:test");
const assert = require("node:assert/strict");
const incomeService = require("../services/incomeService");

test("incomeService module exports required CRUD functions", () => {
  assert.equal(typeof incomeService.getIncomeByUser, "function");
  assert.equal(typeof incomeService.createIncome, "function");
  assert.equal(typeof incomeService.updateIncome, "function");
  assert.equal(typeof incomeService.deleteIncome, "function");
});
