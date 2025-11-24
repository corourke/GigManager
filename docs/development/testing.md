# Testing Guide

This document explains how to run tests for the GigManager application.

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
npm run test:run -- src/components/Dashboard.test.tsx
```

You can specify individual test files or use patterns to run multiple files.

## Test Structure

Tests are located alongside the code they test, using the `.test.ts` or `.test.tsx` extension:

- `src/utils/form-utils.test.ts` - Tests for form utility functions
- `src/utils/api.test.ts` - Tests for API functions (with mocked Supabase client)
- `src/components/Dashboard.test.tsx` - Tests for React components

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
- Final methods (`eq`, `single`, `maybeSingle`) return promises with test data

### Example Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { someFunction } from './some-module'

describe('someFunction', () => {
  it('should do something', () => {
    const result = someFunction(input)
    expect(result).toBe(expected)
  })
})
```

## Writing Tests

### Unit Tests

Test individual functions and utilities in isolation:

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

### Component Tests

Test React components using `@testing-library/react`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Test Coverage

The project aims for good test coverage of:

- **Utility functions** - Core business logic and helpers
- **Form utilities** - Form data normalization and change detection
- **API functions** - Data fetching and manipulation (with mocked Supabase)
- **Component rendering** - Basic component rendering and user interactions

## Troubleshooting

### Tests failing due to Supabase mocking

If tests fail with Supabase-related errors, check that:
1. The mock setup in `src/test/setup.ts` is correct
2. Test-specific mocks are properly configured
3. Chain methods return the correct chain object for method chaining

### Tests not running

Ensure:
1. Dependencies are installed: `npm install`
2. Test files use `.test.ts` or `.test.tsx` extension
3. Test files are in the `src/` directory or configured paths

## Continuous Integration

Tests are designed to run in CI/CD pipelines. Use `npm run test:run` for non-interactive test execution.

