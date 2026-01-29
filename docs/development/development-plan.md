## Phased Development Plan

### Phase 1: Security & Core Infrastructure (Highest Priority)
1.  **Enable RLS** on all tables and migrate `api.tsx` logic to PostgreSQL policies.
2.  **Implement `AuthContext`** to centralize auth state.
3.  **Refactor `api.tsx`** into modular services.

### Phase 2: Maintenance & Optimization
1.  **Remove all identified dead code**.
2.  **Implement RPC for `createGig`** and optimize `getGigs` query.
3.  **Refactor large components** (`GigListScreen.tsx`, etc.).

### Phase 3: Feature Gap Closure
1.  **Implement Email/Password Authentication**.
2.  **Implement File Attachments** using Supabase Storage.
3.  **Develop Conflict Detection** logic (server-side).
4.  **Create Calendar View** for gigs.