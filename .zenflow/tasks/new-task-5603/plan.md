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
<!-- chat-id: ebf63a49-dbf5-4129-8ad6-719da55adc12 -->

Assess the task's difficulty, as underestimating it leads to poor outcomes.
- medium: Moderate complexity, some edge cases or caveats to consider

Create a technical specification for the task that is appropriate for the complexity level:
- Review the existing codebase architecture and identify reusable components.
- Define the implementation approach based on established patterns in the project.
- Identify all source code files that will be created or modified.
- Define any necessary data model, API, or interface changes.
- Describe verification steps using the project's test and lint commands.

Save the output to `.zenflow/tasks/new-task-5603/spec.md`.

---

### [ ] Step: Implementation

#### [ ] Substep: Fix Team Screen RLS and Invitation Bug
- Add `INSERT` policy for `users` table in a new migration.
- Verify invitation works.

#### [ ] Substep: Standardize Row Actions Across Lists
- Modify `GigTable.tsx`, `TeamScreen.tsx`, and `AssetListScreen.tsx`.
- Move actions to the end of the row as individual buttons.

#### [ ] Substep: Enhance Gig List Spreadsheet Experience
- Implement `Tab`/`Shift+Tab` navigation in `EditableTableCell.tsx` and `GigTable.tsx`.
- Update cell styling and prevent layout shifts.
- Restore inline date/time editing in `GigTable.tsx`.

#### [ ] Substep: Navigation and Detail Screens
- Update `App.tsx` with separate View/Edit handlers.
- Update `GigDetailScreen.tsx`, `AssetScreen.tsx`, and `TeamScreen.tsx` for compact layout.

#### [ ] Substep: Global UI Cleanup
- Update `AppHeader.tsx` avatar menu.
- Run final linting and tests.
