# Technical Specification - Remove USE_MOCK_DATA Runtime Flag

## Technical Context
- **Language**: TypeScript
- **Framework**: React
- **Backend**: Supabase
- **State Management**: AuthContext, NavigationContext

## Implementation Approach

### 1. src/App.tsx
- Remove `const USE_MOCK_DATA = false;`.
- Remove `useMockData={USE_MOCK_DATA}` prop from all component instances.

### 2. Component Cleanup
For each of the following components, remove the `useMockData` prop from the interface and the component definition, and remove any code blocks guarded by `if (useMockData)`.

- **LoginScreen.tsx**: 
    - Remove `MOCK_USER`, `MOCK_ORGANIZATIONS` imports from `../utils/mock-data`.
    - Remove `useMockData` from `LoginScreenProps`.
    - Remove mock logic in `handleEmailSignIn` and `handleGoogleLogin`.
    - Remove conditional text in JSX (if any).

- **UserProfileCompletionScreen.tsx**:
    - Remove `useMockData` from props.
    - Remove mock logic in `handleCompleteProfile`.

- **OrganizationScreen.tsx**:
    - Remove unused `MOCK_PLACES` import from `../utils/mock-data`.
    - Remove local `MOCK_PLACES` constant and `GooglePlace` interface if no longer used by production code.
    - Remove `useMockData` from props.
    - Remove mock logic in `handleSearchPlaces`.

- **GigListScreen.tsx**:
    - Remove `useMockData` from props.
    - Remove mock logic (if any) in `useEffect` or data fetching.

- **AssetListScreen.tsx**:
    - Remove `useMockData` from props.
    - Remove mock logic (if any) in `useEffect` or data fetching.

### 3. Documentation Cleanup
- **docs/technical/setup-guide.md**:
    - Remove section "Option 1: Quick Start with Mock Data (No Setup)".
    - Remove references to `USE_MOCK_DATA` flag.

### 4. Codebase Audit
- Search for any remaining occurrences of `useMockData` or `USE_MOCK_DATA`.
- Ensure `src/utils/mock-data.tsx` is NOT deleted as it might be used as a reference or for future tests, but ensure it is not imported in production code anymore.

## Delivery Phases
1. **App.tsx and Components**: Core logic removal.
2. **Documentation**: Cleanup of guides.
3. **Verification**: Audit and test run.

## Verification Approach
- **Lint**: Run `npm run lint` (or equivalent) to ensure no unused imports or variables remain after cleanup.
- **Test**: Run `npm run test:run` to ensure existing tests pass.
- **Manual**: Verify login still works with real Supabase.
