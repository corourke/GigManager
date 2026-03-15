# Testing Guide

This document explains the testing strategy and how to run tests for the GigManager application.

## Testing Philosophy

The primary goal of tests at this stage is to **ensure that code refactorings or simplifications don't break existing functionality or introduce errors**.

### Test Strategy

1. **Utility Function Tests** - Comprehensive coverage of core business logic
   - These tests validate that utility functions work correctly
   - These are the most reliable and should always pass

2. **API Function Tests** - Validate API layer behavior
   - Tests API functions
   - These tests ensure API functions don't throw errors and handle data correctly

3. **UI Component Tests**
   - **Purpose**: Verify components render without throwing errors
   - **Not comprehensive**: These tests don't validate full functionality
   - **Focus**: Catch rendering errors, missing props, or undefined access

## Test Framework

The project uses [Vitest](https://vitest.dev/) as the test runner, which provides fast unit testing with TypeScript support and excellent React component testing capabilities.

## Running Tests

### Run all tests

```bash
npm test
```

This starts Vitest in watch mode, which will automatically re-run tests when files change.

### Run tests once (CI mode)

```bash
npm run test:run
```

This runs all tests once and exits. Useful for CI/CD pipelines or when you want to run tests without watch mode.

### Run tests with UI

```bash
npm run test:ui
```

Opens the Vitest UI in your browser, providing a visual interface to run and debug tests.

### Run tests with coverage

```bash
npm run test:coverage
```

Generates a coverage report showing which parts of your code are covered by tests.

### Run specific test files

```bash
npm run test:run -- src/utils/form-utils.test.ts
npm run test:run -- src/components/GigScreen.test.tsx
```

You can specify individual test files or use patterns to run multiple files.

## Test Structure

Tests are located alongside the code they test, using the `.test.ts` or `.test.tsx` extension.

## Test Configuration

Test configuration is in `vitest.config.ts`. The setup includes:

- **Environment**: jsdom (for DOM testing)
- **Setup file**: `src/test/setup.ts` (includes Supabase client mocks)
- **Coverage**: Configured for code coverage reporting

## Mocking

### Supabase Client Mocking

The Supabase client is automatically mocked in tests via `src/test/setup.ts`. This ensures tests run in isolation without requiring a real Supabase connection.

The mock simulates Supabase's method chaining pattern:
- Intermediate methods (`select`, `insert`, `update`, `delete`) return the chain for method chaining
- Final methods (`eq`, `single`, `maybeSingle`, `order`, `limit`) return promises with test data
- The chain object is "thenable" (can be awaited directly) to match Supabase's behavior

**Note**: Supabase mocking is complex due to the method chaining pattern. Some API tests may need refinement as the mocking infrastructure improves.

### Component Mocking

Component tests use minimal mocks to check for rendering errors:
- API functions are mocked to return empty arrays or resolved promises
- Hooks are mocked to return safe default values
- The goal is to verify components don't crash, not to test full functionality

## Writing Tests

### Unit Tests (Utility Functions)

Test individual functions and utilities in isolation. These are the most reliable tests:

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeFormData } from '../utils/form-utils'

describe('normalizeFormData', () => {
  it('should trim string values', () => {
    const input = { name: '  Test  ' }
    const result = normalizeFormData(input)
    expect(result.name).toBe('Test')
  })
})
```

### Minimal Component Tests (Error Checking)

Component tests focus on ensuring components render without errors:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import MyComponent from './MyComponent'

// Mock all dependencies
vi.mock('../utils/api', () => ({
  getData: vi.fn().mockResolvedValue([]),
}))

describe('MyComponent', () => {
  it('renders without throwing errors', () => {
    expect(() => {
      render(<MyComponent {...requiredProps} />)
    }).not.toThrow()
  })
})
```

**Key Points**:
- These tests verify components don't crash during render
- They don't test full functionality or user interactions
- They catch missing props, undefined access, or import errors
- They're designed to be simple and reliable

## Test Coverage Goals

The project aims for good test coverage of:

- ✅ **Utility functions** - Core business logic and helpers
- ⚠️ **API functions** - Data fetching and manipulation
- ⚠️ **Component rendering** - Basic error checking

---

## Coverage Analysis (March 2026)

### Current State

As of this analysis: **37 test files** cover approximately **144 source files** (~25% file coverage). Tests are concentrated in components and the `conflictDetection` service.

