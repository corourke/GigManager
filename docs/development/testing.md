# Testing Guide

This document explains the testing strategy and how to run tests for the GigManager application.

## Testing Philosophy

The primary goal of tests at this stage is to **ensure that code simplifications don't break existing functionality or introduce errors**. Tests serve as a safety net during refactoring work outlined in the [Code Simplification Plan](./code-simplification-plan.md).

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

- ✅ **Utility functions** - Core business logic and helpers (33 tests passing)
- ⚠️ **API functions** - Data fetching and manipulation (6 passing, needs work)
- ⚠️ **Component rendering** - Basic error checking (4 passing, needs work)

## Current Test Status

### All Tests Passing ✅
- **33 utility tests** (`form-utils.test.ts`) - Comprehensive coverage of form utilities
- **12 API tests** (`api.test.ts`) - Error-checking tests ensuring API functions don't throw
- **8 component tests** - Minimal error-checking tests ensuring components render without errors
  - `App.test.tsx` (2 tests)
  - `GigScreen.test.tsx` (2 tests)
  - `AssetScreen.test.tsx` (2 tests)
  - `KitScreen.test.tsx` (2 tests)

**Total: 53 tests passing, 0 failures**

### Test Strategy Summary

1. **Utility tests** - Comprehensive coverage of core business logic (33 tests)
2. **API tests** - Error-checking to ensure functions don't throw (12 tests)
3. **Component tests** - Minimal error-checking to ensure components render (8 tests)

All tests are designed to catch regressions during code simplification work, not to test full functionality.

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

## Testing During Code Simplification

When working through the [Code Simplification Plan](./code-simplification-plan.md):

1. **Before making changes**: Run `npm run test:run` to ensure all tests pass
2. **After making changes**: Run tests again to catch regressions
3. **Focus on utility tests**: These are most reliable and catch logic errors
4. **Component tests**: These catch rendering errors but may need updates as components change
5. **API tests**: These validate API behavior but may need mock updates

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
