# Investigation: Form Change Detection Issues

## Bug Summary

The Submit button is always enabled on Edit Gigs, Create Gig, and Create New Kit screens, even when no changes have been made. This violates the intended behavior where the Submit button should be disabled in edit mode when there are no changes.

## Root Cause Analysis

### Primary Issue: Incorrect Change Detection Logic

**File**: `src/utils/hooks/useSimpleFormChanges.ts`  
**Location**: Lines 223-237  
**Severity**: High

The `hasAnyChanges` calculation uses shallow comparison (`!==`) for all values, which fails for complex types:

```typescript
const hasAnyChanges = (() => {
  if (form) {
    const currentValues = form.getValues();
    for (const key in originalData) {
      if (originalData.hasOwnProperty(key) && currentValues.hasOwnProperty(key)) {
        if (currentValues[key] !== originalData[key]) {
          return true;
        }
      }
    }
  }
  return nestedDataChanged;
})();
```

**Problems with this approach:**

1. **Date objects**: `new Date('2024-01-01') !== new Date('2024-01-01')` is always `true` because they are different object instances
2. **Arrays**: `['tag1'] !== ['tag1']` is always `true` for the same reason
3. **Not using react-hook-form's built-in isDirty**: The Phase 2 plan stated the hook should "leverage react-hook-form's built-in `isDirty`", but the implementation doesn't use it

**Impact**: In edit mode, Date and array fields (start_time, end_time, tags) always appear "changed" even when they haven't been modified, causing `hasChanges` to always return `true`, which means the Submit button is never disabled.

### Secondary Issue: Missing Tests

**Files**: 
- `src/utils/hooks/useSimpleFormChanges.test.ts`
- `src/components/CreateGigScreen.test.tsx`
- `src/components/CreateKitScreen.test.tsx`

**Problems:**

1. **Smoke test only**: `useSimpleFormChanges.test.ts` only checks if the hook exports, doesn't test actual change detection logic
2. **Mocked behavior**: Component tests mock `useSimpleFormChanges` to return `hasChanges: false`, which doesn't test real behavior
3. **No integration tests**: Comments in tests say "verified through manual testing" but no automated tests exist
4. **Verification checklist incomplete**: Phase 2 development plan shows these verification items unchecked:
   - [ ] All form screens work correctly
   - [ ] Submit buttons enable/disable correctly
   - [ ] Partial updates work in edit mode
   - [ ] All existing tests pass

## Affected Components

All components using `useSimpleFormChanges` for form change detection:

1. **CreateGigScreen.tsx** (line 279) - Has Date fields (start_time, end_time) and array field (tags)
2. **CreateKitScreen.tsx** (line 109) - Has array fields (tags, kitAssets)
3. **CreateAssetScreen.tsx** (line 82) - Has array field (tags)
4. **CreateOrganizationScreen.tsx** - Uses the hook
5. **UserProfileCompletionScreen.tsx** - Uses the hook
6. **EditUserProfileDialog.tsx** - Uses the hook

## Proposed Solution

### Option 1: Use react-hook-form's isDirty (Recommended)

Replace the manual comparison logic with react-hook-form's built-in `isDirty`:

```typescript
const hasAnyChanges = (() => {
  if (form) {
    return form.formState.isDirty || nestedDataChanged;
  }
  return nestedDataChanged;
})();
```

**Pros:**
- Simple, uses built-in functionality
- Handles all field types correctly (Date, arrays, objects, primitives)
- Aligns with Phase 2 plan's stated goal
- Less code to maintain

**Cons:**
- Relies on react-hook-form's change tracking

### Option 2: Implement Deep Equality Comparison

Add deep equality checking for complex types:

```typescript
const hasAnyChanges = (() => {
  if (form) {
    const currentValues = form.getValues();
    for (const key in originalData) {
      if (originalData.hasOwnProperty(key) && currentValues.hasOwnProperty(key)) {
        if (!isEqual(currentValues[key], originalData[key])) {
          return true;
        }
      }
    }
  }
  return nestedDataChanged;
})();
```

