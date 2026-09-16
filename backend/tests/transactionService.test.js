const test = require("node:test");
const assert = require("node:assert/strict");
const transactionService = require("../services/transactionService");

test("transactionService module exports required pipeline functions", () => {
  assert.equal(typeof transactionService.getTransactionsByUser, "function");
  assert.equal(typeof transactionService.deleteTransaction, "function");
});
