const test = require("node:test");
const assert = require("node:assert/strict");
const { createAuthErrorResponse, buildCookieOptions } = require("../utils/auth");

test("buildCookieOptions returns secure cookie settings", () => {
  process.env.NODE_ENV = "production";
  const options = buildCookieOptions();

  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(typeof options.maxAge, "number");
});

test("createAuthErrorResponse returns a standard error payload", () => {
  const response = createAuthErrorResponse("unauthorized", "Authentication required");

  assert.equal(response.success, false);
  assert.equal(response.error, "unauthorized");
  assert.equal(response.message, "Authentication required");
});
