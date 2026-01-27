# GigManager AI Coding Guide

**Purpose**: Essential coding guidelines and patterns for AI agents working on the GigManager codebase.

---

## Application Context

**GigManager** is a production and event management platform. 
- Full production application with Supabase/PostgreSQL.
- User authentication via Supabase.
- Multi-tenant isolation enforced by RLS and application logic.

## General Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

Be sure to keep the plan documents updated, marking tasks done as they are completed. This includes both high-level plans (i.e. @plan.md) as well as 
detailed implementation plans (i.e. implementation-plan.md).

Allow the user to complete manual verfication steps in the plan before moving on.

## Database 

### Schema Modifications

- Write migration files to `/supabase/migrations/`
- Provide DDL statements for the Supabase SQL Editor
- Update database documentation files in `/docs/technical/database.md`

**Note**: The KV store limitations DO NOT apply to this project.

### Data Handling Guidelines

- **Partial Updates**: When updating data through user edit actions (form or inline editing), ONLY update database columns for values that have been changed in the UI. Do not make changes to column values that haven't changed to avoid triggering unnecessary change logic in the back-end.
- **Migration Assumptions**: It is not necessary to gracefully handle cases where tables don't exist - we will always assume migrations have been run.
- **No Mock Data**: Do not add or maintain any code to handle mock data - we are using a live database.

---

## Core Technology Stack

- **Frontend**: React 18 (Function components), TypeScript (Strict), Vite, Tailwind CSS v4.
- **UI Components**: Shadcn/ui (Radix), Lucide React icons.
- **Forms**: `react-hook-form` + `zod` validation.
- **Backend**: Supabase (JS Client), PostgreSQL, RLS.
- **Utilities**: `date-fns` (dates), `sonner` (toasts), `recharts` (charts).
- **Testing**: Vitest + React Testing Library.

## Security & Multi-Tenancy

1. **Organization Isolation**: Every database query **MUST** include `.eq('organization_id', organizationId)`.
2. **Membership Verification**: Every API call must verify the user belongs to the target organization.
3. **Server-Side Trust**: Never trust client-provided IDs without verification.
4. **RLS**: Rely on RLS policies but always filter explicitly in application code for defense in depth.

## Implementation Patterns

### 1. Components & Screens
- **Shared Form**: Use one component for both "Create" and "Update" operations.
- **Structure**: Props -> State -> Form Setup -> Effects -> Handlers -> JSX.
- **File Size**: Keep components small (<500 lines); extract helpers to separate files.
- **Naming**: `FeatureScreen.tsx`, `FeatureDialog.tsx`, `FeatureForm.tsx`.

### 2. Forms & Data
- **Partial Updates**: Use `useSimpleFormChanges` hook to identify only changed fields for `UPDATE` operations.
- **Validation**: Use Zod schemas for all forms.
- **Loading States**: Show spinners on buttons and disable interactive elements during async operations.

### 3. API & Error Handling
- **Location**: API functions belong in `src/utils/api.tsx`.
- **Error Pattern**: Catch errors, log to console, and throw user-friendly messages for the UI to display via `toast`.
- **Timestamps**: Always update `updated_at` on records during updates.

### 4. UI/UX & Styling
- **Mobile-First**: Use Tailwind responsive prefixes (`md:`, `lg:`).
- **Touch Targets**: Minimum 44x44px for interactive elements.
- **Layout**: Prefer Flexbox/Grid over absolute positioning.
- **States**: Design for Loading, Error, Empty, and Success states.

## Quick Checklist

- [ ] `organization_id` filter included in all queries.
- [ ] Partial updates implemented (only changed fields sent).
- [ ] User membership/authorization verified.
- [ ] Zod validation applied to forms.
- [ ] Loading states handled during async calls.
- [ ] UI is responsive and touch-friendly (44px targets).
- [ ] Types are explicitly defined (avoid `any`).
- [ ] Components are modular and focused.

---
**Last Updated**: 2026-01-26
