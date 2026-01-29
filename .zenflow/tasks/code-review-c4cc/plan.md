# Code Review Implementation Plan

## Configuration
- **Artifacts Path**: `.zenflow/tasks/code-review-c4cc`

---

## Workflow Steps

### [x] Step: Technical Specification
Assess the task's difficulty and create a technical specification.
- **Difficulty**: hard (Deep architectural and security review)
- **Output**: `spec.md`

### [ ] Step: Exploration & Security Audit
Perform a deep dive into the current security implementation and identify vulnerabilities.
- Audit `supabase/schema.sql` for missing RLS policies.
- Audit `src/utils/api.tsx` for application-layer security logic.
- Verify authentication flows in `src/contexts/AuthContext.tsx`.

### [ ] Step: Dead Code & Maintenance Analysis
Identify unused code and areas for refactoring.
- Search for unused exports and components.
- Analyze `src/utils/api.tsx` for refactoring opportunities (splitting into smaller modules).
- Review `package.json` for unused dependencies.

### [ ] Step: Database & Performance Review
Ensure Supabase is used effectively.
- Check for missing indexes on foreign keys and filter columns.
- Review complex query patterns and suggest improvements (Views, RPCs).

### [ ] Step: Requirement Gap Analysis
Compare current implementation against product requirements.
- Review `docs/product/requirements.md`.
- Map requirements to existing features.
- Identify missing or incomplete features.

### [ ] Step: Final Review Report & Implementation Plan
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
