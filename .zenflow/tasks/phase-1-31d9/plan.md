# Spec and build

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification
<!-- chat-id: f2d4bf97-dab7-4190-9447-bf645707648c -->

Assess the task's difficulty, as underestimating it leads to poor outcomes.
- easy: Straightforward implementation, trivial bug fix or feature
- medium: Moderate complexity, some edge cases or caveats to consider
- hard: Complex logic, many caveats, architectural considerations, or high-risk changes

Create a technical specification for the task that is appropriate for the complexity level:
- Review the existing codebase architecture and identify reusable components.
- Define the implementation approach based on established patterns in the project.
- Identify all source code files that will be created or modified.
- Define any necessary data model, API, or interface changes.
- Describe verification steps using the project's test and lint commands.

Save the output to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach
- Source code structure changes
- Data model / API / interface changes
- Verification approach

If the task is complex enough, create a detailed implementation plan based on `{@artifacts_path}/spec.md`:
- Break down the work into concrete tasks (incrementable, testable milestones)
- Each task should reference relevant contracts and include verification steps
- Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function).

Save to `{@artifacts_path}/plan.md`. If the feature is trivial and doesn't warrant this breakdown, keep the Implementation step below as is.

---

### [x] Step: Analyze & Document Security Scheme
Thoroughly understand and articulate the intersection-based access logic for Gigs and the RBAC (Admin, Manager, Staff, Viewer) hierarchy.
- **Task**: Document the exact logic for Gigs, Organizations, and Staff access in a dedicated section of the spec or a new tech doc.
- **Verification**: User approval of `docs/technical/security-scheme.md`.

### [x] Step: Implement PostgreSQL RLS & Policies
<!-- chat-id: 9237490f-2bf1-4d54-979f-7e10d1158cf7 -->
Enable RLS on all tables and migrate application-layer security to PostgreSQL policies.
- **Task**: Update `supabase/schema.sql` to enable RLS and add policies.
- **Verification**: Manual verification via Supabase SQL editor.

### [ ] Step: Implement Security Tests
Create automated tests to verify the RLS policies and ensure no data leakage between organizations.
- **Task**: Create `src/test/security.test.ts` with scenarios for isolation and intersection access.
- **Verification**: `npm test src/test/security.test.ts`.

### [ ] Step: Implement `AuthContext`
Centralize authentication and organization state to simplify `App.tsx` and provide a consistent interface for components.
- **Task**: Create `src/contexts/AuthContext.tsx` and refactor `App.tsx`.
- **Verification**: `npm test`, verify login/logout and org selection flow.

### [ ] Step: Modularize API Services
Refactor `src/utils/api.tsx` into domain-specific service modules.
- **Task**: Create `src/services/` modules and update all component imports.
- **Verification**: `npm run lint`, `npm run typecheck`, `npm test`.

### [ ] Step: Final Verification & Report
- **Task**: Run full test suite and write report.
- **Verification**: `npm test`, `npm run build`.
- **Report**: Write to `{@artifacts_path}/report.md`.
