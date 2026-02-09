# Requirements - Remove USE_MOCK_DATA Runtime Flag

## Goal
Remove the `USE_MOCK_DATA` runtime flag and its supporting logic from the production application code. The system should always rely on the Supabase backend at runtime.

## Scope
- **Flag Removal**: Eliminate the `USE_MOCK_DATA` constant in `src/App.tsx`.
- **Prop Cleanup**: Remove the `useMockData` prop from all React components.
- **Logic Cleanup**: Remove conditional branching in components that previously used `useMockData` to return mock data instead of making real API calls.
- **Documentation**: Update technical documentation to remove instructions related to enabling mock data at runtime.
- **Preservation**: Keep `src/utils/mock-data.tsx` and any other mock data files if they are potentially useful for future testing, but remove their imports from production components.

## Affected Components
- `src/App.tsx`: Main entry point where the flag is defined.
- `src/components/LoginScreen.tsx`: Uses mock data for login/signup bypass.
- `src/components/UserProfileCompletionScreen.tsx`: Uses mock data for profile completion bypass.
- `src/components/OrganizationScreen.tsx`: Uses mock data for Google Places search bypass.
- `src/components/GigListScreen.tsx`: Uses mock data for gig listing.
- `src/components/AssetListScreen.tsx`: Uses mock data for asset listing.

## Affected Documentation
- `docs/technical/setup-guide.md`: Contains instructions on how to use the mock data flag.

## Verification
- Ensure the application builds without errors.
- Run existing tests to ensure no regressions (though `useMockData` prop is not currently used in tests).
- Manually verify that the login screen and other screens no longer have mock data paths.
