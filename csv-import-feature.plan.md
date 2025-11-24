# Frontend Change Detection Standardization

## Overview

Standardize all frontend forms to use the existing `createSubmissionPayload` helper function, eliminating repetitive change detection code. Frontend sends only changed fields, backend updates only the columns for fields that are present in the payload (partial updates).

## Current State Analysis

### Frontend Forms with Repetitive Change Detection Code:

1. **CreateOrganizationScreen** - 12 fields, ~36 lines of manual if statements
2. **CreateGigScreen** - 8 fields, ~24 lines of manual if statements
3. **CreateKitScreen** - 6 fields, ~18 lines of manual if statements
4. **EditUserProfileDialog** - 10 fields, ~30 lines of manual if statements
5. **UserProfileCompletionScreen** - 9 fields, ~27 lines of manual if statements
6. **CreateAssetScreen** - Already uses `createSubmissionPayload` ✅

**Total frontend code to eliminate: ~135 lines**

### Existing Helper Function:

- `createSubmissionPayload` in `src/utils/form-utils.ts` - Already handles:
  - Normalization (nulls, empty strings, trimming)
  - Deep comparison for arrays/objects
  - Returns only changed fields
  - Used successfully in CreateAssetScreen

### Backend Current State:

#### Edge Function (`supabase/functions/server/index.tsx`):
- **Organizations endpoint** (`PUT /organizations/:id`): Updates ALL fields even if not provided (lines 494-514)
- **Users endpoint** (`PUT /users/:id`): Updates ALL fields even if not provided (lines 251-264)
- **Gigs endpoint** (`PUT /gigs/:id`): Uses spread operator, but only updates fields present in payload (line 1259) ✅

#### Client API (`src/utils/api.tsx`):
- **updateOrganization**: Uses spread operator - only updates fields present ✅
- **updateUserProfile**: Uses spread operator - only updates fields present ✅
- **updateGig**: Uses spread operator - only updates fields present ✅
- **updateKit**: Uses spread operator - only updates fields present ✅
- **updateAsset**: Uses spread operator - only updates fields present ✅

**Key Finding**: Supabase's `.update()` method only updates columns that are present in the object. However, the edge function endpoints for organizations and users explicitly destructure ALL fields, causing them to be set even if not provided (potentially to null/undefined).

## Implementation Strategy

### 1. Frontend: Standardize All Forms to Use `createSubmissionPayload`

For each form component:

- Replace manual `if (changedFields.field !== undefined)` checks with `createSubmissionPayload()`
- Use `changeDetection.originalData` as the second parameter
- Normalize form data before calling helper (or let helper normalize)
- Keep `changeDetection.hasChanges` for UI (submit button enablement)

**Pattern to apply:**

```typescript
// Before: Manual field checking
const requestBody: any = {};
if (changedFields.name !== undefined) {
  requestBody.name = formData.name.trim();
}
// ... 10+ more if statements

// After: Use helper
const normalizedData = normalizeFormData(formData);
const requestBody = createSubmissionPayload(
  normalizedData,
  changeDetection.originalData
);
```

### 2. Backend: Ensure Partial Updates Only

#### Edge Function Changes Required:

**Organizations Endpoint** (`PUT /organizations/:id`):
- **Current**: Destructures all fields from body, sets them all in update
- **Change**: Only include fields that are present in the request body
- **Pattern**: Build update object dynamically from provided fields only

**Users Endpoint** (`PUT /users/:id`):
- **Current**: Destructures all fields from body, sets them all in update
- **Change**: Only include fields that are present in the request body
- **Pattern**: Build update object dynamically from provided fields only

**Gigs Endpoint** (`PUT /gigs/:id`):
- **Current**: Already uses spread operator correctly ✅
- **No changes needed**

#### Client API Functions:

All client API functions (`updateOrganization`, `updateUserProfile`, `updateGig`, `updateKit`, `updateAsset`) already use spread operator correctly and will only update fields present in the payload. **No changes needed.**

**Backend Pattern:**

