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

### 2.1 Hierarchical Gig Structure
Support complex event hierarchies (e.g., Festivals > Stages > Sets) with recursive inheritance of participants and equipment.

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

### 2.2 Enhanced Asset & Gig Import
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

### 2.3 Mobile PWA & Offline Support
#### PWA Configuration
- Integrate `vite-plugin-pwa` with `stale-while-revalidate` caching strategy.
- Configure `manifest.json` for standalone mobile experience.

#### Field Operations
- **Staff View**: Simplified dashboard with large touch targets (minimum 44px).
- **Warehouse Mode**:
  - Camera-based barcode scanning using `react-qr-barcode-scanner`.
  - Optimized "Scan-and-Update" workflow for equipment check-in/out.
- **Offline Sync**:
  - Use `idb` to queue changes while offline.
  - Background synchronization when connectivity is restored, with visual sync status indicators.

## 3. Source Code Structure Changes
- `src/components/gig/GigHierarchyTree.tsx`: Tree visualization.
- `src/components/import/HeaderMapper.tsx`: CSV mapping interface.
- `src/services/hierarchy.service.ts`: Hierarchy traversal logic.
- `src/utils/offlineSync.ts`: Service worker and `idb` sync management.
- `src/hooks/useScanner.ts`: Barcode scanning hook.

## 4. Delivery Phases

### Phase 1: Hierarchy Foundations (Sprint 1)
- SQL functions using recursive CTEs for inheritance.
- Update `gig.service.ts` for hierarchy-aware fetches.
- **Dependency**: Database changes must be stable before Phase 2.

### Phase 2: Hierarchy UI & Mobile Baseline (Sprint 2)
- Tree visualization in `GigListScreen`.
- `parent_gig_id` in `GigBasicInfoSection`.
- PWA setup and `manifest.json`.

### Phase 3: Field Ops & Warehouse (Sprint 3)
- Barcode scanning integration.
- Warehouse check-in/out mobile views.
- Biometric auth (WebAuthn) baseline.

### Phase 4: Financials & Settlement (Sprint 4)
- Financial rollups in hierarchy.
- Act-specific settlement screens.
- Production vendor bid rollups.

### Phase 5: Advanced Features & Scale (Sprint 5)
- Push Notifications for staff/hierarchy updates.
- Real-world volume testing (5k+ assets).
- Performance optimization and offline sync finalization.

## 5. Verification Approach
- **Build & Quality**: `npm run build` (includes typecheck) and `npm run lint`.
- **Unit Tests**: Vitest for recursive logic and CSV mapping.
- **Integration Tests**: Supabase RLS verification for hierarchical access.
- **Mobile Verification**: Test scanning and offline sync on physical devices.
