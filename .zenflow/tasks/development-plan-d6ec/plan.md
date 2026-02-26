# Full SDD workflow (Development Plan Focus)

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

**IMPORTANT**: This task is for creating a **Development Plan** only.
- **DO NOT** modify application source code (src/).
- **DO NOT** create database migrations or apply schema changes.
- **OUTPUT**: All output should be in the form of documentation, specifications, and planning artifacts within the `{@artifacts_path}` directory.

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements
### [x] Step: Competitive Analysis
### [x] Step: Technical Specification
### [x] Step: Planning

### [x] Step: Plan Phase 1 - Hierarchy Foundations
<!-- chat-id: 8aef0b93-90da-4bda-9fb6-d090466cbdb1 -->
- [x] Detail the SQL recursive CTE structures and schema evolution strategy.
- [x] Document the hierarchy-aware fetching patterns for `gig.service.ts`.
- [x] Define the flexible CSV mapping architecture for asset imports.
- [x] **Verification**: Review documentation for technical accuracy and alignment with GigManager's architecture.

### [x] Step: Plan Phase 2 - Hierarchy UI & Mobile Strategy
<!-- chat-id: 47f79fd2-1038-4c75-88ce-5951acd35d1b -->
- [x] Design the visual hierarchy navigation and component structure for `GigHierarchyTree`.
- [x] Specify the progressive disclosure patterns for parent/child gig forms.
- [x] Define the PWA manifest and caching strategies.
- [x] **Verification**: Ensure UI designs address both simple and complex organizational needs.

### [ ] Step: Plan Phase 3 - Field Ops & Mobile Experience
<!-- chat-id: 45401820-12bd-4469-a319-ef843db70b6b -->
- [ ] Design the mobile-first "Warehouse Mode" and staff dashboard workflows.
- [ ] Specify barcode scanning integration and hardware compatibility requirements.
- [ ] Define biometric and location-based auth flows for field staff.
- [ ] **Verification**: Validate that touch targets and interactions follow mobile best practices.

### [x] Step: Plan Phase 4 - Financials & Multi-Tenant Settlement
<!-- chat-id: e18fa8e5-a036-4bea-85a1-2add4aab8d4c -->
- [x] Define financial rollup algorithms and hierarchical reporting structures.
- [x] Design Act-specific and Production-specific settlement views.
- [x] Specify the vendor bid management and rollup architecture.
- [x] **Verification**: Ensure financial models handle complex parent/child relationships correctly.

### [x] Step: Plan Phase 5 - Scale, Sync & Performance Roadmap
<!-- chat-id: 5cd7e944-c2be-45ca-bd38-41ffaa50ae22 -->
- [x] Design the offline sync and conflict resolution strategy using `idb`.
- [x] Specify the push notification architecture for real-time hierarchy updates.
- [x] Define performance benchmarks and load testing protocols for high-volume data.
- [x] **Verification**: Review for technical feasibility and infrastructure requirements at scale.

### [x] Step: Review and finalize
<!-- chat-id: c10ee325-c582-4bf0-b248-9c02b021fdaa -->
<!-- agent: zencoder-gemini-3-1-pro-preview-customtools -->

Please review the entire task (all steps and phases). I think we should finish up by putting all of the development plan documentation that we have created somewhere in the docs/ directory.