```typescript
// Before: Destructure all fields (sets undefined values)
const { name, type, url, phone_number, ... } = body;
await supabaseAdmin
  .from('organizations')
  .update({
    name,  // Could be undefined
    type,  // Could be undefined
    url,   // Could be undefined
    // ... all fields
  })

// After: Only include fields that are present
const updateData: Record<string, any> = {};
if (body.name !== undefined) updateData.name = body.name;
if (body.type !== undefined) updateData.type = body.type;
if (body.url !== undefined) updateData.url = body.url;
// ... only add fields that exist

// Always include updated_at
updateData.updated_at = new Date().toISOString();

await supabaseAdmin
  .from('organizations')
  .update(updateData)
```

**Alternative Pattern (Cleaner):**

```typescript
// Filter out undefined values
const updateData = Object.fromEntries(
  Object.entries(body).filter(([_, value]) => value !== undefined)
);
updateData.updated_at = new Date().toISOString();

await supabaseAdmin
  .from('organizations')
  .update(updateData)
```

### 3. Handle Edge Cases

Some forms may need special handling:

- **Nested data** (e.g., gig participants, kit assets): Send separately or include in payload
- **Required fields** (name, type): Always include in edit mode even if unchanged (handled by frontend validation)
- **Type conversions** (dates, numbers): Handle in normalization step
- **Empty arrays**: Ensure empty arrays are sent when removing all items (e.g., `tags: []`)

### 4. Database Behavior

- Supabase `.update()` only updates columns present in the object
- Missing fields are NOT updated (preserves existing values)
- `updated_at` should always be set when ANY field changes
- Database triggers handle `updated_at` automatically, but we set it explicitly for consistency

## Code Savings Estimate

**Frontend:** ~135 lines removed (replaced with ~5-10 lines per form using helper)

**Backend:** ~20-30 lines simplified (edge functions become more flexible)

**Net savings:** ~125-145 lines of code

## Benefits

1. **Consistency** - All forms use same change detection logic
2. **Maintainability** - Single helper function to maintain
3. **Less code** - Eliminate repetitive if statements
4. **Proven pattern** - Already working in CreateAssetScreen
5. **Frontend-only change detection** - No backend complexity needed
6. **Performance** - Prevents unnecessary database writes
7. **Database efficiency** - Only updates changed columns
8. **Backward compatibility** - Edge functions accept partial updates

## Implementation Order

### Phase 1: Frontend Standardization
1. Update CreateOrganizationScreen to use `createSubmissionPayload` (12 fields)
2. Update CreateGigScreen to use helper (8 fields)
3. Update CreateKitScreen to use helper (6 fields)
4. Update EditUserProfileDialog to use helper (10 fields)
5. Update UserProfileCompletionScreen to use helper (9 fields)
6. Verify CreateAssetScreen already uses helper correctly (no changes needed)

### Phase 2: Backend Simplification
7. Update organizations edge function endpoint to accept partial updates
8. Update users edge function endpoint to accept partial updates
9. Verify gigs edge function endpoint already handles partial updates correctly
10. Test all endpoints with partial update payloads

### Phase 3: Testing & Verification
11. Verify forms only send changed fields
12. Verify unchanged fields are not in request body
13. Verify nested data (participants, assets) handled correctly
14. Verify required fields always included in edit mode
15. Test edge cases: null vs empty string, whitespace trimming
16. Verify `updated_at` only changes when actual data changes
17. Verify database columns only update when fields are present

## Testing Strategy

### Unit Tests

#### Frontend Form Utilities (`src/utils/form-utils.test.ts` - NEW FILE)

