# Technical Specification: Mobile v1 (Field Ops)

## 1. Technical Context
- **Frontend**: React 18.3.1, Vite 6.3.5, Tailwind CSS 4.0
- **Backend**: Supabase (PostgreSQL 17, Auth, Edge Functions)
- **Mobile Platform**: iOS Safari PWA (see §1.1 for platform rationale)
- **State Management**: React state, context, and IndexedDB for offline data
- **Dependencies to Add**:
    - `react-qr-barcode-scanner`: Camera-based barcode scanning
    - `idb`: IndexedDB access (offline-first data storage)
    - `vite-plugin-pwa`: PWA manifest, service workers, and assets
    - `@simplewebauthn/browser`: WebAuthn integration (biometric auth)
    - `@simplewebauthn/server`: (Edge Functions) WebAuthn challenge verification

### 1.1 Platform Decision: Safari PWA

| Option | Pros | Cons |
|---|---|---|
| **Safari PWA** ✓ | No App Store review, instant updates, shared React codebase, free distribution | Limited iOS APIs (no background fetch, limited push notifications, no Bluetooth HID), Safari camera quirks |
| **Capacitor/Ionic** | Same React codebase + native shell, full native API access, App Store distribution | Xcode toolchain, App Store review, signing certificates, slower update cycle |
| **React Native** | Near-native performance, full native API access | Completely separate codebase, no code sharing with existing React/Vite app |
| **Native Swift** | Best performance, full API access | Entirely separate codebase, requires Swift expertise, highest cost |

**Decision**: PWA for v1. All required APIs (camera, WebAuthn/FaceID) are available in Safari. Capacitor is the natural upgrade path if Bluetooth HID scanners or richer push notifications are needed later.

## 2. Implementation Approach

### 2.1 PWA and Offline Capability
- **PWA Baseline**:
    - Configure `vite-plugin-pwa` to generate a manifest and service worker.
    - Define icons, splash screens, and standalone display mode for iOS.
- **Offline Data Strategy**:
    - **Caching**: Use `idb` to store the next 7 days of gigs (with full packing lists) for the current user.
    - **Sync Queue**: Implement an `outbox` in IndexedDB to queue scan results and asset status updates while offline.
    - **Background Sync**: A custom service worker listener or a simple interval check to process the outbox when connectivity returns.
    - **Conflict Resolution**: "Last write wins" for v1 (as per requirements).

### 2.2 UI/UX Architecture
- **Mobile-Specific Layout**:
    - `src/components/mobile/MobileLayout.tsx`: Bottom navigation component with icons for Dashboard, Inventory, and Settings.
    - Use `vaul` (Drawer) for detailed asset/kit views in Inventory mode.
    - Standardize touch targets (44x44px min) and high-contrast designs.
- **Views**:
    - `MobileDashboard`: Simplified card-based list of upcoming gigs (next 48h), quick links for navigation and calling.
    - `MobileInventoryMode`: Unified scanning view with selectable Scanning Mode (see §2.3).
    - `MobileBarcodeScanner`: Full-screen or modal camera interface for scanning.

### 2.3 Barcode Scanning & Inventory Flow

#### 2.3.1 Scanning Modes (Unordered)
The user selects a **Scanning Mode** that defines the context for all subsequent scans. Modes are an **unordered set** — any mode can be entered at any time, in any sequence. There is no enforced pipeline or implied ordering.

Available modes (configurable in `src/config/inventoryWorkflow.ts`):

| Mode | Resulting Status | Description |
|---|---|---|
| Pack-Out | `Checked Out` | Pulling items from warehouse for a gig |
| Load Truck | `In Transit` | Loading scanned items onto transport |
| Load-In | `On Site` | Confirming arrival at venue |
| Load-Out | `In Transit` | Packing up from venue |
| Unload | `In Warehouse` | Returning items to warehouse |

Example: A gig is cancelled mid-load → user switches directly from "Pack-Out" to "Unload" without traversing intermediate modes.

During Unload, user may optionally flag an asset's condition (`Inspect`, `Maintain`, `Damaged`) which updates `assets.status` independently of the inventory tracking status.

#### 2.3.2 Tag Matching
- Scans produce text that is matched against `tag_number` on both `kits` and `assets` tables for the current organization.
- Lookup order: `kits.tag_number` first (since container kits are scanned as a unit), then `assets.tag_number`.
- On match: the item is marked with the current mode's resulting status in `inventory_tracking`.
- On no match: display an alert with the scanned text and prompt the user to check the barcode or assign a tag.

