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

**Current suite size** (September 2026): 878 tests across 91 files, all passing. Treat this as a floor — `npm run test:run` must exit 0 before any merge. Shared fixtures live in `src/test/factories.ts` (`makeUser`, `makeOrganization`); use them instead of hand-built row objects so fixtures track the generated database types.

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

The default mock is a stub: every query-builder method (`select`, `insert`, `eq`, `order`, `single`, …) is a `vi.fn().mockReturnThis()`, so chains don't throw, but nothing resolves to data. That is enough for components that only need to render.

Tests that need real results (all the `src/services/*.service.test.ts` files) re-mock the client at the top of the file and hand back their own chain per test:

```typescript
vi.mock('../utils/supabase/client', () => ({ createClient: vi.fn() }))
// ...
;(createClient as any).mockReturnValue(mockSupabase)
```

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
- ✅ **Service layer** - Data fetching and manipulation (every `src/services/` module except `user.service.ts` has a test file)
- ⚠️ **Component rendering** - Basic error checking

---

## Coverage Gaps

The March 2026 coverage plan (phases 1 to 4) is largely done: every Priority 1 and Priority 2 module it named now has a test file. These gaps remain:

- **Screens with no smoke test:** `SettingsScreen`, `ImportScreen`, `TeamMemberDetailScreen`, `AcceptInvitationScreen`, `UserProfileCompletionScreen`
- **Custom UI components:** `TagsInput`, `MarkdownEditor`
- **Services:** `user.service.ts` has no dedicated test file. Component tests mock it, and `src/services/base/dataAccess.test.ts` covers the shared base module that it uses.

## Troubleshooting

### Tests failing due to Supabase mocking

If tests fail with Supabase-related errors:
1. Check that the mock setup in `src/test/setup.ts` is correct
2. Verify test-specific mocks are properly configured
3. Ensure chain methods return the correct chain object for method chaining
4. For calls that must return data, re-mock `createClient` in the test file (see [Supabase Client Mocking](#supabase-client-mocking))

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

`.github/workflows/ci.yml` runs on every push to `main` and on every PR against it. The steps are `npm run typecheck`, `npm run lint`, `npm run test:run` and `npm run build`. **Every step must pass.** Failing tests are never acceptable, whatever layer they're in.

## Best Practices

1. **Write tests for new utility functions** - These are reliable and valuable
2. **Keep component tests minimal** - Focus on error checking, not full functionality
3. **Mock external dependencies** - Don't rely on real Supabase or external services
4. **Test behavior, not implementation** - Focus on what functions do, not how
5. **Keep tests simple** - Complex tests are harder to maintain and debug