```typescript
describe('createSubmissionPayload', () => {
  it('should return only changed fields', () => {
    const current = { name: 'New Name', type: 'Venue', url: 'https://example.com' };
    const original = { name: 'Old Name', type: 'Venue', url: 'https://example.com' };
    const result = createSubmissionPayload(current, original);
    expect(result).toEqual({ name: 'New Name' });
  });

  it('should handle empty strings as null', () => {
    const current = { name: 'Test', url: '' };
    const original = { name: 'Test', url: 'https://old.com' };
    const result = createSubmissionPayload(current, original);
    expect(result).toEqual({ url: null });
  });

  it('should trim string values', () => {
    const current = { name: '  Test  ', type: 'Venue' };
    const original = { name: 'Test', type: 'Venue' };
    const result = createSubmissionPayload(current, original);
    expect(result).toEqual({ name: 'Test' });
  });

  it('should handle array deep comparison', () => {
    const current = { tags: ['tag1', 'tag2'] };
    const original = { tags: ['tag1'] };
    const result = createSubmissionPayload(current, original);
    expect(result).toEqual({ tags: ['tag1', 'tag2'] });
  });

  it('should return empty object when no changes', () => {
    const current = { name: 'Test', type: 'Venue' };
    const original = { name: 'Test', type: 'Venue' };
    const result = createSubmissionPayload(current, original);
    expect(result).toEqual({});
  });
});
```

#### Form Component Tests

**CreateOrganizationScreen.test.tsx** (NEW FILE):
- Test that only changed fields are sent in edit mode
- Test that all fields are sent in create mode
- Test normalization (trimming, empty strings to null)
- Test submit button disabled when no changes

**CreateGigScreen.test.tsx** (NEW FILE):
- Test partial updates for gig fields
- Test nested participants handling
- Test nested staff_slots handling

**CreateKitScreen.test.tsx** (NEW FILE):
- Test partial updates for kit fields
- Test nested assets handling

**EditUserProfileDialog.test.tsx** (NEW FILE):
- Test partial updates for user fields
- Test that unchanged fields are not sent

### Integration Tests

#### API Endpoint Tests (`src/utils/api.test.ts` - UPDATE EXISTING)

```typescript
describe('updateOrganization', () => {
  it('should only update provided fields', async () => {
    const org = await createOrganization({ name: 'Test Org', type: 'Venue' });
    const originalUpdatedAt = org.updated_at;
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update only name
    const updated = await updateOrganization(org.id, { name: 'Updated Name' });
    
    expect(updated.name).toBe('Updated Name');
    expect(updated.type).toBe('Venue'); // Unchanged
    expect(updated.updated_at).not.toBe(originalUpdatedAt);
  });

  it('should handle null values for optional fields', async () => {
    const org = await createOrganization({ 
      name: 'Test', 
      type: 'Venue',
      url: 'https://example.com' 
    });
    
    const updated = await updateOrganization(org.id, { url: null });
    expect(updated.url).toBeNull();
  });
});
```

#### Edge Function Tests (`supabase/functions/server/index.test.ts` - NEW FILE)

