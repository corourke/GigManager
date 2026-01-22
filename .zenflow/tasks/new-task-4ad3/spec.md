# Technical Specification: Phase 2A - Modern Form Architecture with Auto-save

## Task Complexity: **HARD**

**Rationale**: 
- Large-scale architectural refactoring of 2,078-line monolithic component
- Introducing new patterns (auto-save, useFieldArray) across the codebase
- Server-side reconciliation logic requiring careful transaction handling
- High risk of breaking existing functionality
- Multi-phase implementation with dependencies

---

## Overview

Refactor the monolithic `CreateGigScreen.tsx` (2,078 lines) into a modern auto-saving form architecture. Replace Submit/Cancel button pattern in edit mode with section-based auto-save similar to Linear, Notion, Airtable, and Asana.

**Current Problems**:
1. **Monolithic Component**: Single 2,078-line file is unmaintainable
2. **Hybrid State Management**: Form fields in react-hook-form, nested data in useState
3. **Poor UX**: Can't save partial progress, must scroll to find Submit button
4. **Inconsistent Save Patterns**: 4 different approaches for nested data (participants, staff, bids, kits)
5. **No Change Detection**: Submit button always enabled in edit mode (interim fix from Phase 2)
6. **Hard to Test**: All logic concentrated in one massive component

**Target Architecture**:
- **Create mode**: Keep existing single form with Submit button (works fine)
- **Edit mode**: Break into auto-saving sections with back button and actions dropdown menu

---

## Technical Context

### Language & Framework
- **Language**: TypeScript
- **Framework**: React 18
- **Forms**: react-hook-form v7 with zod validation
- **State Management**: React hooks (useState, useEffect, useForm, useFieldArray)
- **Backend**: Supabase PostgreSQL with RLS policies
- **UI Components**: Radix UI (shadcn/ui)

### Dependencies
**Existing**:
- `react-hook-form`: Already used for basic form fields
- `zod`: Already used for validation
- `@hookform/resolvers`: Already integrated
- `lucide-react`: Icon library
- `sonner`: Toast notifications
- `date-fns`: Date formatting

**No new dependencies required** - using existing packages

### Current Implementation

**File**: `src/components/CreateGigScreen.tsx` (2,078 lines)

**Form Architecture**:
```typescript
// Basic fields: react-hook-form
const form = useForm<FormData>({
  resolver: zodResolver(gigSchema),
  defaultValues: { ... }
});

// Nested data: useState (hybrid approach - problematic)
const [participants, setParticipants] = useState<ParticipantData[]>([]);
const [staffSlots, setStaffSlots] = useState<StaffSlotData[]>([]);
const [bids, setBids] = useState<BidData[]>([]);
const [kitAssignments, setKitAssignments] = useState<KitData[]>([]);
```

**Nested Data Save Patterns** (inconsistent):
1. **Participants**: Server-side reconciliation via `updateGig(gigId, { participants })`
2. **Staff slots**: Server-side reconciliation via `updateGigStaffSlots(gigId, staffSlots)`
3. **Bids**: Client-side differential (individual `createGigBid()`, `updateGigBid()`, `deleteGigBid()` calls)
4. **Kit assignments**: Client-side differential (individual `assignKitToGig()`, `removeKitFromGig()` calls)

**API Functions** (`src/utils/api.tsx`):
- `getGig(gigId)`: Fetches gig with all nested data
- `createGig(gigData)`: Creates new gig
- `updateGig(gigId, updates)`: Updates basic gig fields and participants
- `deleteGig(gigId)`: Deletes gig
- `updateGigStaffSlots(gigId, staffSlots)`: Server reconciliation for staff
- `createGigBid()`, `updateGigBid()`, `deleteGigBid()`: Client-side differential
- `assignKitToGig()`, `removeKitFromGig()`, `updateGigKitAssignment()`: Client-side differential

---

## Implementation Approach

