# Technical Specification - Code Review: GigManager

## Context
GigManager is a full-stack event management application using React, TypeScript, and Supabase. The goal is to perform a comprehensive code review focusing on dead code, maintainability, security, and Supabase efficiency.

## Objectives
1.  **Dead Code Removal**: Identify unused files, components, and functions.
2.  **Maintainability**: Improve code organization, readability, and reduce complexity in large files.
3.  **Security Audit**: Transition from application-layer access control to robust Supabase RLS policies.
4.  **Database Efficiency**: Optimize schema, indexing, and query patterns.
5.  **Requirement Alignment**: Ensure the codebase implements the specified requirements and identify gaps.

## Implementation Approach

### 1. Security & RLS Audit
- **Current State**: Many tables have RLS disabled (`gigs`, `organization_members`, etc.). Access control is manual in `src/utils/api.tsx`.
- **Target**: Enable RLS on all sensitive tables. Move logic from `src/utils/api.tsx` to PostgreSQL policies using existing helper functions (`user_is_member_of_org`, etc.).
- **Files**: `supabase/schema.sql`, `src/utils/api.tsx`.

### 2. Dead Code Analysis
- **Method**: Manual inspection and use of `grep` to find unreferenced exports.
- **Scope**: `src/components`, `src/utils`, `src/contexts`.

### 3. Maintainability & Code Quality
- **Focus**: `src/utils/api.tsx` is over 3300 lines. This needs refactoring or at least structural improvement.
- **Patterns**: Ensure consistent use of hooks, types, and error handling.

### 4. Supabase Utilization
- **Schema**: Review table relationships and constraints.
- **Indexes**: Verify that all foreign keys and frequently filtered columns have indexes.
- **Queries**: Optimize multi-step queries in `api.tsx` to use Postgres views or functions where appropriate.

### 5. Requirement Verification
- **Doc Reference**: Compare `docs/product/requirements.md` and `docs/product/feature-catalog.md` with the current UI and API functionality.

## Verification Approach
- **Linting**: Run `npm run lint` (if available, otherwise check configuration).
- **Type Checking**: Run `tsc --noEmit`.
- **Testing**: Run `npm test` to ensure no regressions during refactoring (if any).
- **Manual Verification**: Verify core flows (Auth, Org creation, Gig management) after security changes.
