# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 2d12c6ff-697c-4251-a6c5-03942f808d08 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [ ] Step: Implementation
<!-- chat-id: 9ee5538b-de4f-401b-b1c4-9a24903a867f -->

#### [ ] Task 1: Hooks & Persistence
- Create `src/hooks/useTableState.ts` for managing sorting, filters, and visibility.
- Implement LocalStorage persistence in the hook.
- **Verification**: Unit tests for the hook state and persistence.

#### [ ] Task 2: SmartDataTable Core
- Create `src/components/tables/SmartDataTable.tsx`.
- Implement basic rendering and `TableHeader` with sorting icons.
- Implement `ColumnManager` popover for toggling optional columns.
- **Verification**: Render `SmartDataTable` in a story or temporary test page.

#### [ ] Task 3: In-place Editing Infrastructure
- Create `src/components/tables/EditableCell.tsx`.
- Implement cell selection (blue ring) and double-click activation.
- Implement `text` and `checkbox` editors.
- **Verification**: Manual testing of selection and editing flow.

#### [ ] Task 4: Advanced Editors & Filtering
- Implement `pill` (Badge) and `select` (Searchable dropdown) editors.
- Implement multi-criteria filtering popover in headers.
- **Verification**: Test searchable dropdown and pill colors from `constants.ts`.

#### [ ] Task 5: Prototype & Developer Demo
- Create `src/components/dev/DevTableDemoScreen.tsx`.
- Implement a comprehensive demo table with mock data.
- Add "Developer Documentation" comments within the file.
- **Verification**: User testing of the demo screen for UX feel.
- Do not proceed to next task until approved by user. 

#### [ ] Task 6: AssetListScreen Integration
- Refactor `AssetListScreen.tsx` to use `SmartDataTable`.
- Define column configuration for assets (required, read-only, etc.).
- Update service calls for saving in-place edits.
- **Verification**: `npm run test src/components/AssetListScreen.test.tsx`

#### [ ] Task 6: App-wide Rollout & Nested Tables
- Audit other screens for table replacement.
- Ensure nested table support (e.g., in `GigEditScreen`).
- **Verification**: Manual check of nested tables.