### Phase 2A-1: Component Separation & Navigation (2-3 days)

**Goal**: Break monolithic component into separate section components, add modern navigation

**New Components**:
1. `src/components/gig/GigHeader.tsx` (~100 lines)
   - Back button (navigates to gig list)
   - Actions dropdown menu (Delete, Duplicate)
   - Uses shadcn/ui DropdownMenu component

2. `src/components/gig/GigBasicInfoSection.tsx` (~200 lines)
   - Title, dates, timezone, status, tags, notes, amount
   - Uses existing form components (Input, Textarea, Select, etc.)
   - Initial stub: renders existing UI, no auto-save yet

3. `src/components/gig/GigParticipantsSection.tsx` (~300 lines)
   - Organization participants with roles
   - Initial stub: renders existing UI, no auto-save yet

4. `src/components/gig/GigStaffSlotsSection.tsx` (~400 lines)
   - Staff roles, counts, assignments
   - Initial stub: renders existing UI, no auto-save yet

5. `src/components/gig/GigKitAssignmentsSection.tsx` (~250 lines)
   - Kit assignments
   - Initial stub: renders existing UI, no auto-save yet

6. `src/components/gig/GigBidsSection.tsx` (~250 lines)
   - Organization bids
   - Initial stub: renders existing UI, no auto-save yet

**CreateGigScreen Changes**:
```typescript
// Create mode: Keep existing single form (no changes)
if (!gigId) {
  return <SingleFormWithSubmit />; // Existing implementation
}

// Edit mode: New section-based layout
return (
  <div>
    <GigHeader gigId={gigId} onBack={onCancel} onDelete={handleDelete} onDuplicate={handleDuplicate} />
    <GigBasicInfoSection gigId={gigId} />
    <GigParticipantsSection gigId={gigId} />
    <GigStaffSlotsSection gigId={gigId} />
    <GigKitAssignmentsSection gigId={gigId} />
    <GigBidsSection gigId={gigId} />
  </div>
);
```

**Verification**:
- Create mode: Unchanged, single form with Submit button
- Edit mode: Section-based layout with back button and dropdown menu
- Delete and Duplicate actions work
- No functionality regressions
- All tests pass

---

### Phase 2A-2: Auto-save Infrastructure & Basic Info Section (2 days)

**Goal**: Implement auto-save pattern for GigBasicInfoSection, establish reusable pattern

**New Hook**: `src/utils/hooks/useAutoSave.ts` (~150 lines)
```typescript
interface UseAutoSaveOptions<T> {
  gigId: string;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number; // Default 500ms
}

interface UseAutoSaveReturn {
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  error: Error | null;
  triggerSave: () => Promise<void>;
}

export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  // Debounced auto-save logic
  // State management (idle → saving → saved/error)
  // Error handling with retry
  // Returns save state for UI feedback
}
```

**GigBasicInfoSection Changes**:
```typescript
function GigBasicInfoSection({ gigId }: { gigId: string }) {
  const form = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
  });

  const { saveState, triggerSave } = useAutoSave({
    gigId,
    onSave: async (data) => {
      await updateGig(gigId, data);
    },
    debounceMs: 500,
  });

  // Auto-save on blur for text fields
  const handleBlur = () => {
    if (form.formState.isDirty) {
      triggerSave();
    }
  };

  // Auto-save on change for selects/dates
  const handleChange = () => {
    if (form.formState.isDirty) {
      triggerSave();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>Basic Information</CardTitle>
          <SaveStateIndicator state={saveState} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Form fields */}
      </CardContent>
    </Card>
  );
}
```

**Visual Feedback Component**: `src/components/gig/SaveStateIndicator.tsx` (~50 lines)
```typescript
function SaveStateIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'saving') return <Loader2 className="h-4 w-4 animate-spin" />;
  if (state === 'saved') return <Check className="h-4 w-4 text-green-500" />;
  if (state === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
  return null;
}
```

