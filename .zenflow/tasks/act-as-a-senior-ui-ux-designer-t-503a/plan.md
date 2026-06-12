# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 4cc0c531-df15-4f0f-91eb-3332907bb904 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: cc98a2fc-4404-4a5b-8a82-458c2a5d145c -->

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
<!-- chat-id: 6ef36ec3-6348-4632-886a-7a333130403f -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Refine Style Guide
<!-- chat-id: 609c857e-dd1b-4cc4-a2f3-1c28ce1aaae1 -->
- Update `./docs/design/STYLE_GUIDE.md` with:
    - Form Validation patterns (Inline and Global/Toasts).
    - Empty States patterns (Icon, Title, CTA).
    - Loading Skeletons for common components.
    - Navigation Transitions (Web vs PWA).
- **Verification**: Ensure consistency with `sky-500` accents and "Metadata Rule".

### [x] Step: Update Component Sheet
<!-- chat-id: a9a7587c-6fc4-4682-aedb-151688aa7e8f -->
- Enhance `./docs/design/mockups/component-sheet/index.html`:
    - Create a state matrix grid (Default, Hover, Focus, Active, Disabled, Error).
    - Add `GigTreeNode` with connectors.
    - Add `InheritanceBadge` and `OverrideControls`.
- **Verification**: Open in browser and verify all states and components render correctly.

### [x] Step: Polish Web Dashboard Mockup
<!-- chat-id: d9033f05-c5fc-4a2a-bc01-bbdf93843f8f -->
- Update `./docs/design/mockups/web-screens/dashboard.html`:
    - Implement high-density financial tiles using `tabular-nums`.
    - Add high-density "Recent Activity" table.
    - Add "Quick Actions" in the header.
- **Verification**: Check layout density and financial data formatting.

### [x] Step: Polish Gig Detail Mockup
<!-- chat-id: 09bdf7cb-3863-403d-92df-a90f7e989a0a -->
- Update `./docs/design/mockups/web-screens/gig-detail.html`:
    - Implement split-pane layout with `GigHierarchyTree` sidebar.
    - Visual differentiation for inherited vs overridden data.
    - Resource cards for staff and equipment with rollups.
- **Verification**: Verify hierarchy integration and visual inheritance cues.

### [x] Step: Polish Financials View Mockup
<!-- chat-id: 8ca81ad5-450f-4f74-ba5b-9e9b591e9a38 -->
- Update `./docs/design/mockups/web-screens/financials.html`:
    - Create complex data tables with grouping (Labor, Expenses, Revenue).
    - Add sticky headers and visual linking indicators for ledger tracing.
- **Verification**: Verify table grouping and linkage visualization.

### [x] Step: Polish Mobile PWA Mockup
<!-- chat-id: 2a95f133-4dfe-40f5-a594-873b07f81a3a -->
- Update `./docs/design/mockups/mobile-screens/mobile-screens.html`:
    - Implement bottom navigation bar with active states.
    - Optimize cards for 44px tap targets.
    - Implement vertical stacking for small screens.
- **Verification**: Verify mobile-first design and tap target compliance.

### [x] Step: Calendar Mockup
<!-- chat-id: 473a68a2-d5a7-40b4-a860-53b6f9ff6e55 -->
- Create `./docs/design/mockups/web-screens/calendar.html`:
    - Month/week/day view toggle in the header.
    - Gig event blocks with color-coded status (Confirmed, Pending, Tentative, Cancelled).
    - Multi-day spanning events with overflow indicators.
    - Mini calendar sidebar for date navigation.
    - Quick-add event popover on day cell click.
    - Sidebar agenda list showing upcoming gigs.
- **Verification**: Open in browser and verify calendar grid, event rendering, and view toggles.

### [x] Step: CSV Import Mockup
<!-- chat-id: e8053c96-ec77-40e7-aa42-246122d49916 -->
- Create `./docs/design/mockups/web-screens/csv-import.html`:
    - Step-indicator / stepper (Upload → Map Columns → Review → Import).
    - Step 1 — drag-and-drop file upload zone with file type validation messaging.
    - Step 2 — column mapping table: CSV header on left, dropdown to map to GigManager field on right, with auto-detection highlights.
    - Step 3 — preview data table with inline row-level error/warning badges, pagination, and a summary error count banner.
    - Step 4 — import progress indicator and success/failure summary with downloadable error report link.
- **Verification**: Open in browser and verify stepper flow, mapping table, and error/warning states.

### [x] Step: Calendar Settings Mockup
<!-- chat-id: 1a6afe6e-5cae-49dc-a16a-76d7759b8cc0 -->
- Create `./docs/design/mockups/web-screens/settings-calendar.html`:
    - Settings shell with left-side nav (General, Calendar, Notifications, Integrations, etc.) with Calendar active.
    - Calendar section: default view (Month/Week/Day), first day of week, work-hours range, time zone selector.
    - Sync / integration sub-section: connect Google Calendar / iCal feed, sync direction (read/write), sync frequency.
    - Color-coding rules table: map Gig status → color swatch with editable color picker.
    - Display preferences: show/hide weekends, show declined events toggle.
- **Verification**: Open in browser and verify settings layout, form controls, and color-coding table.

### [x] Step: Cross Review as Expert UI/UX Designer
<!-- chat-id: 96c0e496-aff2-48af-94d2-62972892f8b0 -->
- Act as a Senior UI/UX Designer and review all mockups and the style guide for consistency, quality, and adherence to design principles.
- Files to review:
    - `./docs/design/STYLE_GUIDE.md`
    - `./docs/design/mockups/component-sheet/index.html`
    - `./docs/design/mockups/web-screens/dashboard.html`
    - `./docs/design/mockups/web-screens/gig-detail.html`
    - `./docs/design/mockups/web-screens/financials.html`
    - `./docs/design/mockups/web-screens/calendar.html`
    - `./docs/design/mockups/web-screens/csv-import.html`
    - `./docs/design/mockups/web-screens/settings-calendar.html`
    - `./docs/design/mockups/mobile-screens/mobile-screens.html`
- Review criteria:
    - **Visual Consistency**: Shared tokens (`sky-500` accent, `slate-*` neutrals, spacing scale) applied uniformly across all files.
    - **Typography & Metadata Rule**: "uppercase bold tracking-wider" label pattern consistently applied.
    - **Interaction States**: All interactive components show Default, Hover, Focus, Active, Disabled, and Error states.
    - **Accessibility**: Sufficient color contrast ratios; focus rings visible; tap targets ≥ 44px on mobile.
    - **Responsive / Mobile-First**: Layouts degrade gracefully; no overflow on small viewports.
    - **Empty & Error States**: Every data surface has a defined empty state and error state per the style guide.
    - **Design Principle Adherence**: Professional & Clean, Accent-Driven, high whitespace, crisp edges.
- For each issue found, note the file, the specific element, the problem, and the recommended fix.
- Apply fixes directly to the affected files where corrections are straightforward.
- **Verification**: After fixes, do a final pass to confirm all issues are resolved and no regressions introduced.

### [x] Step: User review and comments
<!-- chat-id: efec96a5-fbe9-4f12-88b1-f78e34f1c58e -->
<!-- agent: zencoder-sonnet-4-6-think -->

I will be reviewing the mockups and suggesting changes.
