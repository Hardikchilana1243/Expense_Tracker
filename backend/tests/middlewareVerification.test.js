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

test("Route verification: statementRoutes exports a valid router function with dual interop properties", () => {
  const statementRoutes = require("../routes/statementRoutes");
  assert.equal(typeof statementRoutes, "function", "Expected statementRoutes to be a function");
  assert.equal(typeof statementRoutes.default, "function", "Expected statementRoutes.default to be a function");
  assert.equal(typeof statementRoutes.router, "function", "Expected statementRoutes.router to be a function");
});

test("Route verification: all backend routes export valid router functions", () => {
  const routes = [
    "aiAdvisorRoutes",
    "authRoutes",
    "budgetRoutes",
    "dashboardRoutes",
    "expenseRoutes",
    "incomeRoutes",
    "insightRoutes",
    "mockRoutes",
    "notificationRoutes",
    "statementRoutes",
    "transactionRoutes",
  ];

  for (const routeName of routes) {
    const routeModule = require(`../routes/${routeName}`);
    assert.equal(
      typeof routeModule,
      "function",
      `Expected ${routeName} to be a function (got ${typeof routeModule})`
    );
    assert.equal(
      typeof routeModule.default,
      "function",
      `Expected ${routeName}.default to be a function`
    );
  }
});

test("assertMiddleware diagnostic helper safely normalizes valid wrapper shapes and rejects invalid shapes", () => {
  const app = require("../server");
  const assertMiddleware = app.assertMiddleware;
  assert.equal(typeof assertMiddleware, "function", "Expected assertMiddleware to be available");

  const dummyFn = () => {};

  // 1. Direct function
  assert.equal(assertMiddleware("directFn", dummyFn), dummyFn);

  // 2. ESM default wrapper: { default: fn }
  assert.equal(assertMiddleware("defaultWrapper", { default: dummyFn }), dummyFn);

  // 3. Named router wrapper: { router: fn }
  assert.equal(assertMiddleware("routerWrapper", { router: dummyFn }), dummyFn);

  // 4. Named route property wrapper: { myRoute: fn }
  assert.equal(assertMiddleware("myRoute", { myRoute: dummyFn }), dummyFn);

  // 5. Unsupported object shape throws detailed descriptive diagnostic
  assert.throws(
    () => assertMiddleware("brokenRoute", { someKey: 123, otherKey: "test" }),
    (err) => {
      assert(err instanceof TypeError);
      assert(err.message.includes("[Startup Error] Middleware/Router 'brokenRoute'"));
      assert(err.message.includes("someKey, otherKey"));
      return true;
    }
  );

  // 6. Non-object invalid shape throws detailed diagnostic
  assert.throws(
    () => assertMiddleware("nullRoute", null),
    (err) => {
      assert(err instanceof TypeError);
      assert(err.message.includes("[Startup Error] Middleware/Router 'nullRoute'"));
      return true;
    }
  );
});
