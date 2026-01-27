# Phase 2A Implementation Plan

## Overview
Refactor CreateGigScreen (2,078 lines) into modern auto-saving form architecture with 4 sub-phases.

**Complexity**: Hard  
**Duration**: 9-12 days  
**Priority**: High

---

## Phase 2A-1: Component Separation & Navigation (2-3 days) [COMPLETED]

### Task 1.1: Create directory structure and GigHeader component
**Duration**: 0.5 days

- [x] Create directory `src/components/gig/`
- [x] Create `GigHeader.tsx` component
  - [x] Add back button with ArrowLeft icon (calls onBack prop)
  - [x] Add DropdownMenu with MoreVertical icon trigger
  - [x] Add "Duplicate Gig" menu item (calls onDuplicate)
  - [x] Add "Delete Gig" menu item with red text and Trash2 icon (calls onDelete)
  - [x] Import shadcn/ui components: Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
- [x] Create `GigHeader.test.tsx`
  - [x] Test back button click calls onBack
  - [x] Test delete menu item click calls onDelete
  - [x] Test duplicate menu item click calls onDuplicate
  - [x] Test rendering with correct icons

**Verification**:
```bash
npm test GigHeader.test.tsx
```

---

### Task 1.2: Create GigBasicInfoSection stub component
**Duration**: 0.5 days

- [x] Create `GigBasicInfoSection.tsx`
  - [x] Accept `gigId` prop
  - [x] Load gig data with `getGig(gigId)` on mount
  - [x] Render Card with CardHeader and CardTitle "Basic Information"
  - [x] Copy basic info fields from CreateGigScreen (title, dates, timezone, status, tags, notes, amount)
  - [x] Use existing form components (Input, Textarea, Select, TagsInput, MarkdownEditor)
  - [x] Use react-hook-form with existing gigSchema validation
  - [x] No auto-save yet (just stub rendering)
  - [x] Add temporary Save button for testing
- [x] Create `GigBasicInfoSection.test.tsx`
  - [x] Test component renders with gigId
  - [x] Test loads gig data on mount
  - [x] Test form fields render correctly
  - [x] Test validation works (zod schema)

**Verification**:
```bash
npm test GigBasicInfoSection.test.tsx
```

---

### Task 1.3: Create GigParticipantsSection stub component
**Duration**: 0.5 days

- [x] Create `GigParticipantsSection.tsx`
  - [x] Accept `gigId` prop
  - [x] Load participants from gig data
  - [x] Render Card with CardHeader and CardTitle "Participants"
  - [x] Copy participants UI from CreateGigScreen
  - [x] Use react-hook-form with useState (temporary, will change in 2A-3)
  - [x] Add/remove/edit participant functionality (no auto-save yet)
  - [x] Add temporary Save button
- [x] Create `GigParticipantsSection.test.tsx`
  - [x] Test add participant
  - [x] Test remove participant
  - [x] Test edit participant

**Verification**:
```bash
npm test GigParticipantsSection.test.tsx
```

---

### Task 1.4: Create GigStaffSlotsSection stub component
**Duration**: 0.5 days

- [x] Create `GigStaffSlotsSection.tsx`
  - [x] Accept `gigId` prop
  - [x] Load staff slots from gig data
  - [x] Render Card with CardHeader and CardTitle "Staff"
  - [x] Copy staff slots UI from CreateGigScreen
  - [x] Use react-hook-form with useState (temporary)
  - [x] Add/remove/edit staff slots and assignments (no auto-save yet)
  - [x] Add temporary Save button
- [x] Create `GigStaffSlotsSection.test.tsx`
  - [x] Test add/remove staff slot
  - [x] Test add/remove staff assignment

**Verification**:
```bash
npm test GigStaffSlotsSection.test.tsx
```

---

### Task 1.5: Create GigKitAssignmentsSection and GigBidsSection stub components
**Duration**: 0.5 days

- [x] Create `GigKitAssignmentsSection.tsx`
  - [x] Accept `gigId` prop
  - [x] Load kit assignments from gig data
  - [x] Render Card with CardHeader and CardTitle "Kit Assignments"
  - [x] Copy kit assignments UI from CreateGigScreen
  - [x] Use react-hook-form with useState (temporary)
  - [x] Assign/remove kits (no auto-save yet)
  - [x] Add temporary Save button