**API Changes**:
- Ensure `updateGig()` accepts partial updates (already implemented via `createSubmissionPayload`)

**Verification**:
- Basic info auto-saves on blur/change
- Debouncing works (500ms delay)
- Save state indicator shows correctly
- Errors handled gracefully (toast notification)
- No data loss on errors
- Tests pass

---

### Phase 2A-3: Auto-save Nested Sections with useFieldArray (3-4 days)

**Goal**: Implement auto-save for all nested sections using react-hook-form's useFieldArray

**Pattern** (applied to all 4 nested sections):
```typescript
function GigParticipantsSection({ gigId }: { gigId: string }) {
  const form = useForm({
    defaultValues: { participants: [] }
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "participants"
  });

  const { saveState, triggerSave } = useAutoSave({
    gigId,
    onSave: async (data) => {
      await updateGigParticipants(gigId, data.participants); // Server reconciles
    },
  });

  // Auto-save on add/remove/edit
  const handleAddParticipant = () => {
    append({ id: `temp-${Date.now()}`, ... });
    triggerSave();
  };

  const handleRemoveParticipant = (index: number) => {
    remove(index);
    triggerSave();
  };

  const handleUpdateParticipant = (index: number, data: Partial<ParticipantData>) => {
    update(index, { ...fields[index], ...data });
    triggerSave();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>Participants</CardTitle>
          <SaveStateIndicator state={saveState} />
        </div>
      </CardHeader>
      <CardContent>
        {fields.map((field, index) => (
          <ParticipantRow 
            key={field.id}
            participant={field}
            onUpdate={(data) => handleUpdateParticipant(index, data)}
            onRemove={() => handleRemoveParticipant(index)}
          />
        ))}
        <Button onClick={handleAddParticipant}>Add Participant</Button>
      </CardContent>
    </Card>
  );
}
```

**Sections to Implement**:
1. **GigParticipantsSection**: Organization participants with roles
2. **GigStaffSlotsSection**: Staff roles with nested assignments (nested useFieldArray)
3. **GigBidsSection**: Organization bids
4. **GigKitAssignmentsSection**: Kit assignments

**Verification**:
- All sections use useFieldArray (no useState for nested data)
- Auto-save triggers on add/remove/edit
- Save state shows per section
- Validation works (zod schemas)
- No data loss on errors
- Tests pass

---

### Phase 2A-4: Server-side Reconciliation for Nested Data (2-3 days)

**Goal**: Standardize all nested data on server-side reconciliation pattern

**Decision**: Use server-side reconciliation for ALL nested data (consistent with participants and staff slots)

**Why**:
- Simpler client code (just send current state)
- Atomic updates (transaction-based, all-or-nothing)
- Easier to reason about
- Works naturally with useFieldArray + auto-save
- Consistent pattern across all sections

**API Changes**:

1. **Create/Update** `updateGigParticipants()` (may already exist):
```typescript
export async function updateGigParticipants(gigId: string, participants: ParticipantData[]) {
  const supabase = getSupabase();
  
  // Start transaction
  const { data: existingParticipants } = await supabase
    .from('gig_participants')
    .select('*')
    .eq('gig_id', gigId);

  // Reconcile: identify new, updated, deleted
  const toAdd = participants.filter(p => !p.id || p.id.startsWith('temp-'));
  const toUpdate = participants.filter(p => p.id && !p.id.startsWith('temp-'));
  const toDelete = existingParticipants.filter(ep => 
    !participants.some(p => p.id === ep.id)
  );

  // Execute in transaction
  // 1. Delete removed
  if (toDelete.length > 0) {
    await supabase.from('gig_participants').delete().in('id', toDelete.map(p => p.id));
  }
  
  // 2. Update existing
  for (const participant of toUpdate) {
    await supabase.from('gig_participants').update(participant).eq('id', participant.id);
  }
  
  // 3. Insert new
  if (toAdd.length > 0) {
    await supabase.from('gig_participants').insert(
      toAdd.map(p => ({ ...p, id: undefined, gig_id: gigId }))
    );
  }
}
```

