# Product Requirements Document: Mobile v1 (Field Ops)

## 1. Objective
Enable field staff and warehouse personnel to perform critical tasks on mobile devices (iOS focus) with a streamlined, offline-capable interface.

## 2. Target Users
- **Field Staff**: Crew members on-site at venues.
- **Warehouse Staff**: Personnel managing equipment logistics.

## 3. Key Features

### 3.1 Staff Dashboard (High Glanceability)
- **Upcoming Gigs View**: Card-based list of gigs assigned to the user for the next 48 hours.
- **Quick Links**:
    - **Navigation**: One-tap to open Apple/Google Maps with venue address.
    - **Communications**: One-tap to call or message gig contacts.

### 3.2 Inventory Mode (One-Handed Logistics)

#### 3.2.1 Scanning Modes
The user selects a **Scanning Mode** that defines the operation context. Modes are an **unordered set** — any mode can be entered at any time, in any sequence. There is no enforced ordering or pipeline between modes.

| Mode | Resulting Status | Description |
|---|---|---|
| Pack-Out | `Checked Out` | Pulling items from warehouse for a gig |
| Load Truck | `In Transit` | Loading scanned items onto transport |
| Load-In | `On Site` | Confirming arrival at venue |
| Load-Out | `In Transit` | Packing up from venue |
| Unload | `In Warehouse` | Returning items to warehouse |

- Any mode can follow any other mode (e.g., Pack-Out → Unload if gig is cancelled).
- During Unload, user may optionally flag an asset's condition (`Inspect`, `Maintain`, `Damaged`) which updates `assets.status` independently of the inventory tracking status.

#### 3.2.2 Scanning Workflow
1. Select a Gig → display Packing List.
2. Packing list fetches **always include nested kit component details** so users can expand any kit to verify contents.
3. Non-container kits are expanded by default to show individual component assets.
4. Container kits are shown collapsed but expandable.
5. Select a Scanning Mode (e.g., "Pack-Out").
6. Scan item barcode → text is matched against `tag_number` on `kits` and `assets` tables.
7. On match: item is marked with the current mode's resulting status.
8. On no match: alert displayed with scanned text, prompting user to verify barcode or assign a tag.

#### 3.2.3 Rapid Scanning (High-Volume)
When a Scanning Mode is active, the scanner operates in **continuous rapid-scan mode** by default:
- Camera stays open continuously — no dismiss/re-open per scan.
- On successful match: brief confirmation toast (item name + checkmark) with haptic feedback, auto-clears after ~1 second.
- On error/no match: persistent alert that must be dismissed before continuing.
- Running counter in persistent header shows "X of Y scanned" against the packing list.
- Audio/haptic cues differentiate success vs. error so the user doesn't need to look at the screen between scans.

#### 3.2.4 Missing Tag Workflow
- If an asset/kit on the packing list has **no `tag_number` set**, it is visually flagged (warning icon, "No Tag" badge).
- These items cannot be scanned in; they must be manually checked off or have a tag assigned first.
- Alert: *"[Item Name] has no tag number. Please assign a tag before scanning."*

### 3.3 Barcode & Hardware Integration
- **Camera Scanning**: Integrated scanning via device camera.
- **Supported Formats**: QR Codes, Data Matrix, Code 128.

### 3.4 Biometric Authentication
- **WebAuthn Integration**: Support for FaceID/TouchID for quick session unlocking. Safari delegates `navigator.credentials.get()` to the device's native biometric (FaceID or TouchID).
- **Device Enrollment**: Users can register their mobile device in their profile settings.
- **Device Management**: Users can view and remove their enrolled devices from Settings. Organization Admins can revoke any user's device (e.g., lost/stolen phone). Removing a device deletes its credential from `user_devices`.
- **Fallback Authentication**: After 3 failed biometric attempts, the app falls back to standard Supabase email/password login. WebAuthn is a convenience layer and never the sole authentication path.
- **Session Management**: Biometric unlock extends the existing Supabase session. Re-authentication is triggered by:
    - Session token expiry (configurable, default 1 hour for mobile).
    - App returning from background after >15 minutes of inactivity.
    - Manual lock by the user.

### 3.5 Offline Reliability & Performance
- **Offline-First**: Cache 7 days of gig data using IndexedDB.
- **Background Sync**: Queue scans and asset status updates while offline; automatic sync upon reconnection.
- **PWA Baseline**: Standalone "Add to Home Screen" experience with custom manifest and splash screens.

## 4. UI/UX Standards
- **Thumb-Driven Navigation**: Primary navigation at the bottom of the screen.
- **Touch Targets**: Minimum 44x44px for all interactive elements.
- **High Contrast**: Optimized for outdoor readability in bright sunlight.

