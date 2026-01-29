# Code Review Report - GigManager

## 1. Security Audit
### Vulnerabilities
- **Disabled RLS**: Critical tables (`gigs`, `organization_members`, `gig_participants`, `gig_staff_slots`, `gig_staff_assignments`, `gig_bids`, `gig_kit_assignments`) have RLS disabled. Security is handled at the application layer in `src/utils/api.tsx`, which can be bypassed.
- **Overly Permissive Policies**: 
    - `users` table: Authenticated users can view *all* other user profiles if they belong to any organization.
    - `organizations` table: Any authenticated user can view all organizations for participant selection.

### Recommendations
- **Enable RLS on All Tables**: Move security logic from `api.tsx` to PostgreSQL policies.
- **Create AuthContext**: Centralize authentication state and user profile management to reduce complexity in `App.tsx` and provide a consistent auth interface for components.
- **Restrict Policies**: Update policies to ensure users can only see data related to organizations they belong to or are collaborating with on specific gigs.

## 2. Dead Code & Maintenance
### Findings
- **Unused UI Components**: 17 components in `src/components/ui/` are unreferenced (e.g., `accordion`, `carousel`, `chart`, `drawer`, `menubar`).
- **Unused API Functions**: 9 functions in `src/utils/api.tsx` are unreferenced (e.g., `updateUserProfile`, `updateOrganization`, `searchGooglePlaces`).
- **Dead Utility Code**: `src/utils/role-helper.tsx` is completely unused.
- **Large Component/Utility Files**:
    - `src/utils/api.tsx`: 3314 lines.

### Recommendations
- **Remove Dead Code**: Delete unused UI components, API functions, and utility files.
- **Refactor `api.tsx`**: Split into domain-specific modules (e.g., `services/gig.service.ts`, `services/user.service.ts`, `services/organization.service.ts`).
- **Refactor `GigScreen.tsx`**: Break down into smaller, focused sub-components.

## 3. Database Utilization
### Findings
- **Inefficient Data Access**: `getGigsForOrganization` suffers from an N+1 query problem, fetching participants for each gig individually.
- **Non-Atomic Operations**: `createGig` performs multiple sequential client-side inserts without transaction safety.

### Recommendations
- **Optimize Queries**: Use PostgreSQL Views or JSONB aggregation in queries to fetch related data (participants, staff) in a single request.
- **Use RPCs for Complex Writes**: Implement `create_gig` as a PostgreSQL function (RPC) to ensure atomicity and reduce network round-trips.

## 4. Requirement Gaps
### Key Missing Features
- **Security**: Email/Password authentication and password reset.
- **Gig Management**: Conflict detection (venue, staff, equipment) and Calendar view.
- **Mobile**: Offline-first architecture and push notifications.
- **Features**: File attachments (stage plots, riders), Stage Plot Editor, and advanced reporting/analytics.

## 5. Prioritized Implementation Plan

### Phase 1: Security & Core Infrastructure (Highest Priority)
1. **Enable RLS** on all tables and migrate `api.tsx` logic to PostgreSQL policies.
2. **Implement `AuthContext`** to centralize auth state.
3. **Refactor `api.tsx`** into modular services.

### Phase 2: Maintenance & Optimization
1. **Remove all identified dead code**.
2. Implement RPC for `createGig`** and optimize `getGigs` query.

### Phase 3: Feature Gap Closure
1. **Implement Email/Password Authentication**.
2. **Implement File Attachments** using Supabase Storage.
3. **Develop Conflict Detection** logic (server-side).
4. **Create Calendar View** for gigs.

---
**Report Date**: January 28, 2026
**Auditor**: Zencoder AI