2. **Update** `updateGigStaffSlots()`: Already uses server reconciliation, ensure it handles nested assignments

3. **Create** `updateGigBids()`: Replace client-side differential with server reconciliation
```typescript
export async function updateGigBids(
  gigId: string, 
  organizationId: string, 
  bids: BidData[]
) {
  // Similar reconciliation logic
  // Filter to organization-scoped bids only
}
```

4. **Create** `updateGigKits()`: Replace client-side differential with server reconciliation
```typescript
export async function updateGigKits(
  gigId: string, 
  organizationId: string, 
  kits: KitData[]
) {
  // Similar reconciliation logic
  // Filter to organization-scoped kits only
}
```

**Remove Old Functions**:
- `createGigBid()`, `updateGigBid()`, `deleteGigBid()` - replaced by `updateGigBids()`
- `assignKitToGig()`, `removeKitFromGig()` - replaced by `updateGigKits()`

**Verification**:
- All nested data saves correctly
- Reconciliation handles add/update/delete in single transaction
- Org-scoped data filtered correctly (bids, kits)
- No duplicate data created
- Performance acceptable (reconciliation not too slow)
- All tests pass

---

## Source Code Structure Changes

### New Files Created

**Components** (~1,500 lines total):
- `src/components/gig/GigHeader.tsx` (~100 lines)
- `src/components/gig/GigBasicInfoSection.tsx` (~200 lines)
- `src/components/gig/GigParticipantsSection.tsx` (~300 lines)
- `src/components/gig/GigStaffSlotsSection.tsx` (~400 lines)
- `src/components/gig/GigKitAssignmentsSection.tsx` (~250 lines)
- `src/components/gig/GigBidsSection.tsx` (~250 lines)
- `src/components/gig/SaveStateIndicator.tsx` (~50 lines)

**Hooks** (~150 lines):
- `src/utils/hooks/useAutoSave.ts` (~150 lines)

**Tests** (~500 lines):
- `src/components/gig/GigHeader.test.tsx` (~50 lines)
- `src/components/gig/GigBasicInfoSection.test.tsx` (~100 lines)
- `src/components/gig/GigParticipantsSection.test.tsx` (~100 lines)
- `src/components/gig/GigStaffSlotsSection.test.tsx` (~100 lines)
- `src/components/gig/GigKitAssignmentsSection.test.tsx` (~75 lines)
- `src/components/gig/GigBidsSection.test.tsx` (~75 lines)
- `src/utils/hooks/useAutoSave.test.ts` (~100 lines)

### Modified Files

**Major Refactor**:
- `src/components/CreateGigScreen.tsx`: 2,078 lines → ~600 lines (71% reduction)
  - Create mode: Keep existing implementation (~300 lines)
  - Edit mode: Use section components (~300 lines)
  - Remove all nested data state management (useState)
  - Remove hybrid form/state management code

**API Changes**:
- `src/utils/api.tsx`: Add/modify ~300 lines
  - Add `updateGigParticipants()` (~75 lines)
  - Modify `updateGigStaffSlots()` to ensure nested assignments (~25 lines)
  - Add `updateGigBids()` (~75 lines)
  - Add `updateGigKits()` (~75 lines)
  - Remove `createGigBid()`, `updateGigBid()`, `deleteGigBid()` (~50 lines)
  - Remove `assignKitToGig()`, `removeKitFromGig()` (~50 lines)
  - Net change: +200 lines (but more maintainable)

**Test Updates**:
- `src/components/CreateGigScreen.test.tsx`: Update to test new architecture (~50 lines changes)

