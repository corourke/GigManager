# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 5a7a23f1-bb4e-4811-a84a-67ed21e5c1e2 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 0d67ce01-62a9-4970-8d47-907f19df5781 -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: 4532e558-0c42-4992-91db-f07f2bdb980e -->

Created detailed implementation plan based on `{@artifacts_path}/spec.md`.

The work has been broken down into 18 concrete tasks organized in 3 phases:

**Phase 1: Critical Bug Fixes (5 tasks)**
- Fix typo in financial record creation  
- Implement individual row import tracking
- Modify import loop for per-row atomicity
- Fix re-validation button logic
- Improve UI layout (Invalid Rows card visibility)

**Phase 2: Validation Enhancements (7 tasks)** 
- Create comprehensive timezone enumeration
- Build timezone utility functions
- Add date/time defaults and multiple formats support
- Create user timezone database migration  
- Replace text inputs with Select dropdowns
- Clean up temporary timezone lists

**Phase 3: UX Improvements (3 tasks)**
- Enhanced import progress display
- Improved error messages
- Real-time validation feedback

**Testing & Verification (3 tasks)**
- Unit tests for new validation logic
- Integration tests for import scenarios  
- Code quality verification (lint/typecheck/build)

### [x] Step: Phase 1 - Critical Bug Fixes
<!-- chat-id: 05c4bdf9-d6d5-45c2-9964-23be987cbbe1 -->

#### [ ] Fix Financial Record Typo
**File**: `src/services/gig.service.ts:152`
**Task**: Replace `"Payment Recieved"` with `"Payment Received"`
**Verification**: Search codebase for remaining typos

#### [ ] Implement Individual Row Import Tracking  
**Files**: `src/utils/csvImport.ts`, `src/components/ImportScreen.tsx`
**Task**: 
- Extend `ParsedRow` interface with `importStatus` and `importError` fields
- Add types for import status tracking
**Verification**: TypeScript compilation passes

#### [ ] Modify Import Loop for Per-Row Atomicity
**File**: `src/components/ImportScreen.tsx:133-288`
**Task**:
- Update import state management to track per-row status
- Modify import loop to update row status in real-time  
- Ensure individual row failures don't affect other rows
- Preserve successful imports when retrying failed rows
**Verification**: Manual testing with mixed valid/invalid CSV data

#### [ ] Fix Re-validation Button Logic
**File**: `src/components/ImportScreen.tsx:554-560`  
**Task**: Change button condition to enable when any invalid rows exist
**Verification**: Button enables correctly during validation workflow

#### [ ] Move Invalid Rows Card Above Valid Rows
**File**: `src/components/ImportScreen.tsx`
**Task**: Reorder card display for better user visibility
**Verification**: Visual inspection of UI layout

### [ ] Step: Phase 2 - Validation Enhancements

#### [ ] Create Comprehensive Timezone List
**File**: `src/utils/supabase/constants.ts`
**Task**: Add complete timezone enumeration using `Intl.supportedValuesOf('timeZone')`
**Verification**: Timezone list includes all standard IANA identifiers

#### [ ] Build Timezone Utility Functions
**File**: `src/utils/timezones.ts` (new)
**Task**: 
- Create `getAllTimezones()` function
- Create `getTimezonesByRegion()` for grouped display
- Create `getDefaultTimezone()` with user fallback logic
**Verification**: Unit tests for timezone utilities

#### [ ] Add Date/Time Defaults and Multiple Formats
**File**: `src/utils/csvImport.ts:100-121` 
**Task**:
- Add `applyGigRowDefaults()` function for time/end date defaults
- Support both YYYY-MM-DD and MM-DD-YYYY date formats
- Apply timezone defaults from user context
**Verification**: Unit tests for date parsing and defaults

