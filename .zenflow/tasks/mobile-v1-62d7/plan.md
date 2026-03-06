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

### [ ] Phase 3: Scanning Modes & Inventory Tracking
<!-- chat-id: 6ac95b6b-356a-432a-95d4-97b1365128ac -->
- [ ] **Step: Inventory Mode & Packing List UI**
    - Implement `src/components/mobile/MobileInventoryMode.tsx`
    - Add mode selector and packing list with "No Tag" flags
    - *Verification*: `npm test` for Inventory view
- [ ] **Step: Barcode Scanner Integration**
    - Install `react-qr-barcode-scanner`
    - Implement `src/components/mobile/MobileBarcodeScanner.tsx`
    - Handle tag matching, haptics, and error alerts
    - *Verification*: `npm test` for scanner logic
- [ ] **Step: Inventory Tracking Service**
    - Implement `src/services/mobile/inventoryTracking.service.ts`
    - Handle scan submissions and offline outbox queuing
    - *Verification*: `npm test` for tracking service

### [ ] Phase 4: Biometric Auth & Polish
- [ ] **Step: WebAuthn Edge Function**
    - Implement `supabase/functions/server/webauthn` (challenge/verify)
    - *Verification*: Edge Function tests with mock data
- [ ] **Step: Biometric Enrollment & Management**
    - Install `@simplewebauthn/browser`
    - Add device enrollment to `src/components/mobile/MobileSettings.tsx`
    - *Verification*: `npm test` for enrollment logic
- [ ] **Step: Session Unlock & Timeout Logic**
    - Implement FaceID/TouchID unlock flow with fallback
    - Implement 1h expiry and 15min background check
    - *Verification*: `npm test` for session management
- [ ] **Step: Final Polish & Design Tokens**
    - Refine UI for high contrast, touch targets, and iOS safe areas
    - *Verification*: `npm run lint`, `npm run build`

### [ ] Phase 5: Manual Testing & Verification
- [ ] **Step: Comprehensive Manual Testing**
    - [ ] Create and upload PWA icons (192x192, 512x512, apple-touch-icon) to `public/`
    - [ ] iOS PWA "Add to Home Screen" verification
    - [ ] Offline scanning and sync verification
    - Biometric auth and fallback verification
    - Rapid scanning haptics and audio cues verification
