# Authentication Fix Plan

## Phase 1 - Backend hardening
1. Centralize JWT, cookie, and error response logic.
2. Enforce environment-based secrets only.
3. Standardize middleware for auth verification and unauthorized handling.
4. Ensure logout clears the auth cookie and returns a consistent response.

## Phase 2 - Frontend unification
1. Replace the ad-hoc auth state with a centralized auth provider.
2. Create a reusable API client that automatically includes credentials.
3. Remove direct localStorage token reads from pages and components.
4. Use the shared auth provider for login, logout, refresh, and protected routes.

## Phase 3 - Verification
1. Verify login and logout flows.
2. Verify auto-login after refresh.
3. Verify redirect-to-login on expired or invalid sessions.
4. Verify protected routes and server-side auth enforcement.