#### [ ] Create User Timezone Migration and API Updates
**Files**: 
- `supabase/migrations/{timestamp}_add_user_timezone.sql` (new migration)
- `src/services/user.service.ts` (update updateUserProfile function)  
- `src/utils/supabase/types.tsx` (update User interface)
**Task**: 
- Create migration to add `timezone` column (VARCHAR, nullable, default NULL) to `users` table
- Update `updateUserProfile()` function to include timezone in updates parameter 
- Add `timezone?: string` to User interface type definition
- Update any RPC functions that return user data to include timezone field
**Verification**: 
- Migration applies successfully to database
- TypeScript compilation passes 
- User profile updates include timezone field

#### [ ] Replace Text Inputs with Select Dropdowns
**File**: `src/components/ImportScreen.tsx:546-678`
**Task**:
- Replace timezone Input with Select + timezone options
- Replace status Input with Select + GIG_STATUSES options
- Maintain existing functionality for other fields
**Verification**: Dropdowns populated correctly, validation works

#### [ ] Clean Up Temporary Timezone Lists  
**Files**: 
- `src/components/gig/GigBasicInfoSection.tsx:49-57` (remove TIMEZONES constant)
- `src/utils/csvImport.ts:48-51` (remove TIMEZONES array)
**Task**: 
- Remove hardcoded `TIMEZONES` constant from GigBasicInfoSection.tsx
- Remove hardcoded `TIMEZONES` array from csvImport.ts
- Update components to import timezone data from constants/utilities
- Update all references to use centralized timezone functions
**Verification**: 
- No duplicate timezone definitions in codebase
- All components use centralized timezone data
- TypeScript compilation passes

### [ ] Step: Phase 3 - UX Improvements

#### [ ] Enhanced Import Progress Display
**File**: `src/components/ImportScreen.tsx`
**Task**:
- Show per-row import status during import process
- Add detailed progress tracking in UI
- Update ImportResults component for better feedback
**Verification**: Progress accurately reflects import state

#### [ ] Improved Error Messages
**Files**: `src/utils/csvImport.ts`, `src/components/ImportScreen.tsx`
**Task**: 
- Better date parsing error messages with format examples
- Clear timezone validation feedback  
- User-friendly database constraint error handling
**Verification**: Error messages provide actionable guidance

#### [ ] Real-time Validation Feedback
**File**: `src/components/ImportScreen.tsx`
**Task**: Add immediate validation feedback in row editor
**Verification**: Validation updates as user types/selects

### [ ] Step: Testing & Verification

#### [ ] Unit Tests for Validation Logic
**Files**: 
- `src/utils/timezones.test.ts` (new - test timezone utilities)
- `src/utils/csvImport.test.ts` (new/update - test validation with defaults)
- `src/utils/dateUtils.test.ts` (update - test multiple date formats)
**Task**: 
- Test `getAllTimezones()`, `getTimezonesByRegion()`, `getDefaultTimezone()` functions
- Test `applyGigRowDefaults()` with various input scenarios
- Test date parsing for both YYYY-MM-DD and MM-DD-YYYY formats
- Test validation with missing time/timezone/end date scenarios
- Target >80% code coverage for new/modified utility functions
**Verification**: 
- `npm test` passes with no failures
- Coverage reports show >80% for new validation logic
- All edge cases covered (missing data, invalid formats, etc.)

#### [ ] Integration Tests for Import Flow  
**Files**: 
- `src/components/ImportScreen.test.tsx` (new/update)
- `src/test/import-flow.integration.test.ts` (new)
**Task**: 
- Test complete CSV import workflow with mixed valid/invalid data
- Test row editor functionality with timezone/status dropdowns
- Test re-validation flow and button states
- Test import progress tracking and per-row status updates
- Test error handling and recovery workflows
- Include test CSV files with various edge cases
**Verification**: 
- End-to-end import workflows work correctly
- All user interaction scenarios tested
- Import atomicity verified (partial failures preserve successful rows)

#### [ ] Code Quality Verification
**Task**: Run all verification commands
**Commands**:
```bash
npm run lint      # ESLint validation
npm run typecheck # TypeScript checking  
npm test          # Run test suite
npm run build     # Production build
```
**Verification**: All commands pass without errors
