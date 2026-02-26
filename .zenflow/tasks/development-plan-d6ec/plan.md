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

### [ ] Step: Plan Phase 1 - Hierarchy Foundations
- [ ] Detail the SQL recursive CTE structures and schema evolution strategy.
- [ ] Document the hierarchy-aware fetching patterns for `gig.service.ts`.
- [ ] Define the flexible CSV mapping architecture for asset imports.
- [ ] **Verification**: Review documentation for technical accuracy and alignment with GigManager's architecture.

### [ ] Step: Plan Phase 2 - Hierarchy UI & Mobile Strategy
- [ ] Design the visual hierarchy navigation and component structure for `GigHierarchyTree`.
- [ ] Specify the progressive disclosure patterns for parent/child gig forms.
- [ ] Define the PWA manifest and caching strategies.
- [ ] **Verification**: Ensure UI designs address both simple and complex organizational needs.

### [ ] Step: Plan Phase 3 - Field Ops & Mobile Experience
- [ ] Design the mobile-first "Warehouse Mode" and staff dashboard workflows.
- [ ] Specify barcode scanning integration and hardware compatibility requirements.
- [ ] Define biometric and location-based auth flows for field staff.
- [ ] **Verification**: Validate that touch targets and interactions follow mobile best practices.

### [ ] Step: Plan Phase 4 - Financials & Multi-Tenant Settlement
- [ ] Define financial rollup algorithms and hierarchical reporting structures.
- [ ] Design Act-specific and Production-specific settlement views.
- [ ] Specify the vendor bid management and rollup architecture.
- [ ] **Verification**: Ensure financial models handle complex parent/child relationships correctly.

### [ ] Step: Plan Phase 5 - Scale, Sync & Performance Roadmap
- [ ] Design the offline sync and conflict resolution strategy using `idb`.
- [ ] Specify the push notification architecture for real-time hierarchy updates.
- [ ] Define performance benchmarks and load testing protocols for high-volume data.
- [ ] **Verification**: Review for technical feasibility and infrastructure requirements at scale.
