const test = require("node:test");
const assert = require("node:assert/strict");

test("Middleware verification: rateLimiterMiddleware exports all required limiter functions", () => {
  const rateLimiters = require("../middleware/rateLimiterMiddleware");

  const expectedExports = [
    "loginLimiter",
    "signupLimiter",
    "googleAuthLimiter",
    "sessionAuthLimiter",
    "generalApiLimiter",
  ];

  for (const name of expectedExports) {
    assert.equal(
      typeof rateLimiters[name],
      "function",
      `Expected export '${name}' to be a function, but got ${typeof rateLimiters[name]}`
    );
  }
});

test("Middleware verification: server.js exports a valid Express application function", () => {
  const app = require("../server");
  assert.equal(typeof app, "function", "Expected app to be a function (Express application)");
});