**Well-tested today:**
- Conflict detection (comprehensive, timezone-aware)
- CSV import (date parsing, timezone handling, validation)
- Mobile components (barcode scanner, inventory, dashboard)
- Core gig section components (financials, staff, participants, kits)
- Security / RLS simulation

### Coverage Gaps by Priority

#### Priority 1 — High Impact, Low Effort

These are pure TypeScript modules with no rendering dependencies. The Supabase mock infrastructure is already in place. Each of these can be added in an afternoon.

| File | Risk | Key Gaps |
|---|---|---|
| `src/utils/dateUtils.ts` | **High** — silent wrong output | All 8 exported functions have zero tests; timezone round-trips, date-only noon-UTC edge cases, fallback paths |
| `src/utils/api-error-utils.ts` | **High** — error paths untested | `isNetworkError` (5 detection conditions), `handleApiError` wrapping, `handleFunctionsError` JSON body parsing |
| `src/services/gig.service.ts` | **High** — core business logic | `syncGigToAllCalendars` filter skipping, `deleteGigFromAllCalendars`, all CRUD operations |
| `src/services/asset.service.ts` | **High** — core CRUD | Filter combinations, `sanitizeLikeInput` integration, distinct value queries |
| `src/services/kit.service.ts` | **High** — core CRUD | Same pattern as asset service |
| `src/services/mobile/offlineSync.service.ts` | **High** — data loss risk | `INVENTORY_SCAN` insert fields, `INVENTORY_CLEAR` by id vs. bulk, retry behavior |

#### Priority 2 — Medium Impact, Medium Effort

| File | Risk | Key Gaps |
|---|---|---|
| `src/contexts/NavigationContext.tsx` | **Medium** — routing bugs | Initial state, state transitions, consumer re-renders |
| `src/components/LoginScreen.tsx` | **Medium** — auth entry point | Field rendering, error display on failure, redirect on success, loading state |
| `src/utils/validation-utils.ts` | **Medium** — security-adjacent | `sanitizeLikeInput` metachar stripping, `UUID_REGEX` against injection strings |
| `src/services/user.service.ts` | **Medium** | Profile fetch/update, org membership queries |
| `src/services/attachment.service.ts` | **Medium** | Upload, delete, URL generation |

#### Priority 3 — Lower Impact / Higher Effort

| Area | Notes |
|---|---|
| Screen-level smoke tests | One "renders without crash" test per screen (`GigListScreen`, `SettingsScreen`, `ImportScreen`, etc.) — low individual value, high collective safety net |
| `TagsInput`, `MarkdownEditor` | Custom UI logic warrants testing; pure Radix passthrough components do not |
| `src/services/purchase.service.ts` | Lower complexity, lower risk |

---

## Implementation Plan

Work is broken into four phases. Each phase is independently shippable.

### Phase 1 — Utility & Error Infrastructure (Week 1)

**Goal:** Test the shared utilities that every service depends on.

1. **`src/utils/dateUtils.test.ts`** (new file)
   - `isNoonUTC` — ISO format, PostgreSQL format, non-noon strings
   - `formatInTimeZone` — valid timezone, undefined timezone (browser fallback), invalid timezone (error fallback), invalid date string
   - `formatDateTimeDisplay` — same-moment start/end, sub-24h same day, sub-24h crossing midnight, ≥24h multi-day, date-only (both noon UTC), date-only range
   - `parseLocalToUTC` — round-trip for `America/New_York`, `Europe/London`, `Asia/Tokyo`; no timezone provided
   - `parseGigDateTimeFromInput` — date-only input (`YYYY-MM-DD`), datetime input (`YYYY-MM-DDTHH:mm`), empty string

2. **`src/utils/api-error-utils.test.ts`** (new file)
   - `isNetworkError` — one test per detection branch (5 total) plus a false-positive test
   - `handleApiError` — network error is wrapped with `NetworkError` name and message; non-network error is rethrown as-is
   - `handleFunctionsError` — `FunctionsHttpError` with parseable JSON body; with unparseable body; with non-functions error

