# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: ed117b72-f864-4008-b5e9-31c8c032e3fb -->

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

### [x] Step: Clean up App.tsx
Remove `USE_MOCK_DATA` flag and props passed to components.

### [x] Step: Clean up LoginScreen.tsx
Remove `useMockData` prop and mock login logic.

### [x] Step: Clean up UserProfileCompletionScreen.tsx
Remove `useMockData` prop and mock logic.

### [x] Step: Clean up OrganizationScreen.tsx
Remove `useMockData` prop and mock search logic.

### [x] Step: Clean up GigListScreen.tsx and AssetListScreen.tsx
Remove `useMockData` prop.

### [-] Step: Clean up documentation
Update `setup-guide.md`.

### [ ] Step: Final verification
Run tests, check for linting errors, and audit remaining mock data usage.
