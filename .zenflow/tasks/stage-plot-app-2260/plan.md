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
<!-- chat-id: c839f41c-b98f-4eb1-bb34-790b34b01f05 -->
- Build high-performance table view with sorting and filtering.
- Implement device-centric columns and terminal device rows.
- Format row headers with device name, channel, and model/type.
- Add IDX and 48V columns.
- Implement category-based grouping and headers.
- Fix internal routing and deduplicate signal chain rows.
- Sort rows by hardware input channel number.
- Separate input paths from output paths (Mixer outputs on separate rows).
- Implement inline editability for quick entry of names and channels.
- Verification: Verified correct rendering, sorting, and state updates via unit tests.

### [x] Step: Implement Local Persistence & Template Library
<!-- chat-id: e5b60959-fb11-4d7d-966b-c155d724857e -->
- Integrate `Expo-FileSystem` for local JSON project storage and project-to-template conversion.
- Implement project list view with save/load/rename functionality.
- Verification: Verify projects persist across app restarts and templates can be applied.

### [x] Step: Improve diagram connection routing
<!-- chat-id: 509aeba5-e6eb-4bc3-8847-f1ac08fa76d0 -->

Refined the diagram connection routing logic for cleaner signal paths and stable grouping:

1.  **Refactored pathfinding**: Centralized routing logic into a `useMemo` in `diagram.tsx` and implemented template-based routing to ensure all connections in a (Source, Destination) pair follow the exact same lane (`midX` or `bypassY`).
2.  **Stable Orthogonal Routing**:
    - Increased `stub` size to 60px to ensure escape/entry lanes always clear device obstacle padding.
    - Improved `isBackwards` detection and added lane prioritization for stability.
    - Updated `getOrthogonalPoints` to return and accept routing parameters for group consistency.
3.  **Signal Path Grouping**:
    - Channels between the same (Source, Destination) pair now share the same routing strategy and overlap into a visually single line for the long run.
    - Different source devices going to the same destination are correctly separated by a 14px `LINE_SPACING`.
4.  **Clean Aesthetics**:
    - Updated `simplifyPath` to eliminate micro-segments and ensure consistent 10px rounded corners.
    - Filtered out bypass candidates that would cause "hairpin" 180-degree turns.
5.  **Verification**: Verified with Vitest unit tests covering forward, backward, and complex bypass scenarios.

### [x] Step: User experience feedback and fixes
<!-- chat-id: 8bf26ac0-2649-4a9c-97a5-7e64f86acaeb -->
User testing and user interface fixes. 
- [x] Fixed Setups screen layout to ensure SectionList is visible and scrolls correctly.
- [x] Moved Add button to top right of header as requested.
- [x] Improved SectionList rendering for mobile.
- [x] Fixed device saving logic in Diagram screen (addDevice was not called).
- [x] Added "Add Device" button to Diagram screen header.

### [x] Step: Implement PDF & Image Export Services
- Implement PDF generation optimized for "Load-In Sheet" and "System Diagram" presets.
- Add PNG export for the Diagram view.
- Verification: Generate and view a PDF on the device.

### [x] Step: Improve Patch Screen Sorting & Quick Entry
<!-- chat-id: ddcf9cbf-7e93-4ee4-90fd-9d49c78338ed -->
Improved the Patch screen with better sorting and inline quick entry:
- [x] Fixed sorting logic to group Stagebox channels together (including orphaned inputs).
- [x] Implemented "Primary Sort Device" logic to prioritize Stageboxes and sort by channel number even for sink paths.
- [x] Added support for orphaned Stagebox inputs as rows in the patch sheet.
- [x] Implemented quick entry syntax `Type:Name/Channel(Model)` in the source cell.
- [x] Added support for aliases (Mic, DI, SB, etc.) in quick entry.
- [x] Updated `ProjectContext` to return new IDs from `addDevice` and `addConnection`.
- [x] Verification: Verified with unit tests for sorting and orphaned input generation.

### [x] Step: Code quality and framework compatibility fixes
- [x] Removed `isInternallyRoutable` property from models and all usages.
- [x] Fixed `PersistenceService` deprecation error by using `expo-file-system/legacy` API as the new File/Directory API was throwing `writeAsStringAsync` deprecation errors in runtime.
- [x] Fixed Rules of Hooks violation in `DeviceNode` by extracting `ChannelDot` into a separate file.
- [x] Externalized Demo Project JSON into `constants/DemoProject.ts` and updated `ProjectContext` to use it.
- [x] Verification: Ran all tests (npm test) and verified they pass.

### [ ] Step: Integrate Supabase for Cloud Sync & Collaboration
- Set up Supabase client for project backup and real-time co-editing.
- Verification: Verify changes on one device sync to another in real-time.

### [ ] Step: Implement Heartbeat & Service Status Service
- Implement periodic "phone-home" to check for app updates and service alerts (This can be to a supabase endpoint, logging to a supabase table).
- Verification: Verify the app receives and displays a mock update alert from the status endpoint. (Have these alerts in the supabase database. The client should keep track of which alerts have been seen and dismissed.)
