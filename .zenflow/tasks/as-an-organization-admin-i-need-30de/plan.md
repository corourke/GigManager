# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: b5553699-1ae7-4933-aa1a-6b4c656a3000 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: cec2bc72-80f3-41a2-b233-d1d972fdc1b7 -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: 02f3aec2-4182-40c8-9d4b-76805500a2a7 -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Database Schema and RLS Updates
<!-- chat-id: 9b44594b-9aeb-4ea8-9315-d4777e8e41dc -->
- Create migration to rename `organization_type` to `organization_role`.
- Update `organizations` table: rename `type` to `roles` and change to array type.
- Update `gig_participants` table to use new `organization_role` type.
- Create `public.user_is_admin(user_uuid uuid)` function.
- Update RLS policy for `organizations` table to allow any admin to update any organization.
- Update `create_gig_complex` RPC if necessary.

### [x] Step: Update Constants and Types
<!-- chat-id: 4334b0ad-161c-4bef-b55d-33f39d7fc262 -->
- In `src/utils/supabase/constants.ts`:
    - Rename `OrganizationType` to `OrganizationRole`.
    - Rename `ORG_TYPE_CONFIG` to `ORG_ROLE_CONFIG`.
    - Update helper functions (`getOrgTypeIcon`, etc.).
- In `src/utils/supabase/types.tsx`:
    - Update `DbOrganization` to use `roles: OrganizationRole[]`.
    - Update `DbGigParticipant` and related types.

### [x] Step: Update Organization Service and Edge Functions
<!-- chat-id: d73fc873-79a5-4348-ad39-053cde302b56 -->
- Update `src/services/organization.service.ts`:
    - Update `searchOrganizations`, `createOrganization`, `updateOrganization` to use `roles` array.
- Update `supabase/functions/server/index.ts`:
    - Update `PUT /organizations/:id` and `DELETE /organizations/:id` to use relaxed permissions.
    - Update `POST /organizations` and `PUT /organizations/:id` to handle `roles` array.

### [x] Step: Update Organization Edit Screen
<!-- chat-id: 35eb9e7c-7183-4cc9-bd31-a4a13c8b93d5 -->
- In `src/components/OrganizationScreen.tsx`:
    - Implement multi-role selection using checkboxes.
    - Add ownership warning alert if editing an organization with members and the user is not an admin of it.
    - Update form validation and submission logic.

### [x] Step: Update Gig Participants UI
<!-- chat-id: da16a6e8-e1a1-4ed7-9195-f76fa98d3128 -->
- In `src/components/gig/GigParticipantsSection.tsx`:
    - Add "View" (Eye icon) and "Edit" (Pencil icon) buttons to participant rows.
    - Implement "View" modal showing read-only organization details.
    - Implement "Edit" action navigating to the organization edit screen.
    - Ensure "Edit" is only visible to admins.
- Expose organization edit handler from `App.tsx` through `GigDetailScreen`.

### [x] Step: Improve Organization Selector Search
<!-- chat-id: 81da2898-6c7d-491b-a1ee-1fdeeef781a3 -->
- In `src/components/OrganizationSelector.tsx`:
    - Implement 1-second debounce for the search input.
    - Ensure loading indicator is displayed correctly.

### [x] Step: Final Verification
<!-- chat-id: dd609af6-c567-4367-8280-1c44d2728524 -->
- Run `npm run build && npm run test:run`.
- Manually verify all requirements:
    - Relaxed permissions and warning.
    - Multi-role support in Edit screen and badges.
    - View/Edit buttons in Gig Participants.
    - Debounced search in Organization Selector.

### [x] Step: Fix P1 Issues
<!-- chat-id: df1e850e-d42d-48a9-a53f-812a68abf3b8 -->

#### Summary
The changes implement organization editing enhancements and multi-role support (database schema rename, multi-role checkboxes, gig participant View/Edit buttons, debounced search). While the overall structure is solid, four P1 bugs were found that will cause runtime failures and violate key requirements.

#### Findings

| Priority | Issue | Location |
|----------|-------|----------|
| P1 | `user_is_admin` RPC called without required `user_uuid` argument — admin check always fails | `./src/components/OrganizationScreen.tsx:153` |
| P1 | Organization modal reads non-existent fields (`website`, `notes`) instead of actual fields (`url`, `description`) | `./src/components/GigDetailScreen.tsx:444` |
| P1 | Edit button visibility gated by role in *current* org, not "admin of any org" — eligible users blocked | `./src/components/GigDetailScreen.tsx:357` |
| P1 | `ImportScreen` still calls `createOrganization` with old `type` field after contract changed to `roles` | `./src/services/organization.service.ts:51` |

---

#### Details

##### [P1] Missing `user_uuid` argument to `user_is_admin` RPC
**File:** `./src/components/OrganizationScreen.tsx:153`

`supabase.rpc('user_is_admin')` is called without the required `user_uuid` argument. The migration defines `user_is_admin(user_uuid uuid)`, so this call will error at runtime and `isGlobalAdmin` stays `false`. As a result, the ownership warning condition (`isEditMode && hasMembers && !isOrgAdmin && isGlobalAdmin`) is never satisfied — the warning is never shown even when it should be.

---

###### [P1] Organization modal reads non-existent model fields
**File:** `./src/components/GigDetailScreen.tsx:444`

The organization details modal renders `organization.website` and `organization.notes`, but the actual `DbOrganization` model fields are `url` and `description`. The same issue appears in `./src/components/gig/GigParticipantsSection.tsx` around lines 462 and 470. This causes type errors and the modal displays blank/undefined data for those fields at runtime (the spec explicitly calls for displaying phone, address, and description).

---

##### [P1] Edit button visibility uses current-org role, not global admin check
**File:** `./src/components/GigDetailScreen.tsx:357`

The Edit button is gated by `userRole === 'Admin'`, which reflects the user's role in their currently-selected organization — not whether they are an admin in *any* organization. The same logic exists in `./src/components/gig/GigParticipantsSection.tsx` around line 357. This violates the core requirement: any user who is an Admin in at least one organization must be able to edit any organization. Users who are admins but not in the currently selected org will be incorrectly denied the Edit button.

---

###### [P1] `ImportScreen` still uses old `type` field after `createOrganization` contract change
**File:** `./src/services/organization.service.ts:51`

`createOrganization` was updated to accept `roles: OrganizationRole[]` instead of `type`, but `./src/components/ImportScreen.tsx` was not updated — it still calls `createOrganization({ name, type })` and reads `created.type` and `organization.type`. This breaks the import flow with a type error and runtime failure after the contract change.

---

#### Recommendation
Fix all four P1 issues before merging: pass `{ user_uuid: userId }` to the `user_is_admin` RPC call, correct `website`→`url` and `notes`→`description` in the modal, replace `userRole === 'Admin'` with a proper global admin flag (from a context or the RPC result), and update `ImportScreen` to pass `roles` instead of `type`.

*Review produced by gpt-5-3-codex*
