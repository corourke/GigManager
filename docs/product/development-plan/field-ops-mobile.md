# Technical Detail: Field Ops & Mobile Experience

This document outlines the mobile strategy for GigManager, focusing on staff workflows in the field and warehouse environments.

## 1. Mobile-First Workflows

### 1.1 Staff Dashboard
The mobile staff dashboard is designed for high-glanceability and quick action for crew members on-site.

- **Upcoming Gigs**: A card-based list of assigned gigs for the next 48 hours.
- **Quick Links**:
    - **Venue Map/Directions**: Integration with device native maps.
    - **Stage Plots**: A full-screen SVG/PDF viewer for technical documents.
    - **Contact List**: One-tap access to call/message gig organizers.
- **Time Tracking**: Location-aware "Check-in" button that becomes active when within a predefined radius of the venue.

### 1.2 Inventory Mode (One-Handed Logistics)
Inventory Mode is a specialized interface for equipment logistics, optimized for single-handed use. It supports a multi-step workflow for tracking assets through the full gig lifecycle.

- **Pack-Out Flow**:
    1. Select a Gig, display Packing List.
    2. Kits that are not a container are expanded to reveal components — so that assets within a kit may be accounted for.
    3. Scan item barcode (Kit or individual Asset).
    4. Verify against packing list.
    5. Visual/Audio feedback (Success, Wrong Item, Already Packed).
    6. Update status of assets to `Checked Out`.
- **Load Truck Flow**:
    1. Scan item barcode.
    2. Auto-detect the last associated Gig.
    3. Update status to `In Transit`.
- **Load-In Flow** (optional):
    1. Update status of assets to `On Site`.
- **Load-Out Flow** (optional):
    1. Update status to `In Transit`.
- **Unload Flow**:
    1. Scan item barcode.
    2. Auto-detect associated Gig.
    3. Update status to `In Warehouse`.
    4. Optionally set asset `status` to `Inspect` or `Maintain` if issues noted during return (tracked via `assets.status` and `asset_status_history`).
- **Return Flow**:
    1. Scan item barcode.
    2. Auto-detect associated Gig.
    3. Update status to `In Warehouse`.
    4. Prompt for "Maintenance Required" if flagged during return.

---

## 2. Barcode Scanning & Hardware

### 2.1 Implementation Strategy
- **Camera Scanning**: Use `react-qr-barcode-scanner` for built-in camera access.
- **External Scanners**: Support Bluetooth HID scanners.
    - Implement a global key-press listener to capture fast input from external scanners.
    - Add a `scanner_prefix` and `scanner_suffix` (e.g., Enter) configuration to distinguish scanner input from keyboard input.

### 2.2 Barcode Formats
The system will support the following standard formats:
- **QR Codes**: For general asset identification and kitting.
- **Data Matrix**: For small assets with limited surface area.
- **Code 128**: Compatibility with legacy rental house systems.

---

## 3. Advanced Authentication & Security

### 3.1 Biometric Auth (WebAuthn)
To allow field staff to quickly unlock the app without typing passwords on small screens.
- **WebAuthn Integration**: Support for FaceID/TouchID for quick session unlocking.
- **Device Enrollment**: Users can register their mobile device in their profile settings.
- **Enrollment**: Users can register a device (FaceID/TouchID/Android Biometrics) in their profile settings.
- **Fast Auth**: A "Sign in with Biometrics" button on the login screen.

### 3.2 Location-Based Services (LBS)
- **Geofencing**: Store GPS coordinates for all Venues.
- **Radius Check**: Staff can only mark themselves as "On Site" if within 500m of the venue coordinates.
- **Privacy**: Location is only tracked at the moment of check-in/out, not continuously.

---

## 4. Mobile Best Practices (UI/UX)

### 4.1 Design Tokens
- **Touch Targets**: All interactive elements (buttons, toggles, list items) must be at least **44x44px**.
- **Bottom Navigation**: Primary app navigation moves to the bottom of the screen for thumb-driven usage.
- **Contrast**: High-contrast themes to ensure readability in bright sunlight (outdoor festivals).

### 4.2 Offline Reliability
- **Offline-First**: Cache 7 days of gig data using IndexedDB.
- **Local Storage**: Use `idb` (IndexedDB) to cache the user's upcoming 7 days of gig data.
- **Background Sync**: Queue scans and asset status updates while offline; automatic sync upon reconnection. Changes made offline (e.g., checking an item out) are queued and synced using the Background Sync API when connectivity returns.
- **PWA Baseline**: Standalone "Add to Home Screen" experience with custom manifest and splash screens.
- **Conflict Handling**: "Last write wins" for status updates, with manual resolution for inventory discrepancies.

---

## 5. Implementation Roadmap (Sprint 3)
1.  **PWA Baseline**: Configure `vite-plugin-pwa` and manifest.
2.  **Scanner Hook**: Develop `useScanner.ts` to handle both camera and HID input.
3.  **Warehouse UI**: Implement the Scan-and-Update views for Load-Out/Return.
4.  **Geofence Logic**: Add distance calculation utilities and check-in button validation.

---

## 6. Data Model Extensions

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

---

## 7. Resolved Decisions
- **Inventory Mode** is a view within the same PWA, not a separate sub-app.
- **Maintenance workflow**: Mobile sets `assets.status` to `Inspect`/`Maintain`/`Damaged`; the main web app surfaces these via asset reports. History tracked in `asset_status_history`.
- **Offline map data** is not needed; navigation delegates to native map apps.
- **Stage Plots, Time Tracking, Geofencing, Bluetooth HID scanners** are out of scope for v1.
- **Offline conflict resolution**: "Last write wins" for v1. Richer conflict UI can be added later.
