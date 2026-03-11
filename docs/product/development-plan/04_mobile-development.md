# Technical Detail: Mobile Development

This document is the single authoritative mobile development plan for GigManager. It covers all mobile workflows, PWA configuration, offline sync, and push notifications.

---

## 1. Overview & Priorities

Mobile development is organized by priority:

1. **Gig Browsing & Quick Booking** — The most urgent need. A compact mobile interface for scanning upcoming gigs, confirming booking status, and entering new bookings with basic information.
2. **Staff Dashboard** — A glanceable view for crew members showing upcoming assigned gigs with quick access to venue info and contacts.
3. **Inventory & Warehouse Mode** — Barcode scanning workflows for tracking equipment through the gig lifecycle (pack-out, load, unload, return).

---

## 2. PWA Configuration & Caching Strategy

GigManager will be an offline-first PWA to support staff in the field (venues, warehouses).

### 2.1 PWA Manifest & Icons
- **`manifest.json` Configuration**:
    - `display`: `standalone` (removes browser chrome).
    - `orientation`: `any`.
    - `theme_color`: `#0ea5e9` (Sky-500).
    - `background_color`: `#f8fafc` (Gray-50).
    - `icons`: Comprehensive set (192x192, 512x512, maskable).
    - `splash_screens`: Custom splash screens for standalone PWA experience.

### 2.2 Service Worker Strategy (`vite-plugin-pwa`)
- **Static Assets**: `CacheFirst` for JS, CSS, and Fonts.
- **API Responses**: `StaleWhileRevalidate` for gig lists and details.
- **Background Sync**: Use the Workbox `BackgroundSyncPlugin` to replay failed `POST/PATCH` requests when connectivity returns.

### 2.3 Data Persistence (`idb`)
While the Service Worker caches network responses, we will use `idb` for explicitly managed offline data:
- **`GigStore`**: Local copy of frequently accessed gigs.
- **`OutboxStore`**: Queue of pending local edits (Create/Update/Delete) that need to be synced to Supabase.
- **Conflict Handling**: If a sync fails due to a newer server-side change, notify the user via a "Sync Conflict" toast with an option to "Keep Mine" or "Discard Mine".

---

## 3. Mobile Gig Browsing & Quick Booking

The primary mobile experience. Users need to quickly check upcoming gigs, confirm availability, and capture new bookings on the go.

### 3.1 Mobile Gig List
- **Card-based layout**: Each gig displayed as a compact card showing date/time, title, status badge, act name(s), and venue name.
- **Default view**: Upcoming gigs sorted by date (nearest first), filtered to the user's organization.
- **Filters**: By date range, status, venue, act. Filters accessible via a slide-up panel.
- **Search**: Text search across gig title, venue, and act names.
- **Pull-to-refresh**: Standard mobile refresh pattern.

### 3.2 Simplified Gig Detail View
A read-only detail view showing only the essentials — mirroring the "Basic Information" block plus venue and act participants from the desktop Gig screen:

- **Title**
- **Start/End date and time** (with timezone)
- **Status** (with ability to update)
- **Act(s)** (name)
- **Venue** (name, with tap to open directions)
- **Tags**
- **Notes** (scrollable)


Excludes: staff assignments, financials, equipment/kit details, attachments. These are accessible on the desktop app.

### 3.3 Quick-Create Gig
A streamlined form for capturing new bookings with minimal fields:

- **Title** (required)
- **Start date/time** (required)
- **End date/time** (required)
- **Timezone** (defaults to device timezone)
- **Status** (defaults to "Date Hold")
- **Venue** (searchable dropdown of existing organizations)
- **Act** (searchable dropdown of existing organizations)
- **Notes** (free text)

This creates a gig with basic information and optionally adds venue/act as gig participants. Full details can be added later from the desktop app.

### 3.4 Booking Status Confirmation
- **Status update**: Tap to change gig status directly from the gig list or detail view.
- **Quick actions**: Swipe gestures or action buttons for common status transitions (e.g., Date Hold → Booked).

---

## 4. Staff Dashboard

The mobile staff dashboard is designed for high-glanceability and quick action for crew members on-site.

- **Upcoming Gigs**: A card-based list of assigned gigs for the next 48 hours.
- **Quick Links**:
    - **Venue Map/Directions**: Integration with device native maps.
    - **Documents**: A full-screen SVG/PDF viewer for technical documents.
    - **Contact List**: One-tap access to call/message gig organizers.

---

## 5. Inventory Mode (One-Handed Logistics)