#### 2.3.3 Missing Tag Workflow
- If an asset/kit on the packing list has **no `tag_number` set**, it is visually flagged in the packing list UI (e.g., warning icon, "No Tag" badge).
- These items cannot be scanned in; they must be manually checked off or have a tag assigned first.
- Alert message: *"[Item Name] has no tag number. Please assign a tag before scanning."*

#### 2.3.4 Rapid Scanning (High-Volume)
When a Scanning Mode is active, the scanner operates in **continuous rapid-scan mode**:
- Camera stays open continuously — no dismiss/re-open between scans.
- On successful match: brief toast (item name + checkmark) with haptic feedback (`navigator.vibrate`), auto-clears after ~1s.
- On error/no match: persistent alert requiring manual dismiss before continuing.
- Persistent header displays running counter: "X of Y scanned".
- Audio/haptic cues differentiate success vs. error (enables heads-down scanning without watching the screen).
- Debounce/dedup: ignore re-reads of the same barcode within 2s to prevent double-scanning.

#### 2.3.5 Scanning Hardware
- Integrate `react-qr-barcode-scanner` for real-time camera processing.
- Supported formats: QR Codes, Data Matrix, Code 128.
- Bluetooth HID scanners are out of scope for v1 (PWA limitation).

### 2.4 Biometric Authentication (WebAuthn / FaceID)
- **How it works**: WebAuthn's `navigator.credentials.get()` on iOS Safari delegates to the device's native biometric — **FaceID** on Face ID devices, **TouchID** on Touch ID devices. The browser handles the biometric prompt natively; our code speaks the WebAuthn protocol.
- **Enrollment**: Profile setting to register the current device via `navigator.credentials.create`. Stores the public key and credential ID in `user_devices` table.
- **Unlock**: On session expiry or manual lock, trigger `navigator.credentials.get` to re-authenticate. The Edge Function verifies the assertion against the stored public key.
- **Device Management**:
    - Users can view enrolled devices in `MobileSettings` and remove any device (deletes `user_devices` row).
    - Org Admins can revoke any user's device via the web app (for lost/stolen devices).
- **Fallback Authentication**:
    - After 3 consecutive failed biometric attempts, the biometric prompt is dismissed and the user is presented with standard Supabase email/password login.
    - WebAuthn is never the sole auth path — it's a convenience unlock layer.
- **Session Management**:
    - Biometric unlock refreshes/extends the Supabase session token.
    - Re-authentication triggers:
        - Session token expiry (configurable, default 1 hour for mobile).
        - App returning from background after >15 minutes of inactivity (tracked via `visibilitychange` event).
        - Manual lock by the user (button in Settings or shake gesture).
- **Backend**:
    - New table `user_devices` to store public keys, credential IDs, device names, and last-used timestamps.
    - Edge function endpoints: `webauthn/register` (challenge + verify registration), `webauthn/authenticate` (challenge + verify assertion).

### 2.5 Packing List API
- Packing list fetches **always include nested kit component details** (assets within kits), regardless of `is_container` flag.
- This allows users to expand any kit and verify individual contents (e.g., "Let me open this mic case and check each item").
- For container kits (`is_container = true`), the UI defaults to collapsed view but components are available for expansion.
- For non-container kits (`is_container = false`), the UI defaults to expanded view showing each component asset for individual scanning.
- New service function: `getGigPackingList(gigId)` in `src/services/mobile/packingList.service.ts` that queries `gig_kit_assignments` → `kits` → `kit_assets` → `assets`, returning a nested structure.

## 3. Source Code Structure Changes

```
src/
  components/
    mobile/
      MobileLayout.tsx          # Bottom nav shell
      MobileDashboard.tsx       # Upcoming gigs, quick links
      MobileInventoryMode.tsx   # Scanning mode selector + packing list
      MobileBarcodeScanner.tsx   # Camera scanner overlay
      MobileSettings.tsx        # Device enrollment, preferences
  services/
    mobile/
      packingList.service.ts    # Packing list fetch with nested components
      offlineSync.service.ts    # IndexedDB caching and outbox processing
      inventoryTracking.service.ts  # Scan result submission
  utils/
    idb/
      store.ts                  # IndexedDB schema and helpers
  config/
    inventoryWorkflow.ts        # Scanning modes config
supabase/
  functions/server/
    webauthn/                   # WebAuthn challenge/verification endpoints
  migrations/
    YYYYMMDD_mobile_schema.sql  # assets.tag_number, assets.status, is_container, inventory_tracking, user_devices, asset_status_history
```

## 4. Data Model Changes

### 4.1 Database Migrations Required