## 5. Technical Constraints
- **Platform**: iOS (Safari PWA focus).
- **Architecture**: React with Vite, Supabase backend.
- **Scanning**: `react-qr-barcode-scanner`.
- **Offline**: `idb` (IndexedDB), Service Workers (`vite-plugin-pwa`).

## 6. Proposed Data Model Extensions

> **Note**: All schema changes in this section are **proposed requirements only** — no migrations or code have been implemented yet. During implementation, each change must be written as a SQL migration file under `supabase/migrations/` and applied to the remote Supabase database with explicit user approval before proceeding.

### 6.1 `assets` table
- Add **`tag_number`** (`text`, nullable): Barcode/QR identifier for individual assets (mirrors `kits.tag_number`).
- Add **`status`** (`text`, default `'Active'`): Asset condition/lifecycle status. One of: `Active`, `Inspect`, `Maintain`, `Damaged`, `Retired`, `Sold`.
- Add **`service_life`** (`integer`, nullable): Expected service life in years.
- Add **`dep_method`** (`text`, nullable): Depreciation method (e.g., `Straight-Line`, `Declining Balance`).
- Add **`liquidation_amt`** (`numeric(10,2)`, nullable): Amount the item was sold for.

### 6.1.1 `asset_status_history` table (new)
Automatically tracks changes to `assets.status` via a database trigger (mirrors `gig_status_history` pattern).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto-generated |
| `asset_id` | `uuid` | FK → `assets` |
| `from_status` | `text` | Previous status (nullable for initial insert) |
| `to_status` | `text` | New status |
| `changed_by` | `uuid` | FK → `auth.users` |
| `changed_at` | `timestamptz` | Auto-set via `now()` |

- **Trigger**: `track_asset_status_change` on `assets` AFTER UPDATE, fires when `status` changes. Inserts a row with `OLD.status` → `NEW.status`.
- **RLS**: Viewable by users with access to the asset's organization.

### 6.2 `kits` table
- Add **`is_container`** (`boolean`, default `false`): When `true`, the kit is a physical container (e.g., a mic case) and is scanned/tracked as a single unit. When `false`, the kit is a logical grouping and its individual component assets are scanned separately.

### 6.3 `inventory_tracking` table (new)
Unified tracking table for both kits and individual assets within a gig. For container kits, `asset_id` is `NULL` (the kit is tracked as a whole). For non-container kits, each component asset gets its own row with `asset_id` populated.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto-generated |
| `organization_id` | `uuid` | FK → `organizations`, for RLS |
| `gig_id` | `uuid` | FK → `gigs` |
| `kit_id` | `uuid` | FK → `kits` (the parent kit from `gig_kit_assignments`) |
| `asset_id` | `uuid`, nullable | FK → `assets`. `NULL` when tracking a container kit as a unit. |
| `status` | `text` | One of the values from the inventory workflow config (see §6.4) |
| `scanned_at` | `timestamptz` | Timestamp of last scan |
| `scanned_by` | `uuid` | FK → `auth.users` |
| `notes` | `text` | Optional |
| `created_at` | `timestamptz` | Auto-set |

- **Unique constraint**: `(gig_id, kit_id, asset_id)` — with `asset_id` treated as nullable (use `COALESCE` or partial unique indexes)
- **RLS**: Same policies as `gig_kit_assignments` (org-scoped access).

### 6.4 Scanning Modes (configurable)
The inventory flow is defined as a set of **mode name → resulting status** pairs. Modes are **unordered** — users can enter any mode at any time. This makes it easy to add or remove modes without code changes.

**Default modes**:

| Mode | Resulting Status |
|---|---|
| Pack-Out | `Checked Out` |
| Load Truck | `In Transit` |
| Load-In | `On Site` |
| Load-Out | `In Transit` |
| Unload | `In Warehouse` |

- Any mode can follow any other mode (no enforced ordering).
- **Maintenance/Inspect** is handled by setting `assets.status` (e.g., to `Inspect` or `Maintain`) during any mode, particularly Unload. This is orthogonal to inventory tracking status and recorded in `asset_status_history`.
- This configuration lives in application code (a constant/config array), not in the database.

## 7. Resolved Decisions
- **Inventory Mode** is a view within the same PWA, not a separate sub-app.
- **Maintenance workflow**: Mobile sets `assets.status` to `Inspect`/`Maintain`/`Damaged`; the main web app surfaces these via asset reports. History tracked in `asset_status_history`.
- **Offline map data** is not needed; navigation delegates to native map apps.
- **Stage Plots, Time Tracking, Geofencing, Bluetooth HID scanners** are out of scope for v1.
- **Offline conflict resolution**: "Last write wins" for v1. Richer conflict UI can be added later.

## 8. Open Questions
- None — all resolved.