**Pros:**
- More explicit control over comparison logic
- Can customize comparison for specific field types

**Cons:**
- Adds complexity (Phase 2 goal was to simplify)
- Requires deep equality library or custom implementation
- Goes against Phase 2's goal to "remove deep equality checking"

## Recommended Implementation

**Use Option 1** (react-hook-form's isDirty) because:

1. It aligns with Phase 2's stated goal: "Leverage react-hook-form's built-in `isDirty` for form field changes"
2. It's simpler and more maintainable
3. It handles all field types correctly out of the box
4. The development plan explicitly states "react-hook-form's built-in features are sufficient for most use cases"

## Phase 3 Dependency Analysis

**Question**: Does Phase 3 (API Layer Refactoring) need to be completed before properly implementing Phase 2?

**Answer**: **No, Phase 3 is not required** for fixing Phase 2.

**Reasoning:**
- Phase 3 deals with API layer refactoring (generic CRUD functions)
- Phase 2 deals with form change detection (client-side)
- These are independent concerns
- The form change detection bug can be fixed without any API changes
- The submit button logic and change detection are purely frontend concerns

**However**, we should fix Phase 2 properly before Phase 3 because:
- Form change detection affects partial updates in edit mode
- Partial updates determine what data is sent to the API
- If we refactor the API layer while the form change detection is broken, we might miss edge cases

## Edge Cases

1. **Nested data changes** (staffSlots, kitAssets, participants):
   - Currently tracked separately via `nestedDataChanged` state
   - Uses reference comparison in `updateDataChanges()` function
   - This part appears to work correctly

2. **Manual state management mode** (when `form` is not provided):
   - Used by CreateAssetScreen and CreateKitScreen
   - Falls back to manual comparison in `hasAnyChanges`
   - Will also fail for Date/array fields

3. **Initial data loading in edit mode**:
   - `loadInitialData()` is called after data is loaded
   - Sets `originalData` and resets form
   - This part appears correct

## Testing Requirements

To prevent this bug from recurring, we need:

1. **Unit tests for useSimpleFormChanges**:
   - Test with Date fields (should detect actual changes, not false positives)
   - Test with array fields (tags)
   - Test with nested data (staffSlots, kitAssets)
   - Test `isDirty` integration with react-hook-form
   - Test `loadInitialData()` in edit mode
   - Test `markAsSaved()` after successful save

2. **Integration tests for form components**:
   - Test submit button is disabled in edit mode with no changes
   - Test submit button is enabled when changes are made
   - Test submit button is enabled in create mode
   - Test partial update payload only includes changed fields

3. **Remove mocked hooks from component tests**:
   - CreateGigScreen.test.tsx should use real useSimpleFormChanges
   - CreateKitScreen.test.tsx should use real useSimpleFormChanges

## Implementation Notes

1. **Fix the hook first**: Correct `hasAnyChanges` calculation to use `form.formState.isDirty`
2. **Add proper tests**: Create real unit tests for the hook
3. **Update component tests**: Remove mocks and test actual behavior
4. **Manual testing**: Verify submit button behavior in all affected screens
5. **Update development plan**: Check off verification items in Phase 2

## Files to Modify

1. `src/utils/hooks/useSimpleFormChanges.ts` - Fix hasAnyChanges calculation
2. `src/utils/hooks/useSimpleFormChanges.test.ts` - Add comprehensive tests
3. `src/components/CreateGigScreen.test.tsx` - Remove mocks, add integration tests
4. `src/components/CreateKitScreen.test.tsx` - Remove mocks, add integration tests
5. `docs/development/development-plan.md` - Update Phase 2 verification checklist

## Timeline Estimate

- Fix hook: 30 minutes
- Add comprehensive tests: 2-3 hours
- Manual testing all screens: 1 hour
- Update documentation: 30 minutes
- **Total**: 4-5 hours
