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
- Largest component: `CreateGigScreen.tsx` (2,091 lines)
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

**Status**: ✅ **Complete** (2026-01-19) - **Interim Solution**

**Key Achievements**:
- Created simplified `useSimpleFormChanges.ts` hook (~200 lines, replacing 232-line `useFormWithChanges.ts`)
- Migrated 6 form components to use new hook: CreateGigScreen, CreateAssetScreen, CreateKitScreen, CreateOrganizationScreen, UserProfileCompletionScreen, EditUserProfileDialog
- Removed complex deep equality checking and ref patterns
- Leverages react-hook-form's built-in `isDirty` for form field changes
- Simple reference comparison for nested data (arrays, objects)
- All functionality preserved with simpler, more maintainable code
- **Bug Fix (2026-01-19)**: Fixed `hasAnyChanges` calculation to properly use `form.formState.isDirty` instead of shallow comparison, resolving false positives with Date and array fields
- Added comprehensive tests (9 new tests) covering Date fields, array fields, and nested data changes

**Technical Improvements**:
- Eliminated `setTimeout` hacks for change detection
- Removed complex `currentData` merging logic
- Cleaner API with `hasChanges` boolean and `changedFields` object
- Better TypeScript support with generic types

**Lessons Learned**:
- react-hook-form's built-in features are sufficient for most use cases
- Simple reference comparison is adequate for nested data in this application
- Removing complexity makes code easier to understand and debug
- **Hybrid state management** (react-hook-form + useState for nested data) introduces complexity and fragility
- Change detection for nested arrays requires proper architecture (see Phase 2A)

**Known Limitations**:
- Submit button always enabled in edit mode (change detection disabled as interim fix)
- Nested data (participants, staffSlots, kitAssignments, bids) not properly tracked for changes
- Complex coordination between form state and nested state
- Form fields vs nested data separation creates multiple sources of truth

**Next Steps**: 
- **Short-term**: Phase 2A (Form Architecture Refactor) to properly handle nested data with `useFieldArray`
- **Long-term**: Proceed to Phase 3 (API layer refactoring) after form architecture is stable

---

## Active Phases

### Phase 2A: Form Architecture Refactor with useFieldArray

**Status**: ⏸️ **Pending** (High Priority)

**Objective**: Properly handle nested data in forms using react-hook-form's `useFieldArray` instead of separate useState

**Current Problems**:
1. **Hybrid State Management**: Form fields in react-hook-form, nested data (participants, staffSlots, kitAssignments, bids) in useState
2. **Change Detection Failures**: Reference-based comparison for nested data is fragile and error-prone
3. **Multiple Sources of Truth**: Form state, nested state arrays, change tracking state, prevDataRef
4. **Complex Coordination**: Separating form/nested data during load, save, and change detection
5. **Submit Button Issues**: Always enabled in edit mode due to disabled change detection

**Current Architecture** (Problematic):
```typescript
// Form fields managed by react-hook-form
const form = useForm({ title, start_time, end_time, tags, notes, ... });

// Nested data managed by useState (PROBLEM)
const [participants, setParticipants] = useState([]);
const [staffSlots, setStaffSlots] = useState([]);
const [kitAssignments, setKitAssignments] = useState([]);
const [bids, setBids] = useState([]);

// Complex change detection trying to track both
const changeDetection = useSimpleFormChanges({
  form: form,
  currentData: { ...formValues, participants, staffSlots, kitAssignments, bids }
});
```

**Target Architecture** (Clean):
```typescript
// ALL data managed by react-hook-form
const form = useForm({
  defaultValues: {
    title: '',
    start_time: undefined,
    end_time: undefined,
    tags: [],
    notes: '',
    participants: [],      // ← Now in form
    staffSlots: [],        // ← Now in form
    kitAssignments: [],    // ← Now in form
    bids: [],              // ← Now in form
  }
});

// Use useFieldArray for nested data
const { fields: participantFields, append: addParticipant, remove: removeParticipant } 
  = useFieldArray({ control: form.control, name: "participants" });

// Change detection "just works" - single source of truth
const hasChanges = form.formState.isDirty;
```

**Benefits**:
- ✅ **Single source of truth**: All data in react-hook-form
- ✅ **Built-in change detection**: `form.formState.isDirty` handles everything
- ✅ **No coordination needed**: No separating form/nested data during load/save
- ✅ **Type safety**: TypeScript understands nested structure
- ✅ **Validation**: Can validate nested data with zod schema
- ✅ **Submit button**: Properly disabled when no changes

**Affected Forms** (All need same refactoring):
1. `CreateGigScreen.tsx` (2,091 lines) - Most complex
   - Nested data: participants, staffSlots, kitAssignments, bids
2. `CreateKitScreen.tsx` (739 lines)
   - Nested data: kitAssets
3. `CreateAssetScreen.tsx` (647 lines)
   - Simple form, no nested arrays
4. `CreateOrganizationScreen.tsx` (1,029 lines)
   - Simple form, no nested arrays
5. `EditUserProfileDialog.tsx` (236 lines)
   - Simple form, no nested arrays
6. `UserProfileCompletionScreen.tsx` (393 lines)
   - Simple form, no nested arrays

**Implementation Tasks**:

#### 2A.1 Refactor CreateGigScreen to use useFieldArray

**Goal**: Convert CreateGigScreen from hybrid state to full react-hook-form + useFieldArray

**Tasks**:
- [ ] Update form schema to include nested data types
  - [ ] Add participants array to zod schema
  - [ ] Add staffSlots array to zod schema
  - [ ] Add kitAssignments array to zod schema
  - [ ] Add bids array to zod schema
- [ ] Replace useState with useFieldArray
  - [ ] Convert `participants` from useState to useFieldArray
  - [ ] Convert `staffSlots` from useState to useFieldArray
  - [ ] Convert `kitAssignments` from useState to useFieldArray
  - [ ] Convert `bids` from useState to useFieldArray
- [ ] Update all handlers to use field array methods
  - [ ] Update `handleAddParticipant` to use `append()`
  - [ ] Update `handleRemoveParticipant` to use `remove()`
  - [ ] Update `handleAddStaffSlot` to use `append()`
  - [ ] Update `handleRemoveStaffSlot` to use `remove()`
  - [ ] Update `handleAssignKit` to use `append()`
  - [ ] Update `handleRemoveKit` to use `remove()`
  - [ ] Update bid handlers to use field array methods
- [ ] Simplify loadGig to load all data into form
  - [ ] Remove separation of form/nested data
  - [ ] Single `form.reset()` call with all data
- [ ] Simplify onSubmit
  - [ ] Remove complex coordination logic
  - [ ] Single `form.getValues()` gets everything
  - [ ] Remove `changeDetection.markAsSaved()` - use `form.reset()` instead
- [ ] Enable Submit button change detection
  - [ ] Change: `disabled={isSubmitting || (isEditMode && !form.formState.isDirty)}`
  - [ ] Remove `useSimpleFormChanges` hook entirely from this component
- [ ] Update tests
  - [ ] Test nested data changes trigger isDirty
  - [ ] Test Submit button enables/disables correctly
  - [ ] Test form validation with nested data
- [ ] Manual testing
  - [ ] Test create mode with nested data
  - [ ] Test edit mode - add/remove participants
  - [ ] Test edit mode - add/remove staff slots
  - [ ] Test edit mode - add/remove kit assignments
  - [ ] Test edit mode - add/remove bids
  - [ ] Test Submit button state in all scenarios

**Verification**:
- [ ] All nested data operations work correctly
- [ ] Submit button enables when changes made
- [ ] Submit button disabled when no changes
- [ ] Form validation works for nested data
- [ ] No console errors
- [ ] All tests pass

#### 2A.2 Refactor CreateKitScreen to use useFieldArray

**Goal**: Convert CreateKitScreen from useState to useFieldArray for kitAssets

**Tasks**:
- [ ] Add kitAssets array to form schema
- [ ] Replace `kitAssets` useState with useFieldArray
- [ ] Update `handleAddAsset` to use `append()`
- [ ] Update `handleRemoveAsset` to use `remove()`
- [ ] Update `handleUpdateQuantity` to use field array methods
- [ ] Simplify loadKit to reset form with all data
- [ ] Simplify onSubmit
- [ ] Enable Submit button change detection
- [ ] Update tests
- [ ] Manual testing

**Verification**: Same as 2A.1

#### 2A.3 Remove useSimpleFormChanges Hook (Optional)

**Goal**: Remove the hook if no longer needed after useFieldArray refactor

**Tasks**:
- [ ] Verify all forms using useSimpleFormChanges have been refactored
- [ ] Check if any forms still need the hook (simple forms without nested data may keep it)
- [ ] Remove `useSimpleFormChanges.ts` if unused
- [ ] Remove `useSimpleFormChanges.test.ts` if hook removed
- [ ] Update documentation

**Note**: Simple forms (CreateAssetScreen, EditUserProfileDialog, etc.) may still benefit from keeping the hook for consistency, or can just use `form.formState.isDirty` directly.

**Success Criteria**:
- All forms use consistent architecture (react-hook-form + useFieldArray for nested data)
- Submit button change detection works correctly in all forms
- No hybrid state management (useState + useForm)
- Single source of truth for all form data
- All tests pass
- No regressions in functionality

**Estimated Timeline**: 3-5 days
- CreateGigScreen refactor: 2-3 days (most complex)
- CreateKitScreen refactor: 1 day
- Testing and verification: 1 day

**Priority**: High - Blocks proper form functionality and change detection

---

### Phase 3: Refactor API Layer

**Status**: ⏸️ **Pending**

**Objective**: Reduce repetitive CRUD operations from 57 functions to generic operations

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
- CreateGigScreen.tsx: 2,091 lines
- GigListScreen.tsx: 1,021 lines
- TeamScreen.tsx: 1,034 lines
- CreateOrganizationScreen.tsx: 1,028 lines

**Target State**:
- Largest component: <500 lines
- Average component: <100 lines
- Extracted components: ~15-20 new focused components

**Components Requiring Refactoring** (>1000 lines):

1. **CreateGigScreen.tsx** - 2,091 lines
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

4. **CreateOrganizationScreen.tsx** - 1,028 lines
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
- [ ] Split `CreateGigScreen.tsx` (2,091 lines):
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
- [ ] Split `CreateOrganizationScreen.tsx` (1,028 lines):
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