All changes require a new migration file. No changes to `schema.sql` directly.

**`assets` table** (ALTER):
- Add `tag_number` (`text`, nullable) — barcode/QR identifier, mirrors `kits.tag_number`
- Add `status` (`text`, default `'Active'`) — lifecycle status: `Active`, `Inspect`, `Maintain`, `Damaged`, `Retired`, `Sold`
- Add `service_life` (`integer`, nullable)
- Add `dep_method` (`text`, nullable)
- Add `liquidation_amt` (`numeric(10,2)`, nullable)

**`asset_status_history` table** (CREATE):
- Tracks changes to `assets.status` via trigger (mirrors `gig_status_history` pattern)
- Columns: `id`, `asset_id`, `from_status`, `to_status`, `changed_by`, `changed_at`
- Trigger: `track_asset_status_change` on `assets` AFTER UPDATE when `status` changes

**`kits` table** (ALTER):
- Add `is_container` (`boolean`, default `false`)

**`inventory_tracking` table** (CREATE):
- Columns: `id`, `organization_id`, `gig_id`, `kit_id`, `asset_id` (nullable), `status`, `scanned_at`, `scanned_by`, `notes`, `created_at`
- Unique constraint: `(gig_id, kit_id, COALESCE(asset_id, '00000000-...'))`
- RLS: org-scoped, matching `gig_kit_assignments` policies

**`user_devices` table** (CREATE):
- Columns: `id`, `user_id`, `credential_id`, `public_key`, `device_name`, `created_at`, `last_used_at`
- RLS: users can only read/write their own devices

### 4.2 API / Service Changes
- **New**: `src/services/mobile/packingList.service.ts` — fetches gig packing list with nested kit → asset component details
- **New**: `src/services/mobile/inventoryTracking.service.ts` — submits scan results (upserts `inventory_tracking` rows)
- **New**: `src/services/mobile/offlineSync.service.ts` — manages IndexedDB cache and outbox
- **Extend**: `src/utils/supabase/types.tsx` — add TypeScript types for new tables

## 5. Delivery Phases

### Phase 1: PWA Foundation & Schema
- Setup `vite-plugin-pwa` with manifest, icons, service worker
- Create SQL migration for all schema changes (§4.1)
- Implement `MobileLayout` with bottom navigation and mobile route detection in `App.tsx`

### Phase 2: Mobile Dashboard & Offline Gigs
- Implement `MobileDashboard` with next-48h gig cards, navigation/call quick links
- Setup `idb` store for caching gigs and packing lists
- Implement `offlineSync.service.ts` with outbox pattern

### Phase 3: Scanning Modes & Inventory Tracking
- Implement `MobileInventoryMode` with mode selector and packing list display
- Integrate `react-qr-barcode-scanner` in `MobileBarcodeScanner`
- Implement tag matching logic and missing-tag alerts
- Implement `inventoryTracking.service.ts` for scan result submission
- Wire up outbox for offline scan queuing

### Phase 4: Biometric Auth & Polish
- Implement WebAuthn enrollment and device management in `MobileSettings`
- Implement session unlock flow with FaceID/TouchID, fallback to email/password after 3 failures
- Implement session timeout logic (1h expiry, 15min background inactivity, manual lock)
- Edge function for WebAuthn challenge/verification
- Final UI/UX refinements (high contrast, thumb-driven nav, iOS safe areas)

### Phase 5: Manual Testing & Device Verification
Distinct step for on-device testing and bug-fixing. Expected to involve iterative debugging.
- "Add to Home Screen" on iOS Safari → verify standalone mode, splash screen, icons
- Offline mode: disable network, perform scans, re-enable, verify outbox sync
- Rapid scanning: high-volume scan session (20+ items), verify counter, haptics, debounce
- FaceID/TouchID prompt on session unlock, fallback after 3 failures
- Device management: enroll, view, remove device
- Cross-browser: verify graceful degradation on non-Safari browsers
- Record findings and fixes in plan.md

## 6. Verification Approach
- **Unit Testing** (Vitest):
    - Scanning mode state management and transitions
    - Tag matching logic (kit match, asset match, no match, missing tag)
    - Offline sync outbox enqueue/dequeue
    - Packing list data transformation (nested components)
- **Integration Testing**:
    - Barcode scanning with mock camera feed
    - WebAuthn flow with mock `navigator.credentials`
- **Manual Testing**:
    - Via a comprehensive manual test plan for the user to execute.
- **CI**:
    - `npm run lint`
    - `npm run typecheck`
    - `npm run test:run`
