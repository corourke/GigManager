# Gig Import Bugs and Gaps - Requirements Document

## Overview
This document outlines requirements to fix critical bugs and improve functionality in the CSV Gig Import feature, focusing exclusively on gig imports (not assets).

## Core Requirements

### 1. Critical Bug Fixes

#### 1.1 Atomic Import Operations
- **Requirement**: Ensure gig imports are fully atomic - if any row fails during import, previously imported rows from the same batch should remain imported
- **Current Issue**: Import processes all valid rows but doesn't track which specific rows succeeded/failed
- **Fix**: Implement individual row import tracking with proper error handling

#### 1.2 Financial Record Creation Fix
- **Requirement**: Fix typo in financial record creation
- **Current Issue**: `"Payment Recieved"` should be `"Payment Received"`
- **Location**: `gig.service.ts:152`

### 2. Data Validation Improvements

#### 2.1 Default Time Handling
- **Requirement**: If no time is supplied with start/end date, assume time is 00:00:00
- **Example**: `"2024-07-15"` → `"2024-07-15T00:00:00"`
- **Implementation**: Update validation logic in `csvImport.ts`

#### 2.2 End Date/Time Defaults
- **Requirement**: If no end date/time is supplied, set it to be the same as start date/time
- **Example**: start: `"2024-07-15T18:00:00"`, end: empty → end: `"2024-07-15T18:00:00"`

#### 2.3 Timezone Defaults and Validation
- **Requirement**: If no timezone is supplied, default to user profile timezone
- **Requirement**: Create enumeration of all available timezones for validation
- **Requirement**: Implement timezone dropdown in row editor
- **Note**: Need to access user profile timezone from context/service

#### 2.4 Status Validation Enhancement
- **Requirement**: Make status field a select dropdown in row editor instead of text input
- **Options**: `['DateHold', 'Proposed', 'Booked', 'Completed', 'Cancelled', 'Settled']`

#### 2.5 Allow Multiple Date Formats

* **Requirement**: Allow dates in both YYYY-MM-DD and MM-DD-YYYY formats in the CSV file

### 3. User Experience Improvements

#### 3.1 Enhanced Row Editor
- **Requirement**: Replace timezone text input with select dropdown showing all valid timezones
- **Requirement**: Replace status text input with select dropdown showing valid statuses
- **Requirement**: Keep other fields as text inputs with improved validation

#### 3.2 Re-validation Button Fix
- **Requirement**: Re-enable and fix the 'Re-validate Fixed Rows' button functionality
- **Current Issue**: Button is disabled when all rows are invalid, but should allow continuous fixing attempts
- **Fix**: Always enable button when there are invalid rows, regardless of their current validation state

#### 3.3 Import Progress Tracking
- **Requirement**: Maintain accurate tally of:
  - Total rows processed
  - Rows successfully imported
  - Rows failed to import
  - Clear error messages for each failed row

### 4. Error Handling Enhancement

#### 4.1 Individual Row Error Tracking
- **Requirement**: Track import success/failure at individual row level
- **Requirement**: Allow users to fix failed rows and re-attempt import for those specific rows
- **Requirement**: Preserve successful imports when retrying failed rows

#### 4.2 Improved Error Messages
- **Requirement**: Provide clear, actionable error messages for:
  - Date/time parsing issues
  - Timezone validation failures
  - Status validation failures
  - Organization creation failures
  - Database constraint violations

## Technical Implementation Notes

### Data Flow Changes
1. **Validation Phase**: 
   - Apply default values (timezone, end date, time components)
   - Validate against enhanced rules
   - Show validation results in UI

2. **Import Phase**:
   - Process rows individually with error containment
   - Track success/failure per row
   - Update UI with real-time progress

3. **Post-Import Phase**:
   - Allow fixing of failed rows
   - Re-validate and re-import specific rows
   - Maintain state of previously successful imports

### User Profile Integration
- Need to add timezone field to User profile (requires updates to database, APIs and UI)
- Need to access user profile timezone from authentication context
- Default timezone fallback if user profile timezone not available
- Use standard IANA timezone identifiers

### Timezone Enumeration
Create comprehensive list of valid timezones for dropdown:
- All standard IANA timezone identifiers
- Group by region for better UX (Americas, Europe, Asia, etc.)
- Include common aliases/descriptions
- These should be implemented in src/utils/supabase/constants.ts with other enumerations.

## Success Criteria
1. ✅ All gig imports are atomic at the individual row level
2. ✅ Users can continuously fix and re-validate rows until all are valid
3. ✅ Default values are properly applied for missing time/date/timezone data
4. ✅ Status and timezone fields use dropdowns instead of text input
5. ✅ Import progress is clearly tracked and communicated
6. ✅ Previously successful imports are preserved during retry attempts
7. ✅ All critical bugs are resolved (typos, validation issues)

## Out of Scope
- Asset import functionality (explicitly excluded)
- Export functionality
- Batch processing optimizations
- Integration with external calendar systems
- Advanced scheduling features

## Priority Order
1. **Phase 1 - Critical Bugs**: Fix atomic imports, typos, basic validation
2. **Phase 2 - Missing Features**: Add default values, timezone/status dropdowns
3. **Phase 3 - UX Improvements**: Enhanced error handling, progress tracking, re-validation