Inventory Mode is a specialized interface for equipment logistics, optimized for single-handed use. It supports a multi-step workflow for tracking assets through the full gig lifecycle.

- **Flow**:
    1. Select a Gig, display Packing List.
    2. Select a lifecycle stage
    3. Kits that are not a container are expanded to reveal components — so that assets within a kit may be accounted for.
    4. Check off or Scan item barcode (Kit or individual Asset).
    5. Update tracking status of kit or asset
    6. User optionally adds note or checks 'Maintenance Req'd'

---

## 6. Barcode Scanning & Hardware

### 6.1 Implementation Strategy
- **Camera Scanning**: Use `react-qr-barcode-scanner` for built-in camera access.
- **External Scanners**: Support Bluetooth HID scanners.
    - Implement a global key-press listener to capture fast input from external scanners.
    - Add a `scanner_prefix` and `scanner_suffix` (e.g., Enter) configuration to distinguish scanner input from keyboard input.

### 6.2 Barcode Formats
The system will support the following standard formats:
- **QR Codes**: For general asset identification and kitting.
- **Data Matrix**: For small assets with limited surface area.
- **Code 128**: Compatibility with legacy rental house systems.

---

## 7. Advanced Authentication & Security

### 7.1 Biometric Auth (WebAuthn)
To allow field staff to quickly unlock the app without typing passwords on small screens.
- **WebAuthn Integration**: Support for FaceID/TouchID for quick session unlocking.
- **Device Enrollment**: Users can register their mobile device in their profile settings.
- **Fast Auth**: A "Sign in with Biometrics" button on the login screen.

### 7.2 Location-Based Services (LBS)
- **Geofencing**: Store GPS coordinates for all Venues.
- **Radius Check**: Staff can only mark themselves as "On Site" if within 500m of the venue coordinates.
- **Privacy**: Location is only tracked at the moment of check-in/out, not continuously.

---

## 8. Mobile UI/UX Best Practices

### 8.1 Design Tokens
- **Touch Targets**: All interactive elements (buttons, toggles, list items) must be at least **44x44px**.
- **Bottom Navigation**: Primary app navigation moves to the bottom of the screen for thumb-driven usage.
- **Contrast**: High-contrast themes to ensure readability in bright sunlight (outdoor festivals).

### 8.2 Offline Reliability
- **Offline-First**: Cache 7 days of gig data using IndexedDB.
- **Background Sync**: Queue scans and asset status updates while offline; automatic sync upon reconnection.
- **PWA Baseline**: Standalone "Add to Home Screen" experience with custom manifest and splash screens.
- **Conflict Handling**: "Last write wins" for status updates, with manual resolution for inventory discrepancies.

---

## 9. Offline Sync & Conflict Resolution

GigManager will utilize `idb` (IndexedDB) and a Service Worker-based synchronization strategy to support mobile use in low-connectivity environments.

### 9.1 Local Storage Strategy (IndexedDB)
- **Object Stores**:
    - `pending_sync`: Stores outgoing mutations (POST/PATCH/DELETE) with timestamps and sequence numbers.
    - `gig_cache`: Stores the most recently accessed gigs.
    - `asset_cache`: Stores critical asset/kit data for warehouse operations.
- **Sync Queue Schema**:
    ```typescript
    interface SyncOperation {
      id: string;             // Unique ID for the operation
      timestamp: number;      // Sequence for ordering
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      table: string;          // e.g., 'gigs', 'kit_assignments'
      payload: any;           // The data to be sent
      status: 'pending' | 'syncing' | 'failed';
      retryCount: number;
    }
    ```

### 9.2 Synchronization Workflow
1.  **Intercept & Queue**: If the network is unavailable, the `apiClient` intercepts the request and writes it to the `pending_sync` store.
2.  **Background Sync**: The Service Worker listens for the `sync` event (or uses a fallback polling mechanism) to drain the `pending_sync` queue when the browser detects connectivity.
3.  **Conflict Resolution**:
    - **Last-Write-Wins (LWW)**: Default strategy for simple fields (notes, names).
    - **Version Check**: For critical fields (gig status, asset availability), the backend will check `updated_at` timestamps. If a conflict occurs, the client is notified via a "Sync Conflict" UI to choose between "Keep Local" or "Use Server".

---

## 10. Push Notification Architecture

To keep staff updated on real-time changes (e.g., schedule changes, new assignments), we will implement a Web Push architecture.

