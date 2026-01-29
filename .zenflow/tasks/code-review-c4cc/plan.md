# Code Review Implementation Plan

## Configuration
- **Artifacts Path**: `.zenflow/tasks/code-review-c4cc`

---

## Workflow Steps

### [x] Step: Technical Specification
Assess the task's difficulty and create a technical specification.
- **Difficulty**: hard (Deep architectural and security review)
- **Output**: `spec.md`

### [x] Step: Exploration & Security Audit
<!-- chat-id: 6c8cd474-88cb-4875-9377-67c41ecf90f1 -->
Perform a deep dive into the current security implementation and identify vulnerabilities.
- Audit `supabase/schema.sql` for missing RLS policies.
- Audit `src/utils/api.tsx` for application-layer security logic.
- Verify authentication flows in `src/contexts/AuthContext.tsx`.

### [x] Step: Dead Code & Maintenance Analysis
Identify unused code and areas for refactoring.
- Search for unused exports and components.
- Analyze `src/utils/api.tsx` for refactoring opportunities (splitting into smaller modules).
- Review `package.json` for unused dependencies.

### [x] Step: Database Utilization Review
Ensure Supabase is used effectively as it is a powerful and wide-ranging platform.
- Check that data access and modification is done efficiently.
- Check that database features and functionality are being effectively utilized.
- Check that things that should be run in the database are not being duplicated or run in application code.
- Review complex query patterns and suggest improvements (Views, RPCs).

### [x] Step: Requirement Gap Analysis
Compare current implementation against product requirements.
- Review `docs/product/requirements.md`.
- Map requirements to existing features.
- Identify missing or incomplete features.

### [x] Step: Final Review Report & Implementation Plan
Consolidate findings into a final report with an actionable plan for fixes.
- Document dead code findings.
- Document security vulnerabilities and RLS migration plan.
- Document maintainability and performance recommendations.
- Create a prioritized list of tasks for the next phase.

---

## Verification
- Run `npm test` to ensure existing tests pass.
- Use `tsc --noEmit` for type checking.
- Manual verification of core features.
