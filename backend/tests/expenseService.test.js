const test = require("node:test");
const assert = require("node:assert/strict");
const expenseService = require("../services/expenseService");

test("expenseService module exports required CRUD functions", () => {
  assert.equal(typeof expenseService.getExpensesByUser, "function");
  assert.equal(typeof expenseService.createExpense, "function");
  assert.equal(typeof expenseService.updateExpense, "function");
  assert.equal(typeof expenseService.deleteExpense, "function");
});
