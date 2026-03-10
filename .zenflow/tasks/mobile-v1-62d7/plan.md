# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 97bdde03-a0af-400b-8d2f-0a7bc6c868bc -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 871a7a58-b17b-46b4-90d3-0556ffbc2005 -->

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
<!-- chat-id: 6eae15d2-5510-4dc2-912c-5266259a1f2e -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Phase 1: PWA Foundation & Schema
<!-- chat-id: 62e6fcc6-65a0-4021-9bfe-6bdee6faf4ae -->
- [x] **Step: Database Schema Migration**
    - Create migration for `assets`, `asset_status_history`, `kits`, `inventory_tracking`, and `user_devices`
    - Implement `track_asset_status_change` trigger
    - Setup RLS policies for new tables
    - *Verification*: `npm run lint`, `npm run typecheck`, and user approval
- [x] **Step: PWA Setup & Configuration**
    - Install `vite-plugin-pwa`
    - Configure `vite.config.ts` (manifest, icons, service worker)
    - Add iOS meta tags and splash screens to `index.html`
    - *Verification*: `npm run build`, check `dist` for manifest/SW
- [x] **Step: Mobile Layout & Routing**
    - Create `src/components/mobile/MobileLayout.tsx` (bottom nav)
    - Update `src/App.tsx` for mobile detection and routing
    - *Verification*: `npm test` for layout, manual responsive check

### [x] Phase 2: Mobile Dashboard & Offline Gigs
<!-- chat-id: 2887a322-b858-4d35-a44c-f770140821f1 -->
- [x] **Step: IndexedDB Storage Setup**
    - Install `idb`
    - Implement `src/utils/idb/store.ts` for gigs, packing lists, and outbox
    - *Verification*: `npm test` for IDB helpers
- [x] **Step: Mobile Dashboard Implementation**
    - Implement `src/components/mobile/MobileDashboard.tsx`
    - Card-based next-48h gigs with quick links (maps, call)
    - *Verification*: `npm test` for Dashboard
- [x] **Step: Packing List & Offline Sync Service**
    - Implement `src/services/mobile/packingList.service.ts` (nested fetch)
    - Implement `src/services/mobile/offlineSync.service.ts` (caching/outbox)
    - *Verification*: `npm test` for services
- [x] **Step: Fix Mobile Layout & Navigation**
    - Add safe-area utilities to `index.css`
    - Update `MobileLayout.tsx` with sticky header and fixed bottom nav
    - *Verification*: Manual check on iPhone

### [x] Phase 3: Scanning Modes & Inventory Tracking
<!-- chat-id: 6ac95b6b-356a-432a-95d4-97b1365128ac -->
- [x] **Step: Inventory Mode & Packing List UI**
    - Implement `src/components/mobile/MobileInventoryMode.tsx`
    - Add mode selector and packing list with "No Tag" flags
    - *Verification*: `npm test` for Inventory view
- [x] **Step: Barcode Scanner Integration**
    - Install `react-qr-barcode-scanner`
    - Implement `src/components/mobile/MobileBarcodeScanner.tsx`
    - Handle tag matching, haptics, and error alerts
    - *Verification*: `npm test` for scanner logic
- [x] **Step: Inventory Tracking Service**
    - Implement `src/services/mobile/inventoryTracking.service.ts`
    - Handle scan submissions and offline outbox queuing
    - *Verification*: `npm test` for tracking service

### [x] Phase 6: Scanner Reliability & Tracking Notes
- [x] **Step: iOS/PWA Scanner Reliability Fix**
    - Replace brittle camera preflight with scanner-driven error handling and secure-context detection
    - Add clearer Safari/PWA fallback messaging plus safe stream shutdown on close
    - *Verification*: `npm run test:run -- src/components/mobile/MobileBarcodeScanner.test.tsx`
- [x] **Step: Tracking Status Inheritance & Notes**
    - Propagate kit status updates to nested asset tracking rows and add explicit clear behavior for inherited rows
    - Show current inventory tracking status badges for kits/assets and inherit kit status + notes in the mobile packing list UI
    - Add note create/edit/clear flows that persist to `inventory_tracking.notes` and remain visible until cleared
    - *Verification*: `npm run test:run -- src/services/mobile/inventoryTracking.service.test.ts src/components/mobile/MobileInventoryMode.test.tsx`, `npm run build`
- [x] **Step: Verification Follow-up**
    - Focused mobile tests pass: `npm run test:run -- src/components/mobile/MobileBarcodeScanner.test.tsx src/services/mobile/inventoryTracking.service.test.ts src/components/mobile/MobileInventoryMode.test.tsx`
    - Full test suite passes: `npm run test:run`
    - `npm run build` passes
    - `npm run lint` is currently blocked because the repo has no `eslint.config.*` or `.eslintrc*`
    - `npm run typecheck` is currently blocked because the repo has no `tsconfig.json`

