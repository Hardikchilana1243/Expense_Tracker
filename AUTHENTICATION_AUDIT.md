# Production Authentication Audit

**Target:** MERN Expense Tracker  
**Auditor:** Principal Software Engineer & Security Architect  
**Status:** Audit Complete  

---

## 1. Security Vulnerabilities & Secrets Management

### 🚨 Critical: Hardcoded JWT Secret Fallbacks
- **Location:** `backend/controllers/authController.js`, `backend/middleware/authMiddleware.js`
- **Issue:** Using fallback secrets `process.env.JWT_SECRET || "your_secret_key_change_in_production"`.
- **Risk:** If `JWT_SECRET` is omitted from environment variables in production, tokens can be forged using the known default secret string.
- **Remediation:** Enforce environment variable check in `backend/utils/auth.js`. Throw server initialization error if `JWT_SECRET` is missing or set to default fallback values.

---

## 2. Mixed Authentication & Token Handling

### ⚠️ Token Payload Leakage & Dual Storage
- **Location:** `backend/controllers/authController.js` (`registerUser`, `loginUser`, `googleAuth`)
- **Issue:** Backend sets an HttpOnly cookie **AND** returns `{ token }` in the JSON response payload.
- **Risk:** Frontends might store this raw token in `localStorage` or memory, re-introducing XSS token theft vectors.
- **Remediation:** Remove raw token from JSON response body. Return only `{ success: true, message, user }` and rely 100% on HttpOnly cookie session management.

### ⚠️ Authorization Header vs Cookie Fallback
- **Location:** `backend/middleware/authMiddleware.js`, `backend/controllers/authController.js`
- **Issue:** Backend checks `req.cookies.token`, but falls back to `Authorization: Bearer <token>`.
- **Risk:** Creates inconsistent authentication mechanisms and fragmenting security boundaries.
- **Remediation:** Centralize token extraction in `backend/utils/auth.js` to prioritize HttpOnly cookies while keeping strict, sanitized token verification.

---

## 3. Cookie Security & Session Management

### 🔐 Cookie Configuration Audit
- **Location:** `backend/controllers/authController.js`, `backend/utils/auth.js`
- **Current Settings:**
  - `httpOnly: true` ✅
  - `secure: process.env.NODE_ENV === "production"` ✅
  - `sameSite: "lax"` ✅
  - `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days) ✅
- **Issues:** Cookie creation and clearing options are duplicated across `authController.js` instead of using centralized helpers from `utils/auth.js`.

---

## 4. Frontend API Client & State Management

### 🔄 Duplicated Fetch Calls & Missing Credentials
- **Location:** `Home.jsx`, `Expense.jsx`, `Income.jsx`, `Budgets.jsx`, `Transactions.jsx`, `Profile.jsx`, `Navbar.jsx`, `BankLink.jsx`
- **Issue:** Pages and components use native `fetch()` directly with hardcoded endpoint strings instead of using the central `apiClient.js`.
- **Risk:** Potential for missing `{ credentials: "include" }`, duplicated error handling, unhandled 401/403 unauthorized state handling, and endpoint path fragmentation.
- **Remediation:** Refactor all data-fetching components to use `apiClient`.

### 🛡️ Auth State & Route Protection
- **Location:** `frontend/src/context/AuthContext.jsx`, `frontend/src/App.jsx`
- **Audit Result:** `AuthContext` cleanly manages `user`, `loading`, `error`, `login`, `signup`, `googleLogin`, `logout`, and `refreshSession`. `ProtectedRoute` properly waits for `loading` before redirecting.
- **Enhancement:** Ensure `apiClient` response interceptor/handling automatically notifies or triggers logout on 401 response if session expires during active app usage.

---

## 5. Standardized Error Handling

- **Location:** Backend controllers and middleware
- **Issue:** Mixed error formats (`{ message }` vs `{ success: false, message }`).
- **Remediation:** Standardize all auth error responses to:
  ```json
  {
    "success": false,
    "error": "unauthorized",
    "message": "Descriptive error message"
  }
  ```