### 10.1 Subscription Flow
1.  **Permission**: UI prompts user for notification permission on the mobile dashboard.
2.  **Registration**: Client generates a `PushSubscription` via the browser's `PushManager`.
3.  **Storage**: The subscription (endpoint, keys) is sent to a Supabase table `user_push_subscriptions` linked to the `user_id`.

### 10.2 Trigger Mechanism
- **Supabase Database Webhooks**: When a gig is updated, a database webhook triggers a Supabase Edge Function.
- **Edge Function (`notify-staff`)**:
    - Queries `user_push_subscriptions` for all staff assigned to that gig.
    - Sends a payload (title, body, icon, URL) to the Web Push service (FCM or similar).
    - Includes a `tag` in the notification to collapse multiple updates for the same gig.

---

## 11. Data Model Extensions

### 11.1 `assets` table
- Add **`tag_number`** (`text`, nullable): Barcode/QR identifier for individual assets (mirrors `kits.tag_number`).
- Add **`status`** (`text`, default `'Active'`): Asset condition/lifecycle status. One of: `Active`, `Inspect`, `Maintain`, `Damaged`, `Retired`, `Sold`.
- Add **`service_life`** (`integer`, nullable): Expected service life in years.
- Add **`dep_method`** (`text`, nullable): Depreciation method (e.g., `Straight-Line`, `Declining Balance`).
- Add **`liquidation_amt`** (`numeric(10,2)`, nullable): Amount the item was sold for.

### 11.1.1 `asset_status_history` table (new)
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

### 11.2 `kits` table
- Add **`is_container`** (`boolean`, default `false`): When `true`, the kit is a physical container (e.g., a mic case) and is scanned/tracked as a single unit. When `false`, the kit is a logical grouping and its individual component assets are scanned separately.

### 11.3 `inventory_tracking` table (new)
Unified tracking table for both kits and individual assets within a gig. For container kits, `asset_id` is `NULL` (the kit is tracked as a whole). For non-container kits, each component asset gets its own row with `asset_id` populated.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto-generated |
| `organization_id` | `uuid` | FK → `organizations`, for RLS |
| `gig_id` | `uuid` | FK → `gigs` |
| `kit_id` | `uuid` | FK → `kits` (the parent kit from `gig_kit_assignments`) |
| `asset_id` | `uuid`, nullable | FK → `assets`. `NULL` when tracking a container kit as a unit. |
| `status` | `text` | One of the values from the inventory workflow config (see §11.4) |
| `scanned_at` | `timestamptz` | Timestamp of last scan |
| `scanned_by` | `uuid` | FK → `auth.users` |
| `notes` | `text` | Optional |
| `created_at` | `timestamptz` | Auto-set |

- **Unique constraint**: `(gig_id, kit_id, asset_id)` — with `asset_id` treated as nullable (use `COALESCE` or partial unique indexes)
- **RLS**: Same policies as `gig_kit_assignments` (org-scoped access).

### 11.4 Inventory Workflow Steps (configurable)
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

## 12. Implementation Roadmap

### Sprint 1: PWA Baseline + Gig Browsing
1.  **PWA Baseline**: Configure `vite-plugin-pwa` and manifest.
2.  **Mobile Gig List**: Card-based gig list with search and filters.
3.  **Gig Detail View**: Simplified read view (basic info + venue + act).
4.  **Quick-Create Gig**: Streamlined booking entry form.

### Sprint 2: Inventory Mode + Staff Dashboard
1.  **Scanner Hook**: Develop `useScanner.ts` to handle both camera and HID input.
2.  **Warehouse UI**: Implement the Scan-and-Update views for Pack-Out/Load/Unload.
3.  **Staff Dashboard**: Upcoming gigs, venue links, contact list.
4.  **Geofence Logic**: Add distance calculation utilities and check-in button validation.

### Sprint 5: Offline Sync & Push Notifications
1.  **Offline Sync**: Finalize IndexedDB sync queue and conflict resolution UI.
2.  **Push Notifications**: Implement subscription flow and Edge Function triggers.
3.  **Biometric Auth**: WebAuthn device enrollment and fast login.

---

## 13. Resolved Decisions
- **Inventory Mode** is a view within the same PWA, not a separate sub-app.
- **Maintenance workflow**: Mobile sets `assets.status` to `Inspect`/`Maintain`/`Damaged`; the main web app surfaces these via asset reports. History tracked in `asset_status_history`.
- **Offline map data** is not needed; navigation delegates to native map apps.
- **Stage Plots, Time Tracking, Geofencing, Bluetooth HID scanners** are out of scope for v1.
- **Offline conflict resolution**: "Last write wins" for v1. Richer conflict UI can be added later.
