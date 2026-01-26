# GigManager Development Plan

**Purpose**: This document provides a comprehensive development roadmap for GigManager, including refactoring phases, testing strategy, bug management, and quality gates.

**Last Updated**: 2026-01-17  
**Application Version**: 0.1.0

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Test Strategy](#test-strategy)
3. [Refactoring Phases](#refactoring-phases)
4. [Bug Management Strategy](#bug-management-strategy)
5. [Quality Gates](#quality-gates)
6. [Timeline & Milestones](#timeline--milestones)
7. [Success Metrics](#success-metrics)
8. [Risk Management](#risk-management)

---

## Current State Assessment

### Application Status

**Version**: 0.1.0  
**Environment**: Development  
**Deployment**: Not yet deployed (local development only)

**Feature Completeness**:
- ✅ **Implemented**: ~65% (core features functional)
- 🟡 **Partial**: ~20% (features exist but incomplete)
- ⏸️ **Planned**: ~10% (documented but not started)
- 🚫 **Deferred**: ~5% (documented but deprioritized)

See [Feature Catalog](../product/feature-catalog.md) for detailed feature status.

### Codebase Metrics

**File Counts**:
- Total TypeScript files: 104
- Screen components: 15
- Shared components: 10
- Shadcn/ui components: 46
- Total components: 73

**Component Sizes**:
- Average component: 143 lines
- Largest component: `GigScreen.tsx` (2,091 lines)
- Components >1000 lines: 4 (require refactoring)

**API Layer**:
- File: `src/utils/api.tsx`
- Size: 2,824 lines
- Functions: 57 exported functions
- Pattern: Repetitive CRUD operations

**Routing**:
- Implementation: Custom string-based routing
- File: `src/App.tsx` (570 lines)
- Routes: 15 custom routes
- Issue: No URL persistence, browser history, or bookmarking

**Database**:
- Multi-tenant: RLS policies with organization_id scoping
- Backend: Supabase PostgreSQL



### Known Technical Debt

**High Priority**
1. **Custom Routing** (Phase 4) - No URL persistence, affects user experience
2. **API Layer Repetition** (Phase 3) - 2,824 lines with repetitive CRUD, hard to maintain
3. **Large Components** (Phase 6) - 2,091-line components hard to maintain and test

**Medium Priority**
4. **Unnecessary Abstractions** (Phase 5) - NavigationContext can be removed after routing migration
5. **Test Coverage Gaps** - Limited integration and E2E testing

**Low Priority**
6. **Performance** - No identified performance issues yet, but large components may benefit from optimization

## Test Strategy

See [Testing](./testing.md) for test methodology.

## Refactoring Phases

This section provides comprehensive refactoring guidance with detailed task tracking. All actionable tasks use markdown checkboxes (`- [x]` completed, `- [ ]` pending).

### Phase Overview

| Phase | Status | Estimated Impact | Priority | Dependencies |
|-------|--------|------------------|----------|--------------|
| Phase 2A: Form Architecture Refactor | ⏸️ Pending | Complexity reduction | High | None |
| Phase 3: API Layer Refactoring | ⏸️ Pending | ~1,200 lines reduced | High | Phase 2A |
| Phase 4: React Router Migration | ⏸️ Pending | ~200 lines reduced | High | Phase 3 |
| Phase 5: Remove Abstractions | ⏸️ Pending | ~100 lines reduced | Medium | Phase 4 |
| Phase 6: Component Refactoring | ⏸️ Pending | ~1,500 lines moved | Medium | Phase 5 |

**Completed Phases**:
- ✅ Phase 1: Dead Code Removal (~200 lines removed)
- ✅ Phase 2: Form Change Detection Simplification (~32 lines reduced)

**Total Estimated Reduction**: ~3,232 lines (25-30% of codebase)

---

## Completed Phases

### Phase 1: Test Infrastructure & Dead Code Removal

**Status**: ✅ **Complete** (2026-01-17)

**Overview**: Dead code successfully removed (~200+ lines). Basic test infrastructure added (needs refinement). Tests identify current behavior but need mock improvements.


### Phase 2: Simplify Form Change Detection

**Status**: ✅ **Complete** (2026-01-20) - **Interim Solution Implemented**

**Key Achievements**:
- Created simplified `useSimpleFormChanges.ts` hook (~200 lines, replacing 232-line `useFormWithChanges.ts`)
- Migrated 6 form components to use new hook: GigScreen, AssetScreen, KitScreen, OrganizationScreen, UserProfileCompletionScreen, EditUserProfileDialog
- Removed complex deep equality checking and ref patterns
- Leverages react-hook-form's built-in `isDirty` for form field changes
- Simple reference comparison for nested data (arrays, objects)
- All functionality preserved with simpler, more maintainable code
- **Bug Fix (2026-01-19)**: Fixed `hasAnyChanges` calculation to properly use `form.formState.isDirty` instead of shallow comparison, resolving false positives with Date and array fields
- Added comprehensive tests (9 new tests) covering Date fields, array fields, and nested data changes
- **Final Fix (2026-01-20)**: Implemented Option 1 - disabled change detection for Submit button in edit mode, removed `useSimpleFormChanges` from GigScreen

**Technical Improvements**:
- Eliminated `setTimeout` hacks for change detection
- Removed complex `currentData` merging logic
- Cleaner API with `hasChanges` boolean and `changedFields` object
- Better TypeScript support with generic types
- Removed fragile change detection logic from GigScreen entirely

**Lessons Learned**:
- react-hook-form's built-in features are sufficient for most use cases
- Simple reference comparison is adequate for nested data in this application
- Removing complexity makes code easier to understand and debug
- **Hybrid state management** (react-hook-form + useState for nested data) introduces complexity and fragility
- Change detection for nested arrays requires proper architecture (see Phase 2A)
- **Monolithic forms** (2,000+ lines) with complex nested data need modern auto-save patterns, not Submit buttons
- **Inconsistent save patterns** across nested data types create maintenance burden

**What We Actually Did (Option 1)**:
- ✅ Disabled Submit button change detection: `disabled={isSubmitting}` (always enabled in edit mode)
- ✅ Removed `useSimpleFormChanges` hook import and usage from GigScreen
- ✅ Replaced with simple `useState` for `originalData` (used only for efficient partial updates)
- ✅ Kept efficient partial update logic (only changed form fields sent to API)
- ✅ All tests pass (66 tests)

**Current Limitations**:
- Submit button always enabled in edit mode (acceptable interim solution)
- Nested data still uses hybrid state management (useState + react-hook-form)
- 4 different save patterns for nested data (participants, staff, bids, kits) - inconsistent
- Monolithic 2,078-line component - unmaintainable
- Can't save partial progress in edit mode

**Next Steps**: 
- **Phase 2A** (High Priority): Modern form architecture with auto-save sections
  - Break monolithic form into components
  - Implement auto-save per section
  - Use useFieldArray for all nested data
  - Standardize on server-side reconciliation
  - Add back button and dropdown menu for navigation/actions
- **Phase 3**: API layer refactoring (after Phase 2A-4 completes)

---

## Active Phases

### Phase 2A: Modern Form Architecture with Auto-save

**Status**: 🟢 **Active** (High Priority)

**Objective**: Refactor monolithic form into auto-saving sections with proper state management

**Key Achievements (2026-01-25)**:
- ✅ Completed Phase 2A-3: Refactored all nested sections (Participants, Staff Slots, Bids, Equipment) to use `useFieldArray` and `useAutoSave`.
- ✅ Completed Phase 2A-4: Standardized server-side reconciliation for all nested data types.
- ✅ Implemented `updateGigParticipants` and `updateGigKitAssignments` API functions.
- ✅ Reduced complexity in `GigScreen.tsx` by moving logic to independent components.
- ✅ Verified all refactored sections with automated tests.

**Current Focus**:
- Unifying Create and Edit flows in `GigScreen.tsx` to eliminate redundancy.
- Simplifying the Create flow to focus on Basic Information first.

---

## Current Problems

**Architecture Issues**:
1. **Monolithic Component**: GigScreen is 2,078 lines (unmaintainable)
2. **Hybrid State Management**: Form fields in react-hook-form, nested data in useState
3. **Poor UX**: Can't save partial progress, must scroll to find Submit, lose work on validation errors
4. **Inconsistent Save Patterns**: 4 different approaches for nested data (participants, staff, bids, kits)
5. **No Change Detection**: Submit always enabled in edit mode (interim fix)
6. **Hard to Componentize**: All state managed at top level

**Nested Data Inconsistencies** (discovered during Phase 2):
- **Participants**: Server-side reconciliation via `updateGig()` (sends all, server diffs)
- **Staff slots**: Server-side reconciliation via `updateGigStaffSlots()` (sends all, server diffs)
- **Bids**: Client-side differential (individual create/update/delete calls)
- **Kit assignments**: Client-side differential (individual create/update/delete calls)

**Problems with inconsistency**:
- No clear decision criteria for which approach to use
- Mix of patterns suggests organic growth, not intentional design
- Makes codebase hard to understand and maintain

---

## Target Architecture

**Modern Auto-save Pattern** (Linear, Notion, Airtable, Asana):

```tsx
// Create mode: Keep single form with Submit (works fine)
<GigForm onSubmit={handleCreate} />

// Edit mode: Separate auto-saving sections
<div>
  {/* Header with navigation */}
  <GigHeader 
    gigId={gigId} 
    onBack={onCancel}
    onDelete={handleDelete}
    onDuplicate={handleDuplicate}
  />

  {/* Auto-save sections */}
  <GigBasicInfoSection gigId={gigId} />        // ~200 lines, auto-save on blur
  <GigParticipantsSection gigId={gigId} />     // ~300 lines, auto-save on add/remove
  <GigStaffSlotsSection gigId={gigId} />       // ~400 lines, auto-save on change
  <GigKitAssignmentsSection gigId={gigId} />   // ~250 lines, auto-save on assign
  <GigBidsSection gigId={gigId} />             // ~250 lines, auto-save on change
</div>
```

**Per-section architecture**:
```typescript
// Each section is independent component with own form
function GigParticipantsSection({ gigId }: { gigId: string }) {
  const form = useForm({
    defaultValues: { participants: [] }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  // Auto-save on change
  const handleSave = async () => {
    const data = form.getValues();
    await updateGigParticipants(gigId, data.participants); // Server reconciles
    setIsSaved(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>Participants</CardTitle>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaved && <Check className="h-4 w-4 text-green-500" />}
        </div>
      </CardHeader>
      <CardContent>
        {fields.map((field, index) => (
          <ParticipantRow 
            key={field.id}
            participant={field}
            onRemove={() => { remove(index); handleSave(); }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
```

**Navigation/Actions** (replaces Submit/Cancel):
```tsx
function GigHeader({ gigId, onBack, onDelete, onDuplicate }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* Left: Back button */}
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Gigs
      </Button>

      {/* Right: Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDuplicate}>
            Duplicate Gig
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Gig
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

---

## Benefits

**Maintainability**:
- ✅ 2,078-line component → 5 components (~200-400 lines each)
- ✅ Each section self-contained and independently testable
- ✅ Easier to understand and modify

**User Experience**:
- ✅ Can't lose work (auto-saves immediately)
- ✅ No scrolling to find Submit button
- ✅ Clear visual feedback per section (spinner → checkmark)
- ✅ Modern UX pattern users expect from SaaS apps

**Architecture**:
- ✅ Single source of truth per section (react-hook-form + useFieldArray)
- ✅ No global change detection needed
- ✅ Server-side reconciliation for all nested data (consistent pattern)
- ✅ Natural fit with useFieldArray (send current state on change)

**Code Quality**:
- ✅ Consistent save pattern across all nested data types
- ✅ Better separation of concerns
- ✅ Easier to add new sections

---

## Server-side Reconciliation

**Decision**: Standardize on server-side reconciliation for ALL nested data

**Why** (especially important with auto-save):
- ✅ Simpler per-section code (just send current state)
- ✅ Atomic updates (transaction-based, all-or-nothing)
- ✅ Easier to reason about ("here's current state, server diffs it")
- ✅ Works naturally with useFieldArray + auto-save
- ✅ Consistent pattern across all sections

**API Changes Needed**:
```typescript
// All nested data APIs follow same pattern
updateGigParticipants(gigId, participants[])  // Server reconciles
updateGigStaffSlots(gigId, staffSlots[])      // Server reconciles
updateGigBids(gigId, organizationId, bids[])  // Server reconciles (org-scoped)
updateGigKits(gigId, organizationId, kits[])  // Server reconciles (org-scoped)
```

**Server reconciliation logic** (applies to all):
1. Receive full array of current state
2. Compare with existing database records
3. Add new items (no ID or temp ID)
4. Update existing items (has database UUID)
5. Delete removed items (in DB but not in array)
6. All in single transaction

---

## Implementation Phases

Phase 2A is broken into 4 sub-phases (each ~2-3 days, manageable for AI agents):

### Phase 2A-1: Component Separation & Navigation

**Goal**: Break monolithic GigScreen into separate components, add modern navigation

**Status**: ⏸️ Pending

**Tasks**:
- [ ] Create component structure
  - [ ] `GigHeader.tsx` - Back button, actions dropdown (delete, duplicate)
  - [ ] `GigBasicInfoSection.tsx` - Title, dates, status, tags, notes, amount
  - [ ] `GigParticipantsSection.tsx` - Organization participants
  - [ ] `GigStaffSlotsSection.tsx` - Staff roles and assignments
  - [ ] `GigKitAssignmentsSection.tsx` - Kit assignments
  - [ ] `GigBidsSection.tsx` - Organization bids
- [ ] Refactor GigScreen layout
  - [ ] Keep single form for create mode (no changes needed)
  - [ ] Use section components for edit mode
  - [ ] Add GigHeader with back button and dropdown menu
  - [ ] Remove Submit/Cancel buttons in edit mode
- [ ] Implement GigHeader
  - [ ] Back button → calls `onCancel` prop
  - [ ] Dropdown menu with Delete and Duplicate options
  - [ ] Delete → confirmation dialog → calls delete API → navigates back
  - [ ] Duplicate → calls duplicate API → navigates to new gig
- [ ] Initial section stubs
  - [ ] Each section receives gigId prop
  - [ ] Each section loads own data from API
  - [ ] Render current UI (no auto-save yet, just componentization)
- [ ] Update routing/navigation
  - [ ] Ensure back button navigates correctly
  - [ ] Test delete → navigation
  - [ ] Test duplicate → navigation

**Verification**:
- [ ] Create mode still works (single form with Submit)
- [ ] Edit mode uses section layout
- [ ] Back button navigates to gig list
- [ ] Delete works and navigates back
- [ ] Duplicate works and navigates to new gig
- [ ] All existing functionality preserved
- [ ] No console errors
- [ ] All tests pass

**Timeline**: 2-3 days

---

### Phase 2A-2: Auto-save Infrastructure & Basic Info Section

**Goal**: Implement auto-save pattern for GigBasicInfoSection, establish pattern for others

**Status**: ⏸️ Pending (depends on 2A-1)

**Tasks**:
- [ ] Create auto-save hook
  - [ ] `useAutoSave.ts` - debounced auto-save with loading/success states
  - [ ] Handles debouncing (wait 500ms after typing stops)
  - [ ] Tracks save state (idle, saving, saved, error)
  - [ ] Shows visual feedback (spinner → checkmark)
- [ ] Implement GigBasicInfoSection auto-save
  - [ ] Use react-hook-form for all fields
  - [ ] Load initial data from API on mount
  - [ ] Auto-save on blur for text fields
  - [ ] Auto-save on change for selects/dates
  - [ ] Show save status in section header
  - [ ] Handle optimistic updates
- [ ] Update API function
  - [ ] Ensure `updateGig()` accepts partial updates
  - [ ] Only sends changed fields (already implemented via `createSubmissionPayload`)
- [ ] Error handling
  - [ ] Show error toast on save failure
  - [ ] Retry logic for transient failures
  - [ ] Don't lose user input on error
- [ ] Tests
  - [ ] Test auto-save triggers correctly
  - [ ] Test debouncing works
  - [ ] Test error handling
  - [ ] Test optimistic updates

**Verification**:
- [ ] Basic info auto-saves on blur/change
- [ ] Save status shows correctly (spinner → checkmark)
- [ ] Debouncing works (doesn't spam API)
- [ ] Errors handled gracefully
- [ ] Tests pass
- [ ] No regressions

**Timeline**: 2 days

---

### Phase 2A-3: Auto-save Nested Sections with useFieldArray

**Goal**: Implement auto-save for all nested sections using useFieldArray

**Status**: ✅ **Complete** (2026-01-25)

**Tasks**:
- [x] Implement GigParticipantsSection
  - [x] Use useFieldArray for participants
  - [x] Auto-save on add/remove/edit
  - [x] Update to call new `updateGigParticipants()` API
  - [x] Add zod schema for validation
  - [x] Show save status
- [x] Implement GigStaffSlotsSection
  - [x] Use useFieldArray for staff slots
  - [x] Nested useFieldArray for assignments
  - [x] Auto-save on add/remove/edit
  - [x] Update to call new `updateGigStaffSlots()` API
  - [x] Show save status
- [x] Implement GigBidsSection
  - [x] Use useFieldArray for bids
  - [x] Auto-save on add/remove/edit
  - [x] Update to call new `updateGigBids()` API (org-scoped)
  - [x] Show save status
- [x] Implement GigKitAssignmentsSection
  - [x] Use useFieldArray for kit assignments
  - [x] Auto-save on assign/unassign
  - [x] Update to call new `updateGigKits()` API (org-scoped)
  - [x] Show save status
- [x] Tests for each section
  - [x] Test add/remove operations
  - [x] Test auto-save triggers
  - [x] Test validation
  - [x] Test error handling

**Verification**:
- ✅ All sections auto-save correctly
- ✅ useFieldArray works for all nested data
- ✅ Save status shows per section
- ✅ Validation works
- ✅ No data loss on errors
- ✅ All tests pass

---

### Phase 2A-4: Server-side Reconciliation for Nested Data

**Goal**: Update API layer to use server-side reconciliation consistently

**Status**: ✅ **Complete** (2026-01-25)

**Tasks**:
- [x] Update/create API functions
  - [x] `updateGigParticipants(gigId, participants[])` - reconcile participants
  - [x] `updateGigStaffSlots(gigId, staffSlots[])` - reconcile slots + assignments
  - [x] `updateGigBids(gigId, orgId, bids[])` - reconcile bids (org-scoped)
  - [x] `updateGigKits(gigId, orgId, kits[])` - reconcile kit assignments (org-scoped)
- [x] Implement reconciliation logic for each
  - [x] Identify new items (no ID or temp ID like 'temp-123')
  - [x] Identify existing items (database UUID, 36 chars with dashes)
  - [x] Identify deleted items (in DB but not in submitted array)
  - [x] Transaction-based updates (all-or-nothing)
- [x] Update Edge Functions if needed (kept client-side in `api.tsx` for now)
- [x] Remove old client-side differential logic
  - [x] Remove individual create/update/delete loops from GigScreen (partially done, will complete in unification)
- [x] Tests
  - [x] Test adding new items
  - [x] Test updating existing items
  - [x] Test deleting removed items
  - [x] Test transaction rollback on error
  - [x] Test org-scoped filtering (bids, kits)

**Verification**:
- ✅ All nested data saves correctly
- ✅ Reconciliation handles add/update/delete
- ✅ Transactions work (atomic updates)
- ✅ Org-scoped data filtered correctly
- ✅ No duplicate data created
- ✅ All tests pass

---

## Affected Forms

**Primary focus**: `GigScreen.tsx` (2,078 lines → ~1,200 lines + 5 new components)

**Also consider** (after GigScreen proves pattern):
- `KitScreen.tsx` (739 lines) - kitAssets section with auto-save
- Other forms can keep current architecture (simpler, no nested data)

---

## Success Criteria

**Architecture**:
- [x] GigScreen broken into manageable components (<500 lines each)
- [ ] All nested data uses useFieldArray
- [ ] All nested data uses server-side reconciliation (consistent pattern)
- [ ] No hybrid state management (useState + useForm)

**UX**:
- [ ] Edit mode uses auto-save (no Submit/Cancel buttons)
- [ ] Create mode keeps Submit button (existing pattern works)
- [ ] Back button for navigation
- [ ] Dropdown menu for actions (delete, duplicate)
- [ ] Visual save feedback per section

**Quality**:
- [ ] All tests pass
- [ ] No regressions in functionality
- [ ] Performance acceptable (auto-save doesn't feel sluggish)
- [ ] Error handling works (no data loss)

---

## Total Estimated Timeline

**Phase 2A-1**: 2-3 days (component separation)
**Phase 2A-2**: 2 days (auto-save infrastructure)
**Phase 2A-3**: 3-4 days (nested sections with useFieldArray)
**Phase 2A-4**: 2-3 days (server-side reconciliation)

**Total**: 9-12 days (2-3 weeks)

**Priority**: High - Blocks maintainability and modern UX

---

### Phase 3: Refactor API Layer

**Status**: ⏸️ **Pending** (Depends on Phase 2A-4 completion)

**Objective**: Reduce repetitive CRUD operations from 57 functions to generic operations

**Note**: Should wait for Phase 2A-4 (Server-side Reconciliation) to complete first, as that work will add/modify several API functions. Doing Phase 3 before 2A-4 would create conflicts and wasted refactoring effort.

**Current State**:
- File: `src/utils/api.tsx`
- Size: 2,824 lines
- Functions: 57 exported functions
- Pattern: Nearly identical CRUD for each entity type

**Target State**:
- Generic CRUD operations: `createRecord`, `getRecord`, `updateRecord`, `deleteRecord`
- Specialized functions only where business logic differs
- Common error handling and authentication
- Target size: ~1,600 lines (40-50% reduction)

**API Function Categories**:
- User management: 3 functions (`getUserProfile`, `createUserProfile`, `updateUserProfile`)
- Organization management: 6 functions (create, get, update, delete, list, invitations)
- Gig management: 15+ functions (CRUD + bids, staff slots, kit assignments, duplication)
- Asset management: 8 functions (CRUD + kit assignments, insurance tracking)
- Kit management: 8 functions (CRUD + asset assignments, duplication)
- Import/Export: 4 functions (CSV import for assets, kits)
- Supporting entities: 13+ functions (venues, clients, contacts, etc.)

**Common Patterns** (repeated across all entities):
```typescript
// Pattern 1: Organization-scoped queries
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('organization_id', organizationId);

// Pattern 2: Network error handling
catch (err: any) {
  if (err?.message?.includes('Failed to fetch')) {
    throw new Error('Network error: ...');
  }
}

// Pattern 3: Timestamp updates
.update({
  ...updates,
  updated_at: new Date().toISOString(),
})
```

**Estimated Impact**: ~1,200+ lines (40-50% of API layer)

#### 3.1 Create Generic CRUD Functions

**Goal**: Reduce repetitive API functions to generic CRUD operations

**Implementation Tasks**:
- [ ] Create `src/utils/api/crud.ts` with generic functions:
  - [ ] `createRecord(table, data, organizationId)`
  - [ ] `getRecord(table, id, organizationId)`
  - [ ] `getRecords(table, filters, organizationId)`
  - [ ] `updateRecord(table, id, data, organizationId)`
  - [ ] `deleteRecord(table, id, organizationId)`
- [ ] Add common error handling wrapper
- [ ] Add authentication check helper
- [ ] Create test file: `src/utils/api/crud.test.ts`
  - Test generic create/read/update/delete
  - Test organization_id filtering
  - Test authentication checks
  - Test error handling
- [ ] Identify which API functions can use generics vs need custom logic
- [ ] Refactor Assets API functions to use generic CRUD
- [ ] Refactor Kits API functions to use generic CRUD
- [ ] Refactor Gigs API functions to use generic CRUD (more complex, may need custom logic)
- [ ] Refactor Organizations API functions to use generic CRUD
- [ ] Refactor Users API functions to use generic CRUD
- [ ] Keep specialized functions where needed (e.g., `getGig` with participants)
- [ ] Update all imports throughout codebase
- [ ] Run all tests to verify no regressions
- [ ] Remove old API functions after refactoring complete

**Verification**:
- [ ] All API calls work correctly
- [ ] Organization filtering works
- [ ] Authentication checks work
- [ ] All existing tests pass
- [ ] No regressions in functionality

**Success Criteria**:
- All API calls work correctly
- Organization filtering preserved
- No functionality regressions
- All tests pass

**Timeline**: 2-3 weeks

---

### Phase 4: Replace Custom Routing with React Router

**Status**: ⏸️ **Pending**

**Objective**: Replace custom string-based routing with React Router

**Current State**:
- File: `src/App.tsx` (570 lines excluding imports)
- Routes: 15 custom string-based routes
- State management: 7+ useState hooks for route and entity state
- Issues: No URL persistence, browser history, or bookmarking

**Current Route Types**:
```typescript
type Route = 
  | 'login' 
  | 'profile-completion'
  | 'org-selection' 
  | 'create-org'
  | 'edit-org'
  | 'admin-orgs'
  | 'dashboard' 
  | 'gig-list'
  | 'create-gig'
  | 'gig-detail'
  | 'team'
  | 'asset-list'
  | 'create-asset'
  | 'kit-list'
  | 'create-kit'
  | 'kit-detail'
  | 'import';
```

**Current State Management Issues**:
- No URL persistence (refresh loses state)
- No browser back/forward support
- No bookmarking capability
- Entity IDs passed via state instead of URL params
- Complex navigation callback props (onCancel, onNavigateToX, etc.)

**Target State**:
- React Router with URL-based navigation
- Protected routes with guards
- URL parameters for entity IDs
- Reduced state management (~4 useState hooks removed)
- Target size: ~370 lines

**React Router Benefits**:
- URL-based navigation with browser history
- URL parameters for entity IDs
- Protected routes with guards
- Reduced state management (~4 useState hooks can be removed)
- Simplified component props (remove navigation callbacks)
- Better developer experience (standard patterns)

#### 4.1 Install and Configure React Router

**Goal**: Replace custom string-based routing with proper URL routing

**Implementation Tasks**:
- [ ] Install `react-router-dom`: `npm install react-router-dom`
- [ ] Install types: `npm install -D @types/react-router-dom`
- [ ] Create route configuration: `src/routes/index.tsx`
  - Define all routes with paths
  - Set up route protection (require auth, require org selection)
- [ ] Create route component: `src/routes/ProtectedRoute.tsx` - Require authentication
- [ ] Create route component: `src/routes/OrgRequiredRoute.tsx` - Require organization selection
- [ ] Refactor `App.tsx` to use Router:
  - [ ] Wrap app in `<BrowserRouter>`
  - [ ] Replace route state with `<Routes>` and `<Route>`
  - [ ] Use `useNavigate` instead of `setCurrentRoute`
  - [ ] Use URL params for IDs (gigId, assetId, kitId)
- [ ] Update navigation calls throughout app:
  - [ ] Replace `onNavigateToGigs()` with `navigate('/gigs')`
  - [ ] Replace `onViewGig(id)` with `navigate(\`/gigs/${id}/edit\`)`
  - [ ] Update all screen components to use router hooks
- [ ] Test URL navigation:
  - [ ] Test direct URL access (bookmarking)
  - [ ] Test browser back/forward buttons
  - [ ] Test route parameters
- [ ] Remove custom route state management from App.tsx
- [ ] Remove `NavigationContext` (no longer needed, handled in Phase 5)

**Tests to Add**:
- [ ] Create `src/routes/ProtectedRoute.test.tsx`
  - Test redirects to login when not authenticated
  - Test allows access when authenticated
- [ ] Create `src/routes/OrgRequiredRoute.test.tsx`
  - Test redirects to org selection when no org
  - Test allows access when org selected
- [ ] Update `src/App.test.tsx` (existing)
  - Test route rendering
  - Test navigation between routes
  - Test URL parameters
  - Test protected routes

**Verification**:
- [ ] All routes accessible via URL
- [ ] Browser back/forward works
- [ ] Bookmarking works
- [ ] Route protection works
- [ ] All existing functionality preserved
- [ ] All tests pass

**Success Criteria**:
- All routes accessible via URL
- Browser back/forward works
- Bookmarking works
- Route protection works
- All functionality preserved

**Timeline**: 2-3 weeks

---

### Phase 5: Remove Unnecessary Abstractions

**Status**: ⏸️ **Pending** (Depends on Phase 4 completion)

**Objective**: Remove NavigationContext and consolidate utilities

**Overview**: Remove unnecessary abstractions that are no longer needed after simplifications.

**Current State**:
- NavigationContext: Unnecessary after Phase 4
- Form utilities: Some duplication with react-hook-form

**Target State**:
- NavigationContext removed
- Form utilities consolidated
- Target reduction: ~100 lines

#### 5.1 Remove NavigationContext

**Goal**: Remove unnecessary context wrapper

**Implementation Tasks**:
- [ ] Verify React Router replaces all NavigationContext usage
- [ ] Remove `src/contexts/NavigationContext.tsx`
- [ ] Remove `<NavigationProvider>` wrapper from App.tsx
- [ ] Update any components using `useNavigation()` hook to use router hooks instead
- [ ] Run tests to verify no regressions

**Tests**: No new tests needed (covered by routing tests)

#### 5.2 Consolidate Form Utilities

**Goal**: Remove duplicate utilities between `form-utils.ts` and `useFormWithChanges`

**Implementation Tasks**:
- [ ] Audit `form-utils.ts` for functions still needed
- [ ] Keep only utilities not covered by react-hook-form:
  - [ ] Keep `normalizeFormData` - Still needed for API submission
  - [ ] Remove `deepEqual` if not used elsewhere
  - [ ] Remove `getChangedFields` if using react-hook-form's dirty fields
  - [ ] Remove `hasFormChanges` if using react-hook-form's `isDirty`
  - [ ] Remove `createSubmissionPayload` if simplified
- [ ] Update tests for `form-utils.test.ts` to match remaining functions
- [ ] Update all imports throughout codebase

**Status**: Depends on Phase 2 completion.

**Success Criteria**:
- No regressions
- All tests pass
- Cleaner code structure

**Timeline**: 1 week

---

### Phase 6: Component Refactoring

**Status**: ⏸️ **Pending** (Optional phase)

**Objective**: Break down large components (>1000 lines) into smaller, focused components

**Overview**: Break down 2000+ line components into smaller, focused components.

**Current State**:
- GigScreen.tsx: 2,091 lines
- GigListScreen.tsx: 1,021 lines
- TeamScreen.tsx: 1,034 lines
- OrganizationScreen.tsx: 1,028 lines

**Target State**:
- Largest component: <500 lines
- Average component: <100 lines
- Extracted components: ~15-20 new focused components

**Components Requiring Refactoring** (>1000 lines):

1. **GigScreen.tsx** - 2,091 lines
   - Current structure: Single monolithic component
   - Candidate sections for extraction:
     - Staff slots management (~300 lines)
     - Participants/clients management (~200 lines)
     - Kit assignments (~250 lines)
     - Bid management (~200 lines)
     - Venue/location form (~150 lines)
   - Estimated reduction: 1,000+ lines to main component

2. **GigListScreen.tsx** - 1,021 lines
   - Current structure: List with filters and search
   - Candidate sections:
     - Filter panel component
     - Gig card/row component
     - Search/sort component

3. **TeamScreen.tsx** - 1,034 lines
   - Current structure: Team member list with invitations
   - Candidate sections:
     - Member list component
     - Invitation form component
     - Role management component

4. **OrganizationScreen.tsx** - 1,028 lines
   - Current structure: Organization form with multiple sections
   - Candidate sections:
     - Organization details form
     - Address form component
     - Settings panel

**Benefits**:
- Improved code maintainability
- Easier testing (test smaller components)
- Better code reusability
- Reduced cognitive load when editing
- Improved performance (potential memo optimizations)

**Estimated Impact**: ~1,500 lines moved to smaller, focused components

#### 6.1 Split Large Components

**Goal**: Break down large components into smaller, focused components

**Implementation Tasks**:
- [ ] Split `GigScreen.tsx` (2,091 lines):
  - [ ] Extract `GigStaffSlotsManager.tsx` component
  - [ ] Extract `GigParticipantsManager.tsx` component
  - [ ] Extract `GigKitAssignments.tsx` component
  - [ ] Extract `GigBidManager.tsx` component
  - [ ] Extract `GigVenueForm.tsx` component
- [ ] Split `GigListScreen.tsx` (1,021 lines):
  - [ ] Extract `GigFilterPanel.tsx` component
  - [ ] Extract `GigListItem.tsx` component
  - [ ] Extract `GigSearchBar.tsx` component
- [ ] Split `TeamScreen.tsx` (1,034 lines):
  - [ ] Extract `TeamMemberList.tsx` component
  - [ ] Extract `TeamInvitationForm.tsx` component
  - [ ] Extract `TeamMemberRoleManager.tsx` component
- [ ] Split `OrganizationScreen.tsx` (1,028 lines):
  - [ ] Extract `OrganizationDetailsForm.tsx` component
  - [ ] Extract `OrganizationAddressForm.tsx` component
  - [ ] Extract `OrganizationSettingsPanel.tsx` component
- [ ] Update imports in all parent components
- [ ] Update tests for extracted components
- [ ] Verify functionality after extraction

**Tests**: Add component tests for extracted pieces

**Success Criteria**:
- All functionality preserved
- Improved maintainability
- Better testability
- No performance regressions

**Timeline**: 3-4 weeks

---

### Phase Dependencies & Sequencing

```
Phase 1 (Complete) ──┐
                      ├──> Phase 3 ──> Phase 4 ──> Phase 5 ──> Phase 6
Phase 2 (Complete) ──┘
```

**Critical Path**:
1. Phase 3 must complete before Phase 4 (API stability before routing changes)
2. Phase 4 must complete before Phase 5 (NavigationContext depends on routing)
3. Phase 5 must complete before Phase 6 (clean foundation for component refactoring)

**Parallel Work**:
- Documentation can be updated during any phase
- Bug fixes can be addressed during any phase
- Test improvements can be made during any phase

---

### Testing Checklist

**Before starting any phase**:
- [ ] All existing tests pass: `npm run test:run`
- [ ] Test coverage is acceptable: `npm run test:coverage`
- [ ] No TypeScript errors: `npm run build` (or `tsc --noEmit`)

**After each phase**:
- [ ] All tests pass
- [ ] Manual testing of affected features
- [ ] Code review
- [ ] Update checkboxes in this document to mark completion

---

### Success Criteria

**Overall Goals**:
- [ ] All tests pass (currently 60 tests passing)
- [ ] Code reduction achieved (see breakdown below)
- [ ] No functionality regressions
- [ ] Improved maintainability (fewer files, clearer patterns)
- [ ] Better developer experience (standard routing, simpler state)
- [ ] Performance maintained or improved

**Code Reduction Targets**:
- [x] Phase 1: ~200 lines removed (dead code) ✅
- [x] Phase 2: ~32 lines reduced (form change detection hook) ✅
- [ ] Phase 3: ~1,200 lines (API layer refactoring - 40-50% reduction)
- [ ] Phase 4: ~200 lines (routing simplification in App.tsx)
- [ ] Phase 5: ~100 lines (remove NavigationContext, consolidate utilities)
- [ ] Phase 6: ~1,500 lines (component refactoring - extract to smaller components)
- **Total Estimated Reduction**: ~3,232 lines (25-30% of codebase)

**Quality Metrics**:
- [ ] Average component size reduced from 143 lines to <100 lines
- [ ] Largest component reduced from 2,091 lines to <500 lines
- [ ] API layer reduced from 2,824 lines to <1,600 lines
- [ ] App.tsx reduced from 570 lines to <370 lines
- [ ] Zero TypeScript errors
- [ ] Test coverage maintained or improved

---

## Bug Management Strategy

### Bug Discovery Process

**User Testing Plan**:
1. **Internal Testing** (before each phase)
   - Developer testing of affected features
   - Manual smoke tests of critical paths
   - Cross-browser testing (Chrome, Firefox, Safari)

2. **Dogfooding** (after each phase)
   - Use GigManager for internal event management
   - Track real-world usage issues
   - Document pain points and edge cases

3. **User Testing** (before Phase 6)
   - Invite production companies for beta testing
   - Gather feedback on workflows
   - Identify missing features

### Triage and Prioritization

**Severity Levels**:
- **P0 (Critical)**: Data loss, security issues, app crashes - Fix immediately
- **P1 (High)**: Core features broken, significant user impact - Fix within 1-2 days
- **P2 (Medium)**: Minor features broken, workarounds available - Fix within 1 week
- **P3 (Low)**: Cosmetic issues, edge cases - Fix when convenient

**Bug Triage Process**:
1. Log bug with steps to reproduce
2. Assign severity level
3. Determine root cause
4. Assign to current or future phase
5. Track in development-plan.md Section 3 (Refactoring Phases) or separate issue tracker

### Resolution Workflow

**Bug Fix Process**:
1. **Reproduce**: Verify bug exists and document steps
2. **Test**: Add test case that fails with the bug
3. **Fix**: Implement fix
4. **Verify**: Ensure test passes
5. **Regression**: Run full test suite
6. **Deploy**: Merge fix (or include in next phase)

**Documentation**:
- Document known bugs in feature-catalog.md
- Track fixes in phase summaries
- Update tests to prevent regression

### Regression Prevention

**Strategies**:
1. **Test Coverage**: Add tests for every bug fix
2. **Code Review**: Review all changes before merge
3. **Manual Testing**: Test affected features before release
4. **Smoke Tests**: Quick validation of critical paths after each change

**Smoke Test Checklist** (run after each phase):
- [ ] Login with Google OAuth
- [ ] Create organization
- [ ] Switch organizations
- [ ] Create gig (basic fields)
- [ ] Create asset
- [ ] Create kit
- [ ] Assign asset to kit
- [ ] Assign kit to gig
- [ ] Edit user profile
- [ ] Logout

---

## Quality Gates

### "Done" Criteria per Phase

**Phase 3: API Layer Refactoring**
- [ ] All 57 API functions refactored or migrated
- [ ] Generic CRUD functions implemented and tested
- [ ] Organization scoping verified
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Manual smoke tests pass

**Phase 4: React Router Migration**
- [ ] All 15 routes migrated to React Router
- [ ] URL navigation works (direct access, bookmarking)
- [ ] Browser history works (back/forward buttons)
- [ ] Route protection works (auth, org selection)
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Manual smoke tests pass

**Phase 5: Remove Abstractions**
- [ ] NavigationContext removed
- [ ] Form utilities consolidated
- [ ] All imports updated
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Manual smoke tests pass

**Phase 6: Component Refactoring**
- [ ] All 4 large components split into smaller components
- [ ] All functionality preserved
- [ ] All existing tests pass
- [ ] New component tests added
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Manual smoke tests pass
- [ ] Performance verified (no degradation)

### Test Coverage Thresholds

**Current Coverage**: 60 passing tests

**Target Coverage by Phase**:
- Phase 3: 75+ tests (add API integration tests)
- Phase 4: 90+ tests (add routing tests)
- Phase 5: 90+ tests (no reduction expected)
- Phase 6: 110+ tests (add component tests)

**Coverage Goals**:
- Utilities: >90% line coverage
- API layer: >80% function coverage
- Components: >60% integration test coverage
- Critical paths: 100% covered by smoke tests

### Code Quality Metrics

**Component Size Targets**:
- [ ] Average component: <100 lines (currently 143 lines)
- [ ] Largest component: <500 lines (currently 2,091 lines)
- [ ] Components >1000 lines: 0 (currently 4)

**API Layer Targets**:
- [ ] Total size: <1,600 lines (currently 2,824 lines)
- [ ] Repetitive functions: <20 (currently 57)
- [ ] Generic CRUD coverage: >70% of operations

**App.tsx Targets**:
- [ ] Size: <370 lines (currently 570 lines)
- [ ] Route management: React Router (currently custom strings)
- [ ] State hooks: <5 (currently 7+)

**TypeScript Quality**:
- Zero TypeScript errors (strict mode enabled)
- No `any` types (except necessary edge cases)
- Explicit return types for functions
- Proper type exports and imports

### Performance Benchmarks

**Current Performance** (baseline):
- No known performance issues
- Large components may cause re-render inefficiencies

**Target Performance** (after Phase 6):
- Page load time: <2 seconds
- Route transitions: <500ms
- Form interactions: <100ms
- No performance degradation from refactoring

**Monitoring**:
- Manual testing during development
- Browser DevTools performance profiling
- React DevTools profiler for component renders

---

## Timeline & Milestones

### Overall Timeline

**Total Estimated Duration**: 10-14 weeks (2.5-3.5 months)

**Breakdown by Phase**:
- Phase 1: ✅ Complete (2 weeks)
- Phase 2: ✅ Complete (2 weeks)
- Phase 3: 2-3 weeks
- Phase 4: 2-3 weeks
- Phase 5: 1 week
- Phase 6: 3-4 weeks
- Buffer: 2 weeks (for bugs, unforeseen issues)

### Milestones

**Milestone 1: Foundation Complete** ✅ (Weeks 1-4)
- Phase 1: Dead code removal
- Phase 2: Form change detection simplification
- Status: COMPLETE
- Deliverable: Cleaner codebase, simplified forms

**Milestone 2: API Refactoring Complete** (Weeks 5-7)
- Phase 3: API layer refactoring
- Status: PENDING
- Deliverable: Generic CRUD operations, reduced API complexity
- Quality Gate: All tests pass, organization scoping verified

**Milestone 3: Routing Migration Complete** (Weeks 8-10)
- Phase 4: React Router migration
- Status: PENDING
- Deliverable: URL-based routing, browser history support
- Quality Gate: All routes work, bookmarking functional

**Milestone 4: Abstractions Removed** (Week 11)
- Phase 5: Remove unnecessary abstractions
- Status: PENDING
- Deliverable: Cleaner architecture, consolidated utilities
- Quality Gate: All tests pass, no regressions

**Milestone 5: Component Refactoring Complete** (Weeks 12-15)
- Phase 6: Component refactoring
- Status: PENDING
- Deliverable: Smaller, focused components
- Quality Gate: All components <500 lines, improved maintainability

**Milestone 6: Production Ready** (Week 16)
- Final testing and validation
- Documentation complete
- Deployment preparation
- User acceptance testing

### Contingency Planning

**If timeline slips**:
1. Phase 6 is optional - can be deferred if needed
2. Phase 5 can be reduced in scope (keep NavigationContext if needed)
3. Phase 3 can be done incrementally (refactor one entity type at a time)

**Priority order**:
1. Phase 3 (API refactoring) - Critical for maintainability
2. Phase 4 (Routing) - Critical for user experience
3. Phase 5 (Abstractions) - Important but deferrable
4. Phase 6 (Components) - Optional, can be done incrementally

---

## Success Metrics

### Code Quality Metrics

**Code Reduction**:
- [x] Phase 1: ~200 lines removed ✅
- [x] Phase 2: ~32 lines reduced ✅
- [ ] Phase 3: ~1,200 lines reduced
- [ ] Phase 4: ~200 lines reduced
- [ ] Phase 5: ~100 lines reduced
- [ ] Phase 6: ~1,500 lines moved to smaller components
- **Total Target**: ~3,232 lines (25-30% reduction)

**Component Size**:
- [ ] Average component: <100 lines (from 143)
- [ ] Largest component: <500 lines (from 2,091)
- [ ] Components >1000 lines: 0 (from 4)

**API Layer**:
- [ ] Size: <1,600 lines (from 2,824)
- [ ] Functions: <30 (from 57)
- [ ] Generic CRUD coverage: >70%

**Routing**:
- [ ] App.tsx: <370 lines (from 570)
- [ ] URL-based navigation: 100%
- [ ] Browser history support: 100%

### Testing Metrics

**Test Count**:
- [x] Phase 1-2: 60 tests ✅
- [ ] Phase 3: 75+ tests
- [ ] Phase 4: 90+ tests
- [ ] Phase 6: 110+ tests

**Test Coverage**:
- [ ] Utilities: >90% line coverage
- [ ] API layer: >80% function coverage
- [ ] Components: >60% integration coverage
- [ ] Critical paths: 100% smoke test coverage

**Test Quality**:
- [ ] Zero flaky tests
- [ ] All tests run in <30 seconds
- [ ] No complex mocking (simplified approach)

### Functionality Metrics

**Feature Completeness**:
- Current: ~65% implemented, ~20% partial
- Target: Maintain or improve (no regressions)
- All refactoring must preserve functionality

**Bug Count**:
- P0 (Critical): 0 at all times
- P1 (High): <3 at any time
- P2 (Medium): <10 at any time
- P3 (Low): Tracked but not blocking

### Developer Experience Metrics

**Maintainability**:
- [ ] Standard routing (React Router)
- [ ] Generic API patterns (CRUD)
- [ ] Smaller components (<500 lines)
- [ ] Simpler state management

**Developer Onboarding**:
- [ ] New developer can understand codebase in <2 days
- [ ] Documentation covers all major patterns
- [ ] Code conventions clearly documented

**Development Speed**:
- [ ] Adding new feature takes <50% time (vs current)
- [ ] Bug fixes take <50% time (vs current)
- [ ] Test writing is straightforward (no complex mocking)

---

## Risk Management

### High Risk Areas

**1. Routing Migration (Phase 4)**
- **Risk**: Core navigation affects entire app, high impact if broken
- **Impact**: High - affects all user workflows
- **Probability**: Medium - well-documented pattern, but lots of surface area
- **Mitigation**:
  - Comprehensive integration tests before migration
  - Gradual migration (route by route if needed)
  - Keep old routing code until full verification
  - Manual testing of all routes before removal
- **Contingency**: Roll back to custom routing if critical issues found

**2. API Refactoring (Phase 3)**
- **Risk**: API layer used throughout app, errors could affect all features
- **Impact**: High - affects all data operations
- **Probability**: Medium - well-defined patterns, but organization scoping is critical
- **Mitigation**:
  - Test organization scoping extensively
  - Refactor one entity type at a time
  - Keep old functions until verified
  - Extensive manual testing after each refactor
- **Contingency**: Revert to specific entity functions if generic approach fails

### Medium Risk Areas

**4. Component Refactoring (Phase 6)**
- **Risk**: Breaking components into smaller pieces could introduce bugs
- **Impact**: Medium - affects specific features
- **Probability**: Low - well-defined extraction patterns
- **Mitigation**:
  - Test current behavior before extraction
  - Test extracted components in isolation
  - Keep old component until verified
  - Manual testing of affected features
- **Contingency**: Revert to monolithic component if extraction causes issues

### Low Risk Areas

**6. Remove Abstractions (Phase 5)**
- **Risk**: Removing NavigationContext could break navigation
- **Impact**: Low - depends on Phase 4 completion
- **Probability**: Very Low - straightforward removal after routing migration
- **Mitigation**:
  - Verify React Router replaces all usage
  - Search for all references before removal
- **Contingency**: Keep NavigationContext if needed

### Risk Monitoring

**Periodic Risk Review**:
- Review progress against timeline
- Identify new risks or issues
- Adjust mitigation strategies
- Update contingency plans

**Risk Indicators**:
- 🟢 **Green**: On track, no issues
- 🟡 **Yellow**: Minor delays, manageable issues
- 🔴 **Red**: Significant delays, critical issues

**Current Status**: 🟢 Green (Phases 1-2 complete, no issues)

### Rollback Strategy

**For each phase**:
1. Keep old code until new code is verified
2. Use feature flags if needed for gradual rollout
3. Maintain ability to revert to previous phase
4. Document rollback procedures

**Rollback Triggers**:
- Critical bugs (P0) that can't be fixed quickly
- >5 high-priority bugs (P1) discovered after phase
- Test coverage drops significantly
- Performance degrades significantly

---

## Appendix

### Related Documentation

- [Feature Catalog](../product/feature-catalog.md) - Complete feature inventory
- [Coding Guide](./ai-agents/coding-guide.md) - TypeScript and React patterns (consolidates coding-conventions.md and BASE_CODING_PROMPT.md)
- [Requirements](../product/requirements.md) - Product requirements
- [Tech Stack](../technical/tech-stack.md) - Technology overview

**Note**: This document consolidates the Code Simplification Plan into Section 3 (Refactoring Phases) with detailed task tracking via markdown checkboxes.

### Feedback and Updates

This document should be updated:
- At the end of each phase (update status, metrics, lessons learned)
- When significant risks or issues are identified
- When timeline or priorities change
- When new information affects the plan

**Owner**: Development Team  
**Review Frequency**: Weekly during active development
