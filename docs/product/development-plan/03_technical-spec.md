# Technical Specification: GigManager Evolution

## 1. Technical Context
- **Frontend**: React 18.3.1, TypeScript, Tailwind CSS 4.0, Vite 6.
- **Backend**: Supabase (PostgreSQL 17), Edge Functions (Deno 2).
- **State Management**: AuthContext, NavigationContext, and Supabase real-time subscriptions.
- **Testing**: Vitest, React Testing Library.
- **New Dependencies**:
  - `vite-plugin-pwa` (for PWA support)
  - `idb` (for lightweight IndexedDB management)
  - `react-qr-barcode-scanner` (for camera-based scanning)

## 2. Implementation Approach

### 2.1 Mobile PWA & Gig Browsing
The primary mobile use case is gig browsing and quick booking. See [Mobile Development](04_mobile-development.md) for full detail.

#### PWA Configuration
- Integrate `vite-plugin-pwa` with `stale-while-revalidate` caching strategy.
- Configure `manifest.json` for standalone mobile experience.

#### Mobile Gig Experience
- **Gig List**: Card-based mobile gig list with search, filters, and status badges.
- **Gig Detail**: Simplified read view showing basic info + venue + act.
- **Quick-Create**: Streamlined form for capturing bookings on the go.

#### Field Operations
- **Staff View**: Simplified dashboard with large touch targets (minimum 44px).
- **Warehouse Mode**:
  - Camera-based barcode scanning using `react-qr-barcode-scanner`.
  - Optimized "Scan-and-Update" workflow for equipment check-in/out.
- **Offline Sync**:
  - Use `idb` to queue changes while offline.
  - Background synchronization when connectivity is restored, with visual sync status indicators.

### 2.2 Multi-Act Scheduling
Support multiple acts per gig with a schedule/timeline of activities.

#### Data Model Changes
- New `gig_schedule_entries` table with type, start/end time, optional act participant reference.
- Activity types: Load-In, Soundcheck, Rehearsal, Set, Intermission, Load-Out, Other.
- Optional staffing window references on staff slots.

#### Frontend Changes
- **GigScreen**: New timeline/schedule section within gig detail.
- **Schedule Builder**: Add/edit/remove schedule entries with time picker and act selector.
- **Conflict Detection**: Visual warnings for overlapping act time slots.

### 2.3 Enhanced Asset & Gig Import
Improve CSV import for real-world volume and flexible mapping.

#### CSV Mapping Engine
- **Mapping UI**: Implement in `ImportScreen.tsx` to allow users to map CSV headers to internal fields.
- **Asset Import Enhancements**:
  - **Flexible Mapping**: Support custom header names.
  - **Bulk Upsert**: Use `serial_number` as a key to update existing assets.
  - **Kit Auto-Creation**: Support `kit_name` column for automatic kit grouping.

#### Performance
- Use Supabase `rpc` for bulk operations to minimize network round-trips.
- Implement client-side chunking for handling 5k+ records.

### 2.4 Hierarchical Gig Structure
Support complex event hierarchies (e.g., Festivals > Stages > Sets) with recursive inheritance of participants and equipment. This is an advanced feature — see [Hierarchy Foundations](05_hierarchy-foundations.md) and [Hierarchy UI](06_hierarchy-ui.md) for full detail.

#### Data Model Changes
- `public.gigs` table already has `parent_gig_id` and `hierarchy_depth`.
- **Standardized Recursive Queries**: Use PostgreSQL recursive Common Table Expressions (CTEs) for traversing the hierarchy.
- Implement SQL functions:
  - `get_gig_hierarchy(root_id UUID)`: Returns the entire tree.
  - `get_effective_participants(gig_id UUID)`: Returns participants including those inherited from parents.
  - `get_effective_equipment(gig_id UUID)`: Returns equipment including inherited items.
- **Inheritance & Conflicts**:
  - Inheritance rule: Child inherits from parent unless overridden.
  - Conflict rule: Prevent double-booking equipment/staff across overlapping times within the same hierarchy branch.

#### Frontend Changes
- **GigListScreen**: Update to a nested/tree view with collapsible sections for sub-gigs.
- **GigScreen & Sections**:
  - `GigBasicInfoSection`: Add `parent_gig_id` selection (progressive disclosure).
  - `GigParticipantsSection` & `GigKitAssignmentsSection`: Add "Inherited" badge for items from parent gigs; allow local overrides.
- **New Component**: `src/components/gig/GigHierarchyTree.tsx` for visual hierarchy navigation.

## 3. Source Code Structure Changes
- `src/components/gig/GigScheduleTimeline.tsx`: Schedule/timeline visualization.
- `src/components/gig/GigHierarchyTree.tsx`: Hierarchy tree visualization.
- `src/components/import/HeaderMapper.tsx`: CSV mapping interface.
- `src/services/hierarchy.service.ts`: Hierarchy traversal logic.
- `src/utils/offlineSync.ts`: Service worker and `idb` sync management.
- `src/hooks/useScanner.ts`: Barcode scanning hook.

## 4. Delivery Phases

### Phase 1: Mobile PWA + Gig Browsing + CSV Import (Sprint 1)
- PWA baseline: manifest, service worker, touch-optimized layout.
- Mobile gig list, detail view, quick-create form.
- Enhanced Asset CSV import (flexible mapping, bulk updates).

### Phase 2: Multi-Act Scheduling + Warehouse Mobile (Sprint 2)
- `gig_schedule_entries` schema and service layer.
- Schedule/timeline UI within gig detail.
- Barcode scanning integration and warehouse check-in/out views.
- Staff dashboard mobile view.

### Phase 3: Financial Management (Sprint 3)
- Flat gig financials: settlement views, vendor bid management.
- Act-specific settlement screens.
- Push notifications for staff assignments and gig updates.

### Phase 4: Hierarchical Gig Structure (Sprint 4)
- SQL functions using recursive CTEs for inheritance.
- Hierarchy UI: tree visualization, progressive disclosure forms.
- Hierarchical conflict detection.
- Extend financial rollups to support hierarchy.

### Phase 5: Scale & Polish (Sprint 5)
- Offline sync finalization and conflict resolution UI.
- Real-world volume testing (5k+ assets, 20k+ records).
- Performance optimization.
- Biometric auth (WebAuthn), location services.

## 5. Verification Approach
- **Build & Quality**: `npm run build` (includes typecheck) and `npm run lint`.
- **Unit Tests**: Vitest for scheduling logic, recursive queries, and CSV mapping.
- **Integration Tests**: Supabase RLS verification for multi-tenant access.
- **Mobile Verification**: Test gig browsing, scanning, and offline sync on physical devices.