```typescript
describe('PUT /organizations/:id', () => {
  it('should only update provided fields', async () => {
    const org = await createTestOrganization();
    const originalType = org.type;
    
    const response = await fetch(`${BASE_URL}/organizations/${org.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Updated Name' })
    });
    
    const updated = await response.json();
    expect(updated.name).toBe('Updated Name');
    expect(updated.type).toBe(originalType); // Unchanged
  });

  it('should not set fields to undefined when not provided', async () => {
    const org = await createTestOrganization({ url: 'https://example.com' });
    
    const response = await fetch(`${BASE_URL}/organizations/${org.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Updated Name' })
    });
    
    const updated = await response.json();
    expect(updated.url).toBe('https://example.com'); // Preserved
  });
});
```

### End-to-End Tests

#### Form Submission E2E Tests (`e2e/forms.spec.ts` - NEW FILE)

```typescript
describe('Form Change Detection', () => {
  it('should only send changed fields when editing organization', async () => {
    // Create organization
    const org = await createOrganization({ name: 'Test', type: 'Venue' });
    
    // Navigate to edit form
    await page.goto(`/organizations/${org.id}/edit`);
    
    // Change only name field
    await page.fill('[name="name"]', 'Updated Name');
    
    // Intercept API call
    const requestPromise = page.waitForRequest(req => 
      req.url().includes(`/organizations/${org.id}`) && req.method() === 'PUT'
    );
    
    await page.click('button[type="submit"]');
    const request = await requestPromise;
    const body = request.postDataJSON();
    
    // Verify only changed fields are sent
    expect(body).toHaveProperty('name');
    expect(body).not.toHaveProperty('type');
    expect(body).not.toHaveProperty('url');
  });

  it('should disable submit button when no changes', async () => {
    await page.goto(`/organizations/${org.id}/edit`);
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
    
    // Make a change
    await page.fill('[name="name"]', 'New Name');
    await expect(submitButton).toBeEnabled();
  });
});
```

### Database Verification Tests

#### Database Update Tests (`tests/database-updates.test.ts` - NEW FILE)

```typescript
describe('Database Partial Updates', () => {
  it('should only update provided columns', async () => {
    const org = await createTestOrganization({
      name: 'Original',
      type: 'Venue',
      url: 'https://original.com'
    });
    
    const originalUpdatedAt = org.updated_at;
    
    // Update only name via edge function
    await updateOrganizationViaEdgeFunction(org.id, { name: 'Updated' });
    
    // Verify database state
    const updated = await getOrganizationFromDB(org.id);
    expect(updated.name).toBe('Updated');
    expect(updated.type).toBe('Venue'); // Unchanged
    expect(updated.url).toBe('https://original.com'); // Unchanged
    expect(updated.updated_at).not.toBe(originalUpdatedAt);
  });

  it('should preserve null values when field not provided', async () => {
    const org = await createTestOrganization({
      name: 'Test',
      type: 'Venue',
      url: null // Initially null
    });
    
    await updateOrganizationViaEdgeFunction(org.id, { name: 'Updated' });
    
    const updated = await getOrganizationFromDB(org.id);
    expect(updated.url).toBeNull(); // Preserved
  });
});
```

## Test Coverage Checklist

### Frontend Tests
- [ ] `createSubmissionPayload` returns only changed fields
- [ ] Normalization handles empty strings, trimming, nulls
- [ ] Deep comparison works for arrays and objects
- [ ] Forms disable submit button when no changes
- [ ] Forms send all fields in create mode
- [ ] Forms send only changed fields in edit mode
- [ ] Nested data (participants, assets) handled correctly

### Backend Tests
- [ ] Edge function organizations endpoint accepts partial updates
- [ ] Edge function users endpoint accepts partial updates
- [ ] Edge function gigs endpoint accepts partial updates (verify existing)
- [ ] Client API functions handle partial updates correctly
- [ ] Database only updates columns for provided fields
- [ ] `updated_at` is set when any field changes
- [ ] Null values are preserved when field not provided
- [ ] Undefined values don't overwrite existing data

### Integration Tests
- [ ] Full flow: form → API → database
- [ ] Multiple forms can update same entity independently
- [ ] Concurrent updates handled correctly
- [ ] Error handling when required fields missing

### Edge Case Tests
- [ ] Empty string vs null handling
- [ ] Whitespace trimming
- [ ] Array comparison (tags, participants)
- [ ] Nested object comparison
- [ ] Required fields validation
- [ ] Type conversions (dates, numbers)

## Implementation Details

### Frontend Changes

#### CreateOrganizationScreen.tsx
- Replace lines 492-604 (manual field checking) with `createSubmissionPayload` call
- Use `normalizeFormData` before calling helper
- Ensure `changeDetection.originalData` is properly set

#### CreateGigScreen.tsx
- Replace manual field checking with `createSubmissionPayload`
- Handle nested `participants` and `staff_slots` separately (always send if provided)
- Use `createSubmissionPayload` for basic gig fields only

#### CreateKitScreen.tsx
- Replace lines 308-325 (manual field checking) with `createSubmissionPayload`
- Handle nested `assets` separately (always send if provided)
- Use `createSubmissionPayload` for basic kit fields only

#### EditUserProfileDialog.tsx
- Replace lines 114-150 (manual field checking) with `createSubmissionPayload`
- Use `normalizeFormData` before calling helper

#### UserProfileCompletionScreen.tsx
- Replace lines 120-150 (manual field checking) with `createSubmissionPayload`
- Use `normalizeFormData` before calling helper

### Backend Changes

#### Edge Function: Organizations Endpoint
**File**: `supabase/functions/server/index.tsx`  
**Lines**: 442-523

**Current Code:**
```typescript
const {
  name, type, url, phone_number, description,
  address_line1, address_line2, city, state,
  postal_code, country, allowed_domains,
} = body;

await supabaseAdmin
  .from('organizations')
  .update({
    name, type, url, phone_number, description,
    address_line1, address_line2, city, state,
    postal_code, country, allowed_domains,
    updated_at: new Date().toISOString(),
  })
```

**New Code:**
```typescript
// Only include fields that are present in the request body
const updateData: Record<string, any> = {};
const allowedFields = [
  'name', 'type', 'url', 'phone_number', 'description',
  'address_line1', 'address_line2', 'city', 'state',
  'postal_code', 'country', 'allowed_domains'
];

for (const field of allowedFields) {
  if (body[field] !== undefined) {
    updateData[field] = body[field];
  }
}

// Always set updated_at when any field is updated
if (Object.keys(updateData).length > 0) {
  updateData.updated_at = new Date().toISOString();
  
  // Validate required fields if updating
  if (updateData.name !== undefined && !updateData.name) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  if (updateData.type !== undefined && !updateData.type) {
    return new Response(JSON.stringify({ error: 'Type is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const { data: updatedOrg, error: updateError } = await supabaseAdmin
    .from('organizations')
    .update(updateData)
    .eq('id', orgId)
    .select()
    .single();
}
```

#### Edge Function: Users Endpoint
**File**: `supabase/functions/server/index.tsx`  
**Lines**: 228-280

**Current Code:**
```typescript
const { first_name, last_name, phone, address_line1, address_line2, city, state, postal_code, country } = body;

await supabaseAdmin
  .from('users')
  .update({
    first_name, last_name, phone, address_line1, address_line2,
    city, state, postal_code, country,
    updated_at: new Date().toISOString(),
  })
```

**New Code:**
```typescript
// Only include fields that are present in the request body
const updateData: Record<string, any> = {};
const allowedFields = [
  'first_name', 'last_name', 'phone', 'address_line1', 'address_line2',
  'city', 'state', 'postal_code', 'country'
];

for (const field of allowedFields) {
  if (body[field] !== undefined) {
    updateData[field] = body[field];
  }
}

// Always set updated_at when any field is updated
if (Object.keys(updateData).length > 0) {
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();
}
```

## Verification Steps

After implementation, verify:

1. **Frontend sends only changed fields:**
   - Open browser DevTools → Network tab
   - Edit a form and submit
   - Check request payload - should only contain changed fields

2. **Database only updates changed columns:**
   - Query database before update
   - Make partial update via form
   - Query database after update
   - Verify unchanged columns have same values

3. **updated_at timestamp behavior:**
   - Record `updated_at` before making change
   - Make a change and submit
   - Verify `updated_at` is updated
   - Make no changes and submit (should not update `updated_at` if button disabled)

4. **Edge cases:**
   - Empty string → null conversion
   - Whitespace trimming
   - Array field changes (tags, participants)
   - Nested data updates

## Rollback Plan

If issues arise:

1. **Frontend**: Revert to manual field checking (keep old code commented)
2. **Backend**: Edge functions can accept full payloads (backward compatible)
3. **Database**: No schema changes, safe to rollback

## Success Criteria

- [ ] All forms use `createSubmissionPayload` consistently
- [ ] No manual field checking code remains
- [ ] Edge functions accept partial updates
- [ ] Database only updates provided columns
- [ ] All tests pass
- [ ] No regressions in existing functionality
- [ ] Performance improved (fewer database writes)

