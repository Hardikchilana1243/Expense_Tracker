import test from "node:test";
import assert from "node:assert/strict";
import { isAuthError } from "../utils/apiClient.js";

test("isAuthError returns true for 401 and 403 status codes", () => {
  assert.equal(isAuthError({ status: 401 }), true);
  assert.equal(isAuthError({ status: 403 }), true);
  assert.equal(isAuthError({ status: 500 }), false);
  assert.equal(isAuthError({ status: 200 }), false);
  assert.equal(isAuthError(null), false);
});
