# Spec and build

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification
<!-- chat-id: b383cfca-8427-4ca6-97f2-099778e8723b -->

**Complexity**: HARD - Large-scale architectural refactoring with high risk

**Outputs**:
- `spec.md`: Comprehensive technical specification
- `implementation-plan.md`: Detailed 28-task breakdown across 4 sub-phases

**Summary**: Refactor monolithic CreateGigScreen (2,078 lines) into modern auto-saving form architecture with section components, useFieldArray, and server-side reconciliation.

---

### [ ] Step: Phase 2A-1 - Component Separation & Navigation
<!-- chat-id: 3869f35a-cc6c-4cc9-aedd-7b7806677c79 -->

**Duration**: 2-3 days  
**Status**: Pending

Create directory structure and break monolithic component into sections.

- [ ] Task 1.1: Create directory and GigHeader component with back button and actions dropdown
- [ ] Task 1.2: Create GigBasicInfoSection stub component (title, dates, status, etc.)
- [ ] Task 1.3: Create GigParticipantsSection stub component
- [ ] Task 1.4: Create GigStaffSlotsSection stub component
- [ ] Task 1.5: Create GigKitAssignmentsSection and GigBidsSection stub components
- [ ] Task 1.6: Refactor CreateGigScreen to use section components in edit mode
- [ ] Task 1.7: Manual verification (create mode unchanged, edit mode with sections, delete/duplicate work)

**Verification**: `npm test` - All tests pass, no regressions

---

### [ ] Step: Phase 2A-2 - Auto-save Infrastructure & Basic Info

**Duration**: 2 days  
**Status**: Pending (depends on 2A-1)

Implement auto-save pattern for basic info section, establish reusable hook.

- [ ] Task 2.1: Create useAutoSave hook with debouncing, state management, error handling
- [ ] Task 2.2: Create SaveStateIndicator component (spinner → checkmark)
- [ ] Task 2.3: Implement auto-save in GigBasicInfoSection (onBlur for text, onChange for selects)
- [ ] Task 2.4: Ensure updateGig API supports partial updates
- [ ] Task 2.5: Manual verification (auto-save works, debouncing, error handling)

**Verification**: `npm test` - Auto-save tests pass, debouncing works

---

### [ ] Step: Phase 2A-3 - Auto-save Nested Sections with useFieldArray

**Duration**: 3-4 days  
**Status**: Pending (depends on 2A-2)

Implement auto-save for all nested sections using react-hook-form's useFieldArray.

- [ ] Task 3.1: Implement auto-save in GigParticipantsSection with useFieldArray
- [ ] Task 3.2: Implement auto-save in GigStaffSlotsSection with nested useFieldArray (slots + assignments)
- [ ] Task 3.3: Implement auto-save in GigBidsSection with useFieldArray
- [ ] Task 3.4: Implement auto-save in GigKitAssignmentsSection with useFieldArray
- [ ] Task 3.5: Manual verification (all sections auto-save, no useState for nested data)

**Verification**: `npm test` - All section tests pass, useFieldArray works

---

### [ ] Step: Phase 2A-4 - Server-side Reconciliation for Nested Data

**Duration**: 2-3 days  
**Status**: Pending (depends on 2A-3)

Standardize all nested data on server-side reconciliation pattern.

- [ ] Task 4.1: Create/update updateGigParticipants API with server reconciliation
- [ ] Task 4.2: Update updateGigStaffSlots API for nested reconciliation (slots + assignments)
- [ ] Task 4.3: Create updateGigBids API with server reconciliation (org-scoped)
- [ ] Task 4.4: Create updateGigKits API with server reconciliation (org-scoped)
- [ ] Task 4.5: Update section components to use new reconciliation APIs
- [ ] Task 4.6: Remove old client-side differential API functions (createGigBid, deleteGigBid, etc.)
- [ ] Task 4.7: Manual verification (reconciliation works, no duplicates, org-scoping, transactions)

**Verification**: `npm test` - All API tests pass, reconciliation works correctly

---

### [ ] Step: Final Verification & Documentation

**Duration**: 1 day  
**Status**: Pending (depends on 2A-4)

Comprehensive testing and documentation updates.

- [ ] Task 5.1: Run full test suite and fix any failures
- [ ] Task 5.2: Manual end-to-end testing (gig lifecycle, edge cases, performance, accessibility)
- [ ] Task 5.3: Update documentation (development-plan.md, JSDoc comments)
- [ ] Task 5.4: Create report.md with completion summary

**Verification**: All 66+ tests pass, no regressions, documentation updated

---

### Success Criteria

**Architecture**:
- [ ] CreateGigScreen reduced from 2,078 to ~600 lines (71% reduction)
- [ ] 6 new section components created (~1,500 lines total)
- [ ] All nested data uses useFieldArray (no useState)
- [ ] All nested data uses server-side reconciliation (consistent pattern)

**UX**:
- [ ] Edit mode uses auto-save (no Submit/Cancel buttons)
- [ ] Create mode keeps Submit button (unchanged)
- [ ] Back button and actions dropdown menu work
- [ ] Visual save feedback per section

**Quality**:
- [ ] All tests pass (66+ tests)
- [ ] No functionality regressions
- [ ] Performance acceptable (auto-save feels instant)
- [ ] Error handling works (no data loss)

---

**See**: `.zenflow/tasks/new-task-4ad3/spec.md` for detailed technical specification  
**See**: `.zenflow/tasks/new-task-4ad3/implementation-plan.md` for full task breakdown (28 tasks)
