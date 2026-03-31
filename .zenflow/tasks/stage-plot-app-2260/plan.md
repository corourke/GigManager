# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 41918165-6063-4622-b23e-72c04ec06edc -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

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

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Initialize Expo Project & Navigation
<!-- chat-id: cf119a47-2cec-445b-a34f-7aaecb7bec55 -->
- Initialize standalone Expo project with TypeScript and Tailwind (NativeWind).
- Set up Expo Router with the three main tabs: Setups, Diagram, and Patch.
- Verification: Build the app and verify tab navigation works on iOS simulator.

### [x] Step: Define TypeScript Models & Data Structures
<!-- chat-id: 9f0ba495-b81e-4476-93c6-cb98999f0078 -->
- Implement `Project`, `Device`, `Port`, and `Connection` interfaces based on `spec.md`.
- Add Zod validation for JSON persistence.
- Verification: Run unit tests for data model validation.

### [x] Step: Implement Core Signal Chain Logic
<!-- chat-id: 02f001cd-783e-4af0-b454-c032f54b5dfc -->
- Develop graph traversal algorithm for automatic name cascading from Stage terminal sources.
- Implement logic for 1:1 and offset channel mapping.
- Verification: Unit tests with complex signal chains (cascaded stageboxes/mixers).

### [x] Step: Develop Device & Group Management (Setups View)
<!-- chat-id: 62c2d5c5-f49d-44f7-a961-fa5133674aab -->
- Build UI for adding/editing devices, ports, and assigning groups/categories.
- Implement pre-populated device type library.
- Verification: Manually add/edit devices and verify state updates in the UI.

### [x] Step: Develop Node-based Signal Chain Visualization (Diagram View)
<!-- chat-id: 9a583714-a510-4614-9dc0-22b09714296a -->
- Implement interactive diagram canvas with draggable nodes and labeled connection arrows.
- Add drag-to-connect functionality for creating routings.
- Verification: Successfully create and visualize a multi-hop connection via the canvas.

### [x] Step: Develop Connection Patch Table (Patch View)
<!-- chat-id: 3615f883-af76-4e6c-b927-1fccfd3ff6e6 -->
- Build high-performance table view with sorting and filtering.
- Implement perspective switching (Stage, FOH, Monitor World).
- Verification: Verify correct filtering and sorting based on user selection.

### [ ] Step: Implement Local Persistence & Template Library
- Integrate `Expo-FileSystem` for local JSON project storage and project-to-template conversion.
- Implement project list view with save/load/rename functionality.
- Verification: Verify projects persist across app restarts and templates can be applied.

### [ ] Step: Implement PDF & Image Export Services
- Implement PDF generation optimized for "Load-In Sheet" and "System Diagram" presets.
- Add PNG export for the Diagram view.
- Verification: Generate and view a PDF on the device.

### [ ] Step: Integrate Supabase for Cloud Sync & Collaboration
- Set up Supabase client for project backup and real-time WebSocket co-editing.
- Implement "Save to Gig" / "Open from Gig Attachment" logic for GigManager.
- Verification: Verify changes on one device sync to another in real-time.

### [ ] Step: Implement Heartbeat & Service Status Service
- Implement periodic "phone-home" to check for app updates and service alerts.
- Verification: Verify the app receives and displays a mock update alert from the status endpoint.
