const test = require("node:test");
const assert = require("node:assert/strict");
const validationMiddleware = require("../middleware/validationMiddleware");

test("validationMiddleware module exports required rules and validate runner", () => {
  assert.equal(typeof validationMiddleware.validate, "function");
  assert.equal(typeof validationMiddleware.validateUserId, "function");
  assert.equal(typeof validationMiddleware.amountRule, "function");
  assert.equal(typeof validationMiddleware.emailRule, "function");
  assert.equal(typeof validationMiddleware.passwordRule, "function");
  assert.equal(typeof validationMiddleware.sanitizedStringRule, "function");
});
