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
- **Pack-Out Flow**:
    - Select a Gig, display Packing List.
    - Kits that are not a container are expanded to reveal components -- so that assets within a kit may be accounted for. 
    - Scan item barcode (Kit or individual Asset).
    - Verify against packing list.
    - Update status of assets to `Checked Out`.
- **Load Truck Flow**:
    - Same as Pack-Out Flow.
    - Scan item barcode.
    - Auto-detect the last associated Gig.
    - Update status to `In Transit`.
- **Load-In Flow** (optional):
    - Update status of assets to `On Site`.
- **Load-Out Flow** (optional):
    - Update status to `In Transit`.
- **Unload Flow**:
    - Update status to `In Warehouse`.
    - Optionally set asset `status` to `Inspect` or `Maintain` if issues noted during return (tracked via `assets.status` and `asset_status_history`).

### 3.3 Barcode & Hardware Integration
- **Camera Scanning**: Integrated scanning via device camera.
- **Supported Formats**: QR Codes, Data Matrix, Code 128.

### 3.4 Biometric Authentication
- **WebAuthn Integration**: Support for FaceID/TouchID for quick session unlocking.
- **Device Enrollment**: Users can register their mobile device in their profile settings.

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

### 6.4 Inventory Workflow Steps (configurable)
The inventory flow is defined as an ordered sequence of **step name → resulting status** pairs. This makes it easy to add, remove, or reorder steps without code changes.

**Default workflow**:

| Order | Step Name | Resulting Status |
|---|---|---|
| 1 | Pack-Out | `Checked Out` |
| 2 | Load Truck | `In Transit` |
| 3 | Load-In | `On Site` |
| 4 | Load-Out | `In Transit` |
| 5 | Unload | `In Warehouse` |

- Steps 3 and 4 are optional (can be skipped).
- **Maintenance/Inspect** is handled by setting `assets.status` (e.g., to `Inspect` or `Maintain`) during any step, particularly Unload. This is orthogonal to inventory tracking status and recorded in `asset_status_history`.
- This configuration lives in application code (a constant/config array), not in the database.

## 7. Resolved Decisions
- **Inventory Mode** is a view within the same PWA, not a separate sub-app.
- **Maintenance workflow**: Mobile sets `assets.status` to `Inspect`/`Maintain`/`Damaged`; the main web app surfaces these via asset reports. History tracked in `asset_status_history`.
- **Offline map data** is not needed; navigation delegates to native map apps.
- **Stage Plots, Time Tracking, Geofencing, Bluetooth HID scanners** are out of scope for v1.
- **Offline conflict resolution**: "Last write wins" for v1. Richer conflict UI can be added later.

## 8. Open Questions
- None — all resolved.