### Directory Structure
```
src/
├── components/
│   ├── gig/                              # NEW: Gig-specific components
│   │   ├── GigHeader.tsx
│   │   ├── GigHeader.test.tsx
│   │   ├── GigBasicInfoSection.tsx
│   │   ├── GigBasicInfoSection.test.tsx
│   │   ├── GigParticipantsSection.tsx
│   │   ├── GigParticipantsSection.test.tsx
│   │   ├── GigStaffSlotsSection.tsx
│   │   ├── GigStaffSlotsSection.test.tsx
│   │   ├── GigKitAssignmentsSection.tsx
│   │   ├── GigKitAssignmentsSection.test.tsx
│   │   ├── GigBidsSection.tsx
│   │   ├── GigBidsSection.test.tsx
│   │   └── SaveStateIndicator.tsx
│   ├── CreateGigScreen.tsx               # MODIFIED: Reduced from 2,078 to ~600 lines
│   └── CreateGigScreen.test.tsx          # MODIFIED: Updated tests
├── utils/
│   ├── hooks/
│   │   ├── useAutoSave.ts                # NEW: Auto-save hook
│   │   └── useAutoSave.test.ts           # NEW: Tests
│   └── api.tsx                           # MODIFIED: +200 lines (reconciliation APIs)
```

---

## Data Model / API / Interface Changes

### Database Schema
**No schema changes required** - existing schema supports all operations

### API Function Changes

**Added Functions**:
- `updateGigParticipants(gigId: string, participants: ParticipantData[])`: Server reconciliation
- `updateGigBids(gigId: string, orgId: string, bids: BidData[])`: Server reconciliation (org-scoped)
- `updateGigKits(gigId: string, orgId: string, kits: KitData[])`: Server reconciliation (org-scoped)

**Modified Functions**:
- `updateGigStaffSlots(gigId: string, staffSlots: StaffSlotData[])`: Ensure nested assignments work

**Removed Functions**:
- `createGigBid()`, `updateGigBid()`, `deleteGigBid()`: Replaced by `updateGigBids()`
- `assignKitToGig()`, `removeKitFromGig()`: Replaced by `updateGigKits()`

### Component Interfaces

**New Props**:
```typescript
interface GigHeaderProps {
  gigId: string;
  onBack: () => void;
  onDelete: () => void;
  onDuplicate: (newGigId: string) => void;
}

interface GigSectionProps {
  gigId: string;
}
```

**Updated Props**:
```typescript
// CreateGigScreen: No changes to external API
interface CreateGigScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  gigId?: string | null;
  onCancel: () => void;
  onGigCreated: (gigId: string) => void;
  onGigUpdated?: () => void;
  onGigDeleted?: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}
```

---

## Verification Approach

### Test Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test CreateGigScreen.test.tsx

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:run
```

### Testing Strategy

**Unit Tests** (per component/hook):
- `GigHeader.test.tsx`: Test back button, delete, duplicate actions
- `GigBasicInfoSection.test.tsx`: Test auto-save, validation, error handling
- `GigParticipantsSection.test.tsx`: Test add/remove/edit, auto-save
- `GigStaffSlotsSection.test.tsx`: Test nested useFieldArray, auto-save
- `GigKitAssignmentsSection.test.tsx`: Test kit assignments, auto-save
- `GigBidsSection.test.tsx`: Test bids, auto-save
- `useAutoSave.test.ts`: Test debouncing, save states, error handling

**Integration Tests**:
- `CreateGigScreen.test.tsx`: Test create mode, edit mode, section integration
- API reconciliation tests in `api.test.ts`

**Manual Testing Checklist**:
- [ ] Create mode: Single form with Submit button works
- [ ] Edit mode: Section layout with auto-save works
- [ ] Back button navigates correctly
- [ ] Delete action shows confirmation, deletes, navigates back
- [ ] Duplicate action creates new gig, navigates to it
- [ ] Auto-save shows correct states (idle → saving → saved)
- [ ] Debouncing works (doesn't spam API)
- [ ] Validation errors show correctly
- [ ] Network errors handled gracefully (toast, no data loss)
- [ ] All nested data saves correctly (participants, staff, bids, kits)
- [ ] Org-scoped data filtered correctly (bids, kits)
- [ ] No duplicate data created
- [ ] Performance acceptable (no lag on typing, saving)

### Regression Testing
- [ ] Run full test suite: `npm test`
- [ ] Test all gig CRUD operations (create, read, update, delete)
- [ ] Test all nested data operations (add, edit, remove)
- [ ] Test organization switching
- [ ] Test user permissions (viewer, editor, admin)
- [ ] Test error scenarios (network errors, validation errors)

---

## Success Criteria

### Architecture
- [x] CreateGigScreen broken into components (<500 lines each)
- [ ] All nested data uses useFieldArray (no useState)
- [ ] All nested data uses server-side reconciliation (consistent pattern)
- [ ] No hybrid state management (useState + useForm)

### UX
- [ ] Edit mode uses auto-save (no Submit/Cancel buttons)
- [ ] Create mode keeps Submit button (existing pattern)
- [ ] Back button for navigation
- [ ] Dropdown menu for actions (delete, duplicate)
- [ ] Visual save feedback per section

### Quality
- [ ] All tests pass (existing + new)
- [ ] No functionality regressions
- [ ] Performance acceptable (auto-save feels instant)
- [ ] Error handling works (no data loss)
- [ ] Code maintainable (clear separation of concerns)

---

## Risks & Mitigation

### High Risks

**Risk**: Breaking existing functionality during refactor
- **Mitigation**: Implement incrementally (4 sub-phases), test after each phase
- **Mitigation**: Keep create mode unchanged (lowest risk)
- **Mitigation**: Comprehensive test coverage before refactoring

**Risk**: Data loss during auto-save errors
- **Mitigation**: Optimistic updates (show in UI immediately)
- **Mitigation**: Error toasts with retry option
- **Mitigation**: Don't clear form data on save errors
- **Mitigation**: Transaction-based reconciliation (all-or-nothing)

**Risk**: Performance issues with auto-save (too many API calls)
- **Mitigation**: Debouncing (500ms delay)
- **Mitigation**: Only save on actual changes (form.formState.isDirty)
- **Mitigation**: Server-side reconciliation in single transaction

### Medium Risks

**Risk**: Inconsistent save states across sections
- **Mitigation**: Centralized `useAutoSave` hook
- **Mitigation**: Consistent state management pattern
- **Mitigation**: Visual feedback per section

**Risk**: Complex nested data reconciliation bugs
- **Mitigation**: Comprehensive tests for reconciliation logic
- **Mitigation**: Transaction-based updates (rollback on error)
- **Mitigation**: Thorough manual testing

---

## Timeline Estimate

**Phase 2A-1**: 2-3 days (component separation)
**Phase 2A-2**: 2 days (auto-save infrastructure)
**Phase 2A-3**: 3-4 days (nested sections with useFieldArray)
**Phase 2A-4**: 2-3 days (server-side reconciliation)

**Total**: 9-12 days (2-3 weeks)

**Priority**: High - Blocks maintainability improvements and modern UX

---

## Follow-up Tasks

**After Phase 2A Completes**:
1. **Phase 3**: API layer refactoring (generic CRUD operations)
2. **Phase 4**: React Router migration (URL-based navigation)
3. **Apply pattern to CreateKitScreen**: Similar nested data (kitAssets section)

**Documentation Updates**:
- Update `docs/development/development-plan.md` with completion status
- Document auto-save pattern in new architecture guide
- Update component documentation with new structure

---

## Dependencies

**External Dependencies**: None (using existing packages)

**Internal Dependencies**:
- Phase 2A-1 must complete before 2A-2
- Phase 2A-2 must complete before 2A-3
- Phase 2A-3 must complete before 2A-4
- Must complete all of Phase 2A before starting Phase 3 (API refactoring)

**Blocking**: Phase 3 (API layer refactoring) depends on Phase 2A-4 completion
