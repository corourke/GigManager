# Gig Import Bugs and Gaps - Technical Specification

## Technical Context

- **Language**: TypeScript
- **Framework**: React 18.3.1 + Vite 6.3.5
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest + @testing-library/react
- **UI Components**: Shadcn/ui + Tailwind CSS 4.0
- **CSV Parsing**: PapaParse 5.5.3
- **Date Utilities**: date-fns + custom timezone utilities

## Implementation Approach

### 1. Critical Bug Fixes

#### 1.1 Atomic Import Operations
**Current Issue**: In `src/components/ImportScreen.tsx:133-288`, the import process loops through rows but doesn't track individual success/failure properly. All successful imports remain even if later rows fail, but there's no granular tracking.

**Solution**: 
- Enhance the import results state to track individual row status
- Modify import loop to maintain a detailed log of each row's import attempt
- Update UI to show per-row import status
- Ensure proper error containment per row

#### 1.2 Financial Record Typo Fix
**Location**: `src/services/gig.service.ts:152`
**Issue**: `"Payment Recieved"` → `"Payment Received"`
**Solution**: Simple string replacement in financial record creation

### 2. Data Validation Improvements

#### 2.1 Enhanced Date/Time Processing
**Current**: `src/utils/csvImport.ts:100-121` validates dates but doesn't apply defaults
**Changes**:
- Modify `validateGigRow()` to apply time defaults (`00:00:00`) when time is missing
- Allow dates in both YYYY-MM-DD and MM-DD-YYYY formats in the CSV file
- Apply end date defaults when missing (default to same as start)
- Apply timezone defaults from user context or fallback

#### 2.2 Timezone Management
**Current**: Limited timezone list in `src/utils/csvImport.ts:48-51`
**Changes**:
- Create comprehensive timezone enumeration using `Intl.supportedValuesOf('timeZone')`
- Replace existing timezone list in `src/components/gig/GigBasicInfoSection.tsx:49-57` with full timezone list in src/utils/supabase/constants.ts. (All enumerations should be in this file.)
- Group timezones by region for better UX
- Add timezone fallback logic for user profile (not currently stored in User type)

#### 2.3 Status Validation
**Current**: Text input validation in `src/components/ImportScreen.tsx:610-617`
**Changes**: Replace with select dropdown using `GIG_STATUSES` from `csvImport.ts:47`

### 3. User Experience Improvements

#### 3.1 Enhanced Row Editor
**Location**: `src/components/ImportScreen.tsx:546-678`
**Changes**:
- Replace timezone Input with Select component + timezone options
- Replace status Input with Select component + status options  
- Maintain existing text inputs for other fields
- Add real-time validation feedback
- Put Invalid Rows card above Valid Rows card to ensure visibility. 

#### 3.2 Re-validation Button Fix
**Current**: `src/components/ImportScreen.tsx:554-560` - disabled when any invalid
**Fix**: Change condition to always enable when there are any invalid rows, regardless of their fixed status

#### 3.3 Import Progress Enhancement
**Current**: Basic success/error counting in `ImportResults`
**Changes**: 
- Add per-row status tracking in state
- Show detailed import progress during import
- Maintain history of which rows succeeded/failed

### 4. Error Handling Enhancement

#### 4.1 Individual Row Tracking
**Approach**:
- Extend `ParsedRow` interface to include import status (`pending | importing | success | error`)
- Add `importError` field to track specific import errors
- Modify import loop to update row status in real-time
- Ensure atomicity for imported rows. Imports should be atomic per input row but preserve successful rows from the batch. Nested entities (Venue, Act) should be atomic with the Gig.

#### 4.2 Improved Error Messages
**Enhancement Areas**:
- Date parsing: Provide format examples and suggestions
- Timezone validation: Show valid timezone options
- Organization creation: Better error context
- Database constraints: User-friendly constraint violation messages

## Source Code Structure Changes

### New Types/Interfaces
```typescript
// Extend ParsedRow interface
interface EnhancedParsedRow<T> extends ParsedRow<T> {
  importStatus: 'pending' | 'importing' | 'success' | 'error';
  importError?: string;
}

// Enhanced timezone definition
interface TimezoneOption {
  value: string; // IANA identifier
  label: string; // Display name
  region: string; // Grouping
}
```

### Modified Files

1. **`src/utils/csvImport.ts`**
   - Expand `TIMEZONES` to comprehensive list
   - Modify `validateGigRow()` for default value application
   - Add timezone grouping utilities
2. **`src/components/ImportScreen.tsx`**
   - Replace text inputs with Select components for status/timezone
   - Enhance state management for per-row tracking
   - Improve re-validation button logic
   - Add detailed import progress display
3. **`src/services/gig.service.ts`**
   - Fix typo on line 152
4. **`src/components/gig/GigBasicInfoSection.tsx`** 
   - Remove temporary timezone list
5. **`src/utils/supabase/constants.ts`** 
   - Add comprehensive timezone list

### New Files
1. **`src/utils/timezones.ts`**
   - New timezone utility functions

### New Utility Functions
```typescript
// src/utils/timezones.ts (new file)
export function getAllTimezones(): TimezoneOption[]
export function getTimezonesByRegion(): Record<string, TimezoneOption[]>
export function getDefaultTimezone(): string

// src/utils/csvImport.ts (additions)
export function applyGigRowDefaults(row: GigRow, userTimezone?: string): GigRow
export function parseTimeComponent(dateStr: string): string
```

## Data Model/API Changes

- Add `timezone` column to `users` table. A new migration will be necessary.
- Note that the user must apply the migration to the remote database before testing and deployment.

## Delivery Phases

### Phase 1: Critical Fixes (High Priority)
1. Fix financial record typo
2. Implement atomic row-level import tracking
3. Fix re-validation button logic

### Phase 2: Validation Enhancements
1. Add comprehensive timezone enumeration
2. Implement date/time/timezone defaults
3. Replace text inputs with dropdowns for status/timezone

### Phase 3: UX Polish
1. Enhanced error messages
2. Real-time import progress
3. Improved validation feedback

## Verification Approach

### Testing Strategy
1. **Unit Tests**: Add tests for new validation functions and default application
2. **Integration Tests**: Test import flow with various CSV scenarios
3. **Manual Testing**: Verify UI improvements and error handling

### Test Cases
- CSV with missing time components
- CSV with invalid/missing timezones
- CSV with invalid statuses
- Mixed valid/invalid rows
- Import failure scenarios
- Re-validation workflows

### Lint/Build Commands
```bash
npm run lint      # ESLint validation
npm run typecheck # TypeScript checking  
npm test          # Run test suite
npm run build     # Production build
```

## Dependencies

No new dependencies required. All functionality can be implemented with existing libraries:
- `Intl.supportedValuesOf()` for timezone enumeration (built-in)
- Existing `Select` components from Shadcn/ui
- Current PapaParse and date utilities