### [x] Phase 7: Tracking & Dev Fixes
- [x] **Step: Fix Cumulative Tracking Schema**
    - Created migration `20260309000000_fix_inventory_tracking_cumulative.sql` to DROP the unique index and add a non-unique lookup index
    - The unique index was preventing multiple tracking records per (gig, kit, asset), breaking cumulative history
- [x] **Step: Preserve Unsynced Local Tracking on Refresh**
    - Updated `packingList.service.ts` to merge unsynced local tracking records (those without `id`) with fresh server data instead of overwriting
- [x] **Step: Fix Kit Row Whitespace**
    - Removed `pb-2` from expanded assets container in `MobileInventoryMode.tsx`
- [x] **Step: HTTPS Dev Path**
    - Wired `@vitejs/plugin-basic-ssl` into `vite.config.ts` (conditional via `VITE_HTTPS=true`)
    - Added `dev:https` script to `package.json`
- [x] **Step: Verification**
    - All 208 tests pass
    - Build succeeds

### [x] Phase 8: Maintenance, Notes & Scanner Fixes
- [x] **Step: Fix Maintenance Checkbox Persistence**
    - Added `update_asset_status` RPC function with `SECURITY DEFINER` to bypass RLS (assets table only allows admin/manager updates)
    - Updated `ASSET_STATUS_UPDATE` sync handler to use RPC instead of direct table update
    - Added bidirectional logic: checking sets 'Maintenance', unchecking reverts to 'Active'
- [x] **Step: Note Carry-Forward on Tracking Records**
    - `submitScan` now inherits notes from the latest tracking record for each item
    - Notes persist across status changes until explicitly cleared
- [x] **Step: UI Label Updates**
    - Removed "Notes are stored only on this item's latest tracking record" dialog description
    - Changed label from "Note" to "Notes on item condition"
    - Updated placeholder text
- [x] **Step: Fix iOS Safari Camera Scanner**
    - `handleScan` was treating ZXing decode errors (FormatException, ChecksumException) as fatal camera errors
    - Now only processes successful scan results; camera-level errors handled separately via `onError`
- [x] **Step: HTTPS Dev Path (mkcert)**
    - Switched from `@vitejs/plugin-basic-ssl` (self-signed, rejected by iOS) to mkcert-generated certs
    - Generated certs in `.certs/` for localhost and local network IPs
    - Configured Vite `server.https` with cert files when `VITE_HTTPS=true`
- [x] **Step: Kit Row Whitespace Fix**
    - Added `[&:last-child]:pb-0` to override CardContent's base `[&:last-child]:pb-6`
- [x] **Step: Verification**
    - All 208 tests pass
    - Build succeeds

### [x] Phase 4: Biometric Auth & Polish
<!-- chat-id: 1e2b21db-a179-476a-9803-dd63b6ee224f -->
- [x] **Step: WebAuthn Edge Function**
    - Implement `supabase/functions/server/webauthn` (challenge/verify)
    - *Verification*: `npm run build` succeeds
- [x] **Step: Biometric Enrollment & Management**
    - Install `@simplewebauthn/browser`
    - Add device enrollment to `src/components/mobile/MobileSettings.tsx`
    - *Verification*: `npm run build` succeeds
- [x] **Step: Session Unlock & Timeout Logic**
    - Implement FaceID/TouchID unlock flow with fallback
    - Implement 1h expiry and 15min background check
    - *Verification*: `npm test` passes
- [x] **Step: Final Polish & Design Tokens**
    - Refine UI for high contrast, touch targets, and iOS safe areas
    - *Verification*: `npm run build` succeeds

### [x] Phase 5: Manual Testing & Verification
<!-- chat-id: 7db1ae11-92e8-4f2f-8d29-69234b4b857d -->
- [x] **Step: Comprehensive Manual Testing**
    - [x] Create and upload PWA icons (192x192, 512x512, apple-touch-icon) to `public/`
    - [x] iOS PWA "Add to Home Screen" verification
    - [x] Offline scanning and sync verification
    - [ ] Biometric auth and fallback verification
    - [x] Rapid scanning haptics and audio cues verification

User Notes:
1. Biometric auth was not tested due to setup friction
2. Scanning is not rapid yet -- haptic cues not verified. 
3. Some lingering issues with cohesion between kits and nested assets (i.e. if all nested assets are checked off, should the kit also be checked off? Is it necessary to check off all the items in a containered kit?)