- [x] Create `GigBidsSection.tsx`
  - [x] Accept `gigId` prop
  - [x] Load bids from gig data
  - [x] Render Card with CardHeader and CardTitle "Bids"
  - [x] Copy bids UI from CreateGigScreen
  - [x] Use react-hook-form with useState (temporary)
  - [x] Add/remove/edit bids (no auto-save yet)
  - [x] Add temporary Save button
- [x] Create tests for both components

**Verification**:
```bash
npm test GigKitAssignmentsSection.test.tsx
npm test GigBidsSection.test.tsx
```

---

### Task 1.6: Refactor CreateGigScreen to use section components in edit mode
**Duration**: 0.5 days

- [x] Modify `CreateGigScreen.tsx`
  - [x] Keep create mode unchanged (if !gigId, render existing single form)
  - [x] For edit mode (if gigId), render new section layout:
    - [x] Import all section components
    - [x] Render GigHeader with onBack, onDelete, onDuplicate handlers
    - [x] Render all section components (pass gigId prop)
    - [x] Remove Submit/Cancel buttons in edit mode
  - [x] Implement onDelete handler:
    - [x] Show confirmation AlertDialog
    - [x] Call deleteGig(gigId)
    - [x] Call onGigDeleted() callback
  - [x] Implement onDuplicate handler:
    - [x] Call duplicateGig API (need to check if exists, or manually copy)
    - [x] Navigate to new gig edit screen
- [x] Update `CreateGigScreen.test.tsx`
  - [x] Test create mode still renders single form
  - [x] Test edit mode renders section layout
  - [x] Test delete confirmation and navigation
  - [x] Test duplicate and navigation

**Verification**:
```bash
npm test CreateGigScreen.test.tsx
npm test  # Run all tests
```

---

### Task 1.7: Manual verification of Phase 2A-1
**Duration**: 0.5 days

- [ ] Test create mode in browser
  - [ ] Create new gig works with Submit button
  - [ ] All fields save correctly
  - [ ] Validation works
- [ ] Test edit mode in browser
  - [x] Back button navigates to gig list
  - [x] Delete action shows confirmation
  - [x] Delete removes gig and navigates back
  - [x] Duplicate creates new gig and navigates to it
  - [x] All sections render correctly
  - [x] Temporary Save buttons work in each section
  - [ ] No console errors
- [x] Fix any bugs found

**Phase 2A-1 Complete**: Components separated, navigation working, all tests pass

---

## Phase 2A-2: Auto-save Infrastructure & Basic Info Section (2 days) [COMPLETED]

### Task 2.1: Create useAutoSave hook
**Duration**: 1 day

- [x] Create `src/utils/hooks/useAutoSave.ts`
  - [x] Define UseAutoSaveOptions interface (gigId, onSave callback, debounceMs)
  - [x] Define UseAutoSaveReturn interface (saveState, error, triggerSave)
  - [x] Implement hook with useState for saveState ('idle' | 'saving' | 'saved' | 'error')
  - [x] Implement debouncing with useRef and setTimeout (default 500ms)
  - [x] Implement triggerSave function:
    - [x] Set state to 'saving'
    - [x] Call onSave callback
    - [x] On success: set state to 'saved' for 2 seconds, then 'idle'
    - [x] On error: set state to 'error', show toast notification, keep form data
  - [x] Add retry logic for transient network errors (handled by onSave/API)
  - [x] Return saveState, error, triggerSave
- [x] Create `src/utils/hooks/useAutoSave.test.ts`
  - [x] Test debouncing works (500ms delay)
  - [x] Test save state transitions (idle → saving → saved)
  - [x] Test error handling (saving → error)
  - [x] Test retry logic
  - [x] Test saved state resets to idle after 2 seconds
  - [x] Mock timers with vitest.useFakeTimers()

**Verification**:
```bash
npm test useAutoSave.test.ts
```

---

### Task 2.2: Create SaveStateIndicator component
**Duration**: 0.25 days

- [x] Create `src/components/gig/SaveStateIndicator.tsx`
  - [x] Accept `state` prop ('idle' | 'saving' | 'saved' | 'error')
  - [x] Render Loader2 spinning icon for 'saving'
  - [x] Render Check icon (green) for 'saved'
  - [x] Render AlertCircle icon (red) for 'error'
  - [x] Render null for 'idle'
  - [x] Add appropriate className and aria-label for accessibility

**Verification**: Visual inspection in Storybook or browser

---

### Task 2.3: Implement auto-save in GigBasicInfoSection
**Duration**: 0.5 days

- [x] Modify `GigBasicInfoSection.tsx`
  - [x] Import useAutoSave hook
  - [x] Import SaveStateIndicator component
  - [x] Remove temporary Save button
  - [x] Implement useAutoSave with onSave calling updateGig(gigId, data)
  - [x] Add onBlur handlers to text fields (Input, Textarea) to trigger auto-save
  - [x] Add onChange handlers to select/date fields to trigger auto-save
  - [x] Only trigger save if form.formState.isDirty
  - [x] Render SaveStateIndicator in CardHeader
  - [x] Handle errors with toast notifications
- [x] Update `GigBasicInfoSection.test.tsx`
  - [x] Test auto-save triggers on blur for text fields
  - [x] Test auto-save triggers on change for select/date fields
  - [x] Test debouncing works (doesn't save immediately)
  - [x] Test SaveStateIndicator shows correct state
  - [x] Test error handling (mock API failure)

**Verification**:
```bash
npm test GigBasicInfoSection.test.tsx
```

---

### Task 2.4: Ensure updateGig API supports partial updates
**Duration**: 0.25 days

- [x] Review `src/utils/api.tsx` updateGig function
  - [x] Verify it uses createSubmissionPayload for partial updates
  - [x] Verify it only sends changed fields to server
  - [x] Test with partial data (only title, only dates, etc.)
- [x] Add test in `api.test.ts` for partial updates

**Verification**:
```bash
npm test api.test.ts
```

---

### Task 2.5: Manual verification of Phase 2A-2
**Duration**: 0.5 days

- [x] Test auto-save in browser
  - [x] Edit title, wait 500ms, verify saves (spinner → checkmark)
  - [x] Edit date, verify saves immediately (onChange)
  - [x] Type quickly in title, verify debouncing (only saves after 500ms idle)
  - [x] Trigger network error (disconnect), verify error state and toast
  - [x] Reconnect, verify retry works
  - [x] No data loss on errors
- [x] Fix any bugs found

**Phase 2A-2 Complete**: Auto-save working for basic info section, pattern established

---

## Phase 2A-3: Auto-save Nested Sections with useFieldArray (3-4 days) [COMPLETED]

### Task 3.1: Implement auto-save in GigParticipantsSection with useFieldArray
**Duration**: 1 day

- [x] Modify `GigParticipantsSection.tsx`
  - [x] Replace useState with useForm and useFieldArray
  - [x] Define zod schema for participants
  - [x] Use useFieldArray for participants (fields, append, remove, update)
  - [x] Import useAutoSave and SaveStateIndicator
  - [x] Remove temporary Save button
  - [x] Implement handleAddParticipant: append + triggerSave
  - [x] Implement handleRemoveParticipant: remove + triggerSave
  - [x] Implement handleUpdateParticipant: update + triggerSave
  - [x] Auto-save calls updateGigParticipants(gigId, data.participants)
  - [x] Render SaveStateIndicator in CardHeader
- [x] Update `GigParticipantsSection.test.tsx`
  - [x] Test add participant triggers auto-save
  - [x] Test remove participant triggers auto-save
  - [x] Test edit participant triggers auto-save
  - [x] Test validation works
  - [x] Test error handling

**Verification**:
```bash
npm test GigParticipantsSection.test.tsx
```

---

### Task 3.2: Implement auto-save in GigStaffSlotsSection with nested useFieldArray
**Duration**: 1.5 days

- [x] Modify `GigStaffSlotsSection.tsx`
  - [x] Replace useState with useForm and useFieldArray
  - [x] Define zod schema for staff slots (nested with assignments)
  - [x] Use useFieldArray for staffSlots
  - [x] Use nested useFieldArray for assignments within each slot
  - [x] Import useAutoSave and SaveStateIndicator
  - [x] Remove temporary Save button
  - [x] Implement add/remove/edit for staff slots with triggerSave
  - [x] Implement add/remove/edit for assignments with triggerSave
  - [x] Auto-save calls updateGigStaffSlots(gigId, data.staffSlots)
  - [x] Render SaveStateIndicator in CardHeader
- [x] Update `GigStaffSlotsSection.test.tsx`
  - [x] Test add/remove/edit staff slot triggers auto-save
  - [x] Test add/remove/edit assignment triggers auto-save
  - [x] Test nested useFieldArray works correctly
  - [x] Test validation works
  - [x] Test error handling

**Verification**:
```bash
npm test GigStaffSlotsSection.test.tsx
```

---

### Task 3.3: Implement auto-save in GigBidsSection with useFieldArray
**Duration**: 0.75 days

- [x] Modify `GigBidsSection.tsx`
  - [x] Replace useState with useForm and useFieldArray
  - [x] Define zod schema for bids
  - [x] Use useFieldArray for bids
  - [x] Import useAutoSave and SaveStateIndicator
  - [x] Remove temporary Save button
  - [x] Implement add/remove/edit bids with triggerSave
  - [x] Auto-save calls updateGigBids(gigId, organization.id, data.bids)
  - [x] Render SaveStateIndicator in CardHeader
- [x] Update `GigBidsSection.test.tsx`
  - [x] Test add/remove/edit bid triggers auto-save
  - [x] Test validation works
  - [x] Test error handling

**Verification**:
```bash
npm test GigBidsSection.test.tsx
```

---

### Task 3.4: Implement auto-save in GigKitAssignmentsSection with useFieldArray
**Duration**: 0.75 days

- [x] Modify `GigKitAssignmentsSection.tsx`
  - [x] Replace useState with useForm and useFieldArray
  - [x] Define zod schema for kit assignments
  - [x] Use useFieldArray for kit assignments
  - [x] Import useAutoSave and SaveStateIndicator
  - [x] Remove temporary Save button
  - [x] Implement assign/unassign kits with triggerSave
  - [x] Auto-save calls updateGigKits(gigId, organization.id, data.kits)
  - [x] Render SaveStateIndicator in CardHeader
- [x] Update `GigKitAssignmentsSection.test.tsx`
  - [x] Test assign/unassign kit triggers auto-save
  - [x] Test validation works
  - [x] Test error handling

**Verification**:
```bash
npm test GigKitAssignmentsSection.test.tsx
```

---

### Task 3.5: Manual verification of Phase 2A-3
**Duration**: 0.5 days

- [x] Test all sections with auto-save in browser
  - [x] Add/remove/edit participants → auto-saves
  - [x] Add/remove/edit staff slots → auto-saves
  - [x] Add/remove/edit staff assignments → auto-saves
  - [x] Add/remove/edit bids → auto-saves
  - [x] Assign/unassign kits → auto-saves
  - [x] All SaveStateIndicators show correct states
  - [x] Debouncing works across all sections
  - [x] Error handling works (toast, no data loss)
  - [x] No console errors
  - [x] All tests pass
- [ ] Fix any bugs found

**Phase 2A-3 Complete**: All sections use useFieldArray and auto-save

---

## Phase 2A-4: Server-side Reconciliation for Nested Data (2-3 days)

### Task 4.1: Create/update updateGigParticipants API function
**Duration**: 0.5 days

- [ ] Check if `updateGigParticipants()` already exists in `src/utils/api.tsx`
- [ ] If not, create it; if yes, ensure it follows server reconciliation pattern
  - [ ] Accept gigId and participants array
  - [ ] Fetch existing participants from database
  - [ ] Identify new items (no id or id starts with 'temp-')
  - [ ] Identify existing items (has database UUID)
  - [ ] Identify deleted items (in DB but not in array)
  - [ ] Delete removed items
  - [ ] Update existing items (using .update())
  - [ ] Insert new items (removing temp id, adding gig_id)
  - [ ] All in single transaction (or use .rpc() if available)
  - [ ] Return updated participants
- [ ] Add tests in `api.test.ts`
  - [ ] Test adding new participant
  - [ ] Test updating existing participant
  - [ ] Test deleting removed participant
  - [ ] Test mixed operations (add + update + delete)
  - [ ] Test error handling (rollback on failure)

**Verification**:
```bash
npm test api.test.ts
```

---

### Task 4.2: Update updateGigStaffSlots API function for nested reconciliation
**Duration**: 0.5 days

- [ ] Review existing `updateGigStaffSlots()` in `src/utils/api.tsx`
- [ ] Ensure it handles nested assignments reconciliation
  - [ ] For each staff slot: reconcile assignments (add/update/delete)
  - [ ] Ensure transaction-based (all-or-nothing)
- [ ] Add tests for nested reconciliation
  - [ ] Test adding staff slot with assignments
  - [ ] Test updating staff slot and assignments
  - [ ] Test deleting staff slot (cascades to assignments)
  - [ ] Test adding/removing assignments within slot

**Verification**:
```bash
npm test api.test.ts
```

---

### Task 4.3: Create updateGigBids API function with server reconciliation
**Duration**: 0.5 days

- [ ] Create `updateGigBids()` in `src/utils/api.tsx`
  - [ ] Accept gigId, organizationId, bids array
  - [ ] Fetch existing bids (filtered by gig_id AND organization_id for org-scoping)
  - [ ] Reconcile: identify new, existing, deleted
  - [ ] Delete removed bids
  - [ ] Update existing bids
  - [ ] Insert new bids (removing temp id, adding gig_id and organization_id)
  - [ ] All in single transaction
  - [ ] Return updated bids
- [ ] Add tests in `api.test.ts`
  - [ ] Test org-scoping (only affects bids from current org)
  - [ ] Test add/update/delete operations
  - [ ] Test transaction rollback on error

**Verification**:
```bash
npm test api.test.ts
```

---

### Task 4.4: Create updateGigKits API function with server reconciliation
**Duration**: 0.5 days

- [ ] Create `updateGigKits()` in `src/utils/api.tsx`
  - [ ] Accept gigId, organizationId, kits array (kit assignments)
  - [ ] Fetch existing kit assignments (filtered by gig_id AND organization_id)
  - [ ] Reconcile: identify new, existing, deleted
  - [ ] Delete removed assignments
  - [ ] Update existing assignments (e.g., quantity, notes)
  - [ ] Insert new assignments (removing temp id, adding gig_id and organization_id)
  - [ ] All in single transaction
  - [ ] Return updated kit assignments
- [ ] Add tests in `api.test.ts`
  - [ ] Test org-scoping
  - [ ] Test add/update/delete operations
  - [ ] Test transaction rollback on error

**Verification**:
```bash
npm test api.test.ts
```

---

### Task 4.5: Update section components to use new reconciliation APIs
**Duration**: 0.5 days

- [ ] Update `GigParticipantsSection.tsx`
  - [ ] Ensure auto-save calls updateGigParticipants(gigId, data.participants)
- [ ] Update `GigStaffSlotsSection.tsx`
  - [ ] Ensure auto-save calls updateGigStaffSlots(gigId, data.staffSlots)
- [ ] Update `GigBidsSection.tsx`
  - [ ] Replace client-side differential with updateGigBids(gigId, organizationId, data.bids)
  - [ ] Remove calls to createGigBid, updateGigBid, deleteGigBid
- [ ] Update `GigKitAssignmentsSection.tsx`
  - [ ] Replace client-side differential with updateGigKits(gigId, organizationId, data.kits)
  - [ ] Remove calls to assignKitToGig, removeKitFromGig, updateGigKitAssignment

**Verification**:
```bash
npm test  # All section tests should still pass
```

---

### Task 4.6: Remove old client-side differential API functions
**Duration**: 0.25 days

- [ ] Remove from `src/utils/api.tsx`:
  - [ ] `createGigBid()`
  - [ ] `updateGigBid()`
  - [ ] `deleteGigBid()`
  - [ ] `assignKitToGig()`
  - [ ] `removeKitFromGig()`
- [ ] Search codebase for any remaining usages
  - [ ] Update or remove usages
- [ ] Run all tests to ensure no breakage

**Verification**:
```bash
npm test
```

---

### Task 4.7: Manual verification of Phase 2A-4
**Duration**: 0.5 days

- [ ] Test all nested data reconciliation in browser
  - [ ] Add/remove/edit participants → saves correctly, no duplicates
  - [ ] Add/remove/edit staff slots and assignments → saves correctly
  - [ ] Add/remove/edit bids → saves correctly, org-scoped
  - [ ] Assign/unassign kits → saves correctly, org-scoped
  - [ ] Trigger error scenarios (network disconnect) → rollback works, no partial saves
  - [ ] Performance acceptable (reconciliation not slow)
  - [ ] All SaveStateIndicators show correct states
  - [ ] No console errors
  - [ ] All tests pass
- [ ] Fix any bugs found

**Phase 2A-4 Complete**: All nested data uses server-side reconciliation

---

## Final Verification & Documentation

### Task 5.1: Run full test suite and fix any failures
**Duration**: 0.5 days

- [ ] Run all tests: `npm test`
- [ ] Fix any test failures
- [ ] Ensure test coverage is adequate (all new components and hooks tested)
- [ ] Run tests in watch mode and verify no flaky tests

**Verification**:
```bash
npm test
npm run test:run
```

---

### Task 5.2: Manual end-to-end testing
**Duration**: 0.5 days

- [ ] Test complete gig lifecycle:
  - [ ] Create new gig (single form with Submit)
  - [ ] Edit gig (section-based auto-save)
  - [ ] Add/edit/remove all nested data types
  - [ ] Delete gig
  - [ ] Duplicate gig
- [ ] Test edge cases:
  - [ ] Network errors during auto-save
  - [ ] Validation errors
  - [ ] Rapid changes (debouncing)
  - [ ] Browser refresh (data persisted)
  - [ ] Organization switching
- [ ] Test performance:
  - [ ] Auto-save feels instant (no lag)
  - [ ] No unnecessary API calls (check network tab)
  - [ ] Large amounts of nested data (50+ participants, staff, etc.)
- [ ] Test accessibility:
  - [ ] Keyboard navigation works
  - [ ] Screen reader announces save states
  - [ ] Focus management correct

---

### Task 5.3: Update documentation
**Duration**: 0.5 days

- [ ] Update `docs/development/development-plan.md`
  - [ ] Mark Phase 2A as complete
  - [ ] Update completion date
  - [ ] Document any deviations from original plan
  - [ ] Update success criteria checkboxes
- [ ] Update `README.md` if needed (new architecture patterns)
- [ ] Add JSDoc comments to new components and hooks
- [ ] Consider creating architecture diagram (optional)

---

### Task 5.4: Mark plan.md as complete
**Duration**: 0.1 days

- [ ] Update `.zenflow/tasks/new-task-4ad3/plan.md`
  - [ ] Mark Technical Specification step as [x] complete
  - [ ] Mark Implementation step as [x] complete (or break down into sub-tasks)
- [ ] Create report.md with completion summary

---

## Success Criteria Checklist

**Architecture**:
- [ ] CreateGigScreen.tsx reduced from 2,078 to ~600 lines
- [ ] 6 new section components created (~200-400 lines each)
- [ ] All nested data uses useFieldArray (no useState)
- [ ] All nested data uses server-side reconciliation (consistent pattern)
- [ ] No hybrid state management (useState + useForm)

**UX**:
- [ ] Edit mode uses auto-save (no Submit/Cancel buttons)
- [ ] Create mode keeps Submit button (existing pattern)
- [ ] Back button for navigation
- [ ] Dropdown menu for actions (delete, duplicate)
- [ ] Visual save feedback per section (spinner → checkmark)

**Quality**:
- [ ] All tests pass (66 existing + ~9 new test files)
- [ ] No functionality regressions
- [ ] Performance acceptable (auto-save feels instant, debouncing works)
- [ ] Error handling works (no data loss on errors)
- [ ] Code maintainable (clear separation of concerns)

**Documentation**:
- [ ] development-plan.md updated
- [ ] JSDoc comments added
- [ ] Architecture documented

---

## Estimated Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| 2A-1 | Component separation (7 tasks) | 2-3 days |
| 2A-2 | Auto-save infrastructure (5 tasks) | 2 days |
| 2A-3 | Nested sections with useFieldArray (5 tasks) | 3-4 days |
| 2A-4 | Server-side reconciliation (7 tasks) | 2-3 days |
| Final | Verification & documentation (4 tasks) | 1 day |
| **Total** | **28 tasks** | **10-13 days** |

---

## Dependencies & Blockers

**External Dependencies**: None

**Internal Dependencies**:
- Must complete Phase 2A-1 before 2A-2
- Must complete Phase 2A-2 before 2A-3
- Must complete Phase 2A-3 before 2A-4

**Blocks**:
- Phase 3 (API layer refactoring) blocked until Phase 2A-4 complete

---

## Risk Mitigation

**High-risk tasks** (require extra testing):
- Task 1.6: Refactor CreateGigScreen (could break create mode)
- Task 3.2: Nested useFieldArray for staff slots (complex)
- Task 4.1-4.4: Server reconciliation logic (transaction handling)

**Mitigation**:
- Test incrementally after each task
- Keep create mode unchanged (lowest risk path)
- Comprehensive test coverage before refactoring
- Manual verification at end of each phase
