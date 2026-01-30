# Bug Investigation: Application Hang on Login

## Bug Summary
The application hangs during the initial authentication check and also when a user attempts to log in. This is characterized by a "Initial auth check timed out" warning in the console, followed by the app being stuck on the login screen with a loading spinner that never disappears after credentials are entered.

## Root Cause Analysis
1.  **Hanging `getSession()`/RPC Calls**: The initial authentication check (`initAuth`) in `AuthContext.tsx` hangs at `supabase.auth.getSession()`. This might be due to several reasons:
    *   Invalid Supabase URL reconstruction in `info.tsx` (potential trailing slash issues).
    *   Race conditions between `initAuth` and `onAuthStateChange` both trying to access the session/refresh tokens.
    *   Supabase RPC calls (`get_user_profile_secure`) hanging if the underlying connection or session is in a weird state.

2.  **State Deadlock in `AuthContext`**: 
    *   The `AuthContext` has a safety timeout that forces `isLoading` to `false` after 5 seconds.
    *   However, it does **not** reset the `isRefreshing.current` flag.
    *   Because `isRefreshing.current` remains `true`, any subsequent attempts to refresh the profile (e.g., after a successful login) are skipped by the guard at the beginning of `refreshProfile`.
    *   This leaves the `user` state as `null`, so `App.tsx` continues to show the `LoginScreen`.

3.  **Redundant & Potential Blocking Calls in Services**:
    *   `getUserOrganizations` calls `supabase.auth.getSession()` internally. If called while a session refresh is already being attempted by the client, it might block or cause issues.
    *   `refreshProfile` in `AuthContext` already has the session, but the services it calls try to fetch it again.

## Affected Components
*   `src/contexts/AuthContext.tsx`: Initialization logic and `isRefreshing` lock.
*   `src/utils/supabase/info.tsx`: URL reconstruction logic.
*   `src/services/user.service.ts`: Redundant `getSession()` calls.
*   `src/components/LoginScreen.tsx`: Redundant data fetching that might hang similarly to `AuthContext`.

## Proposed Solution
1.  **Fix URL Reconstruction**: Ensure `projectId` extraction is robust against trailing slashes or non-standard URLs.
2.  **Robust `AuthContext` Initialization**:
    *   Consolidate `initAuth` and `onAuthStateChange`. Use `onAuthStateChange` to handle the initial session if possible, or ensure they don't race.
    *   Ensure `isRefreshing.current` is reset in the `finally` block of `refreshProfile`.
    *   Update the safety timeout to also reset `isRefreshing.current`.
3.  **Optimize Service Calls**:
    *   Pass the session or user ID to services where possible to avoid redundant `getSession()` calls.
    *   Add timeouts to RPC calls if possible, or better error handling.
4.  **Sync `LoginScreen` with `AuthContext`**: Instead of `LoginScreen` doing its own fetching, it should rely more on `AuthContext` or ensure it doesn't conflict.

## Other Potential Routing Bugs
*   Check `App.tsx` for proper handling of the `profile-completion` and `org-selection` states to ensure users aren't stuck if they have no organizations or incomplete profiles.