3. **`src/utils/validation-utils.test.ts`** (extend existing)
   - `sanitizeLikeInput` — strips `%`, `_`, `\`; handles empty string; handles normal input unchanged
   - `UUID_REGEX` — valid UUIDs pass; invalid strings and SQL injection strings fail

### Phase 2 — Core Service Layer (Week 2)

**Goal:** Cover the primary data services that back every screen in the app.

4. **`src/services/gig.service.test.ts`** (new file)
   - Mock Supabase using the existing setup; mock `syncGigToCalendar` / `deleteGigFromCalendar`
   - `syncGigToAllCalendars` — skips users with non-realtime frequency; does not throw when individual sync fails; calls `syncGigToCalendar` with correct venue location string
   - `deleteGigFromAllCalendars` — calls delete for each user with a synced entry
   - `getGig` / `createGig` / `updateGig` / `deleteGig` — verify correct Supabase table and filter args; verify error propagation via `handleApiError`

5. **`src/services/asset.service.test.ts`** (new file)
   - `getAssets` — no filters; category filter; search filter (verify `sanitizeLikeInput` is applied); combined filters
   - `getDistinctAssetValues` — valid field, Supabase error propagation

6. **`src/services/kit.service.test.ts`** (new file)
   - Same pattern as asset: CRUD operations, filter application, error propagation

### Phase 3 — Mobile Offline & Auth (Week 3)

**Goal:** Cover data-loss-risk mobile paths and the auth entry point.

7. **`src/services/mobile/offlineSync.service.test.ts`** (new file)
   - Mock `idbStore` and Supabase client
   - `INVENTORY_SCAN` handler — inserts all required fields; sets `asset_id` to `null` when absent; sets `notes` to `null` when absent
   - `INVENTORY_CLEAR` by `record_id` — targets the correct row
   - `INVENTORY_CLEAR` bulk — targets by `gig_id + kit_id`
   - Handler throws when Supabase returns an error

8. **`src/contexts/NavigationContext.test.tsx`** (new file)
   - Renders children without crashing
   - Initial navigation state matches expected defaults
   - State update propagates to consumers

9. **`src/components/LoginScreen.test.tsx`** (new file)
   - Renders email and password inputs
   - Submit button is disabled while loading
   - Error message appears on auth failure
   - `AuthContext` `signIn` is called with correct credentials

### Phase 4 — Screen Smoke Tests & UI Components (Week 4+)

**Goal:** Broad safety net across all screens; custom UI component logic.

10. **Screen smoke tests** — one `renders without throwing errors` test per untested screen:
    - `GigListScreen`, `SettingsScreen`, `ImportScreen`, `TeamMemberDetailScreen`
    - `OrganizationScreen`, `AcceptInvitationScreen`, `UserProfileCompletionScreen`

11. **Custom UI component tests:**
    - `TagsInput` — add tag on Enter/comma, remove tag on backspace/click, deduplication, max tags limit
    - `MarkdownEditor` — toolbar bold/italic/link actions modify selection correctly

12. **`src/services/user.service.test.ts`** and **`src/services/attachment.service.test.ts`** using the same service-layer patterns established in Phase 2.

### Success Metrics

| Metric | Current | Target (after Phase 4) |
|---|---|---|
| Test files | 37 | ~55 |
| Source files with tests | ~25% | ~50% |
| Core service coverage | 1 of 8 services | 7 of 8 services |
| Utility function coverage | Partial | ~90% of exported functions |

## Troubleshooting

### Tests failing due to Supabase mocking

If tests fail with Supabase-related errors:
1. Check that the mock setup in `src/test/setup.ts` is correct
2. Verify test-specific mocks are properly configured
3. Ensure chain methods return the correct chain object for method chaining
4. For final methods, use `_setFinalPromise()` or replace the method entirely

### Component tests failing

If component tests fail:
1. Check that all required props are provided
2. Verify all hooks are properly mocked
3. Ensure API mocks return the expected data structure
4. Check for undefined access in component code

### Tests not running

Ensure:
1. Dependencies are installed: `npm install`
2. Test files use `.test.ts` or `.test.tsx` extension
3. Test files are in the `src/` directory or configured paths

## Continuous Integration

Tests are designed to run in CI/CD pipelines. Use `npm run test:run` for non-interactive test execution.

**CI Expectations**:
- Utility tests should always pass (33 tests)
- API tests may have some failures during development (acceptable)
- Component tests are optional but help catch errors early

## Best Practices

1. **Write tests for new utility functions** - These are reliable and valuable
2. **Keep component tests minimal** - Focus on error checking, not full functionality
3. **Mock external dependencies** - Don't rely on real Supabase or external services
4. **Test behavior, not implementation** - Focus on what functions do, not how
5. **Keep tests simple** - Complex tests are harder to maintain and debug
