# Investigation: Authentication Hang and Security Regression

## 1. Issue Description
Users are experiencing a hang at the login screen. The application logs "AuthContext: refreshProfile starting" but never completes the profile fetch. This occurs specifically when a valid session token exists in local storage. Deleting the token temporarily "fixes" the issue until the next login/refresh cycle. Additionally, a security regression was identified in `getUserOrganizations` where service-level filtering was removed.

## 2. Findings

### Auth Hang Analysis
- **Symptom**: `AuthContext.tsx` logs `refreshProfile starting` but never logs `Fetched profile and orgs` or `Setting isLoading to false`.
- **Location**: The hang occurs at `await supabase.auth.getSession()` inside `refreshProfile`.
- **Root Cause Hypothesis**: Concurrent calls to `getSession()` and `onAuthStateChange` are likely causing a race condition or deadlock within the Supabase client or its storage/refresh mechanism. 
    - `initAuth` calls `refreshProfile` immediately.
    - `onAuthStateChange` (fired by the client recovery) also calls `refreshProfile`.
    - Both calls are awaiting `getSession()` concurrently on the same singleton client.
- **Loading State**: Because `refreshProfile` hangs, `isLoading` remains `true` until the 5-second safety timeout forces it to `false`. Since `user` is still `null`, the app redirects to the login route.

### Security Regression Analysis
- **Issue**: In `src/services/user.service.ts`, the logic in `getUserOrganizations` that restricted organization fetching when querying another user's organizations was removed.
- **Risk**: Although RLS might prevent unauthorized access, removing service-level filtering increases the risk of data leakage if RLS is misconfigured or bypassed (e.g., via `SECURITY DEFINER` functions elsewhere).

## 3. Proposed Solution

### Fix Auth Hang
1. **Refactor `refreshProfile`**:
    - Modify `refreshProfile` to accept an optional `session` parameter.
    - If `session` is provided, use it instead of calling `supabase.auth.getSession()`.
    - Implement a simple "isRefreshing" flag (using a ref) to prevent concurrent executions of `refreshProfile`.
2. **Optimize `useEffect` in `AuthContext`**:
    - Pass the session from `onAuthStateChange` directly to `refreshProfile`.
    - Remove the redundant `initAuth` call if `onAuthStateChange` is expected to fire on mount (Supabase client usually fires `INITIAL_SESSION` or `SIGNED_IN` on initialization).

### Fix Security Regression
1. **Restore Logic in `getUserOrganizations`**:
    - Re-implement the check: if `user.id !== userId`, filter the query by organizations the current user also belongs to.
    - Use `supabase.auth.getSession()` sparingly or pass the user ID if already known.

### Proposed Code Changes

#### `src/contexts/AuthContext.tsx`
- Add `isRefreshing` ref.
- Update `refreshProfile` to take `session` as argument.
- Update `useEffect` to use session from event.

#### `src/services/user.service.ts`
- Restore the `if (user.id !== userId)` logic in `getUserOrganizations`.

## 4. Test Case (Failing)
I will write a test in `src/contexts/__tests__/AuthContext.test.tsx` (or similar) that simulates concurrent auth events and verifies that `refreshProfile` completes correctly without hanging and doesn't fire redundant network requests.

---
**Status**: Awaiting approval to proceed with implementation.
