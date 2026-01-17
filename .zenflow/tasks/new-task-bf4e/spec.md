# Technical Specification: Documentation & Development Planning

## Executive Summary

This specification outlines the technical approach for creating comprehensive documentation and development planning for the GigManager application. The work is **documentation-only** with no code modifications, involving analysis of 104 TypeScript files (~76KB API layer, 79KB CreateGigScreen.tsx, 571-line App.tsx) to produce accurate reference materials and actionable development plans.

---

## 1. Technical Context

### 1.1 Application Overview

**Application**: GigManager - Production and event management SPA  
**Architecture**: Client-side React SPA (not Next.js, not SSR)  
**Current State**: Working application with Phases 1-2 of refactoring complete  
**Lines of Code**: ~104 TypeScript files in `src/` directory

### 1.2 Technology Stack

**Frontend**:
- React 18.3.1 (TypeScript .tsx files)
- Vite 6.3.5 (build tool)
- Tailwind CSS v4.0 (utility-first styling)
- Shadcn/ui (Radix UI-based components)

**Backend**:
- Supabase (`@supabase/supabase-js`)
  - PostgreSQL database with RLS policies
  - Real-time subscriptions
  - Google OAuth authentication
  - Auto-generated REST API

**Forms & Validation**:
- react-hook-form 7.55.0
- zod (schema validation)
- @hookform/resolvers

**Testing**:
- Vitest 4.0.10
- @testing-library/react 14.1.2
- jsdom 23.0.1
- Current status: 60 passing tests (26 form-utils, 12 api, 22 component)

**Supporting Libraries**:
- lucide-react (icons)
- date-fns (date handling)
- papaparse (CSV parsing)
- recharts (data visualization)
- sonner (toast notifications)

### 1.3 Current Architecture Patterns

**Routing**: Custom string-based routing in App.tsx (570 lines)
- Manual route state management (`currentRoute`, `setCurrentRoute`)
- Conditional rendering based on route string
- Navigation via callback props (`onNavigateTo...`)
- **Planned**: Phase 4 migration to React Router

**Form Management**: Simplified form change detection (Phase 2 complete)
- `useSimpleFormChanges` hook (replaces complex 232-line hook)
- react-hook-form's built-in `isDirty` for form fields
- Simple state comparison for nested data (arrays, objects)
- **Completed**: All form screens updated to use simplified approach

**API Layer**: Large monolithic API file (`src/utils/api.tsx` - 76KB)
- 56+ repetitive CRUD functions (createGig, updateGig, deleteGig, etc.)
- Common authentication checks in each function
- Organization scoping via `organization_id` parameter
- **Planned**: Phase 3 refactoring to generic CRUD operations

**State Management**:
- React `useState` for local component state
- Context API for navigation (`NavigationContext`)
- No Redux/Zustand (kept simple intentionally)

**Database Access**:
- Direct Supabase client calls (`createClient()`)
- Row-Level Security (RLS) enforces multi-tenant isolation
- Real-time subscriptions where needed (minimal usage post-Phase 1)

### 1.4 Completed Refactoring

**Phase 1 Complete** (Dead Code Removal):
- Removed: `useRealtimeList.ts`, `TableWithRealtime.tsx`, `FormSection.tsx`, `FormDirtyIndicator.tsx`
- Impact: ~200+ lines removed, build passes, no regressions
- Tests: 60 tests passing

**Phase 2 Complete** (Form Change Detection Simplification):
- Created: `useSimpleFormChanges.ts` (replaces `useFormWithChanges.ts`)
- Updated: All form screens (CreateGigScreen, CreateAssetScreen, etc.)
- Impact: Simplified from 232 lines to ~200 lines total
- Removed: Deep equality checking, `currentData` merging complexity

### 1.5 Pending Refactoring

**Phase 3**: API layer refactoring (generic CRUD functions)  
**Phase 4**: React Router migration (replace custom routing)  
**Phase 5**: Remove unnecessary abstractions (NavigationContext, duplicate utilities)  
**Phase 6**: Component refactoring (split large components)

---

## 2. Implementation Approach

### 2.1 Analysis Strategy

This is a **documentation-only task** requiring comprehensive codebase analysis:

1. **Codebase Exploration**: Read all source files systematically
2. **Pattern Identification**: Identify architectural patterns, conventions, and anti-patterns
3. **Feature Mapping**: Cross-reference implemented features with existing requirements
4. **Metric Collection**: Count lines, components, API functions, test coverage
5. **Documentation Creation**: Write accurate, complete reference materials
6. **Plan Development**: Create actionable development roadmap

### 2.2 Documentation Approach

All documentation will be written in **Markdown format** with:

- Clear hierarchical structure (## headings, ### subheadings)
- Code examples with proper syntax highlighting (```typescript)
- Cross-references between related documents ([link text](./path/to/doc.md))
- File path references with line numbers where applicable (src/App.tsx:98)
- Tables for comparisons and feature matrices
- Checklists for actionable items (- [ ] Task description)

### 2.3 Existing Documentation Preservation

**No modifications to existing docs**:
- docs/requirements.md (28KB - comprehensive feature requirements)
- docs/TECH_STACK.md (10.7KB - technology choices)
- docs/DATABASE.md (16KB - database schema specification)
- docs/UI_FLOWS.md (27.5KB - user interface flows)
- docs/COMPLEX_EVENTS.md (12.9KB - event management details)
- docs/BASE_CODING_PROMPT.md (9KB - coding guidelines)
- docs/setup/*.md (Getting started, Supabase setup)
- docs/development/testing.md (testing guide)
- docs/development/csv-import.md (CSV import feature)

**Update only**:
- docs/development/code-simplification-plan.md (update with current analysis)

**Create new**:
- 8 new documentation files (detailed in Section 3)

---

## 3. Source Code Structure Changes

### 3.1 New Documentation Files

All new files will be created in the `docs/` directory following this structure:

```
docs/
├── features/
│   └── feature-catalog.md          [NEW] Feature inventory with status
├── technical/
│   ├── architecture.md              [NEW] System architecture & design patterns
│   ├── component-hierarchy.md       [NEW] Component structure & relationships
│   └── api-reference.md             [NEW] API function reference
└── development/
    ├── getting-started.md           [NEW] Developer onboarding guide
    ├── coding-conventions.md        [NEW] TypeScript/React patterns
    ├── contributing.md              [NEW] Contribution workflow
    ├── development-plan.md          [NEW] Development roadmap & strategy
    └── code-simplification-plan.md  [UPDATE] Current refactoring status
```

### 3.2 File Specifications

#### 3.2.1 `docs/features/feature-catalog.md`

**Purpose**: Comprehensive feature inventory and status tracking

**Content Structure**:
```markdown
# Feature Catalog

## Gigs & Events
- [x] Create/Edit Gigs
- [x] Gig List & Search
- [x] Staff Slot Management
- [ ] Bid Management (planned)
...

## Equipment Management
- [x] Asset CRUD operations
- [x] Kit composition
- [x] Asset assignment to kits/gigs
...

## Organization & Team
- [x] Multi-organization support
- [x] Role-based access (Admin/Manager/Staff/Viewer)
- [x] Team member management
...

## Known Limitations
- Custom routing (to be replaced in Phase 4)
- Monolithic API layer (to be refactored in Phase 3)
...
```

**Analysis Required**:
- Read all screen components (`*Screen.tsx` files)
- Map features to database tables (from `schema.sql`)
- Cross-reference with `docs/requirements.md`
- Identify partial implementations

#### 3.2.2 `docs/technical/architecture.md`

**Purpose**: System architecture, design patterns, and technical decisions

**Content Structure**:
```markdown
# Architecture

## Application Type
- Client-side React SPA (not Next.js)
- Static bundle deployment (Vercel, Netlify)
- No server-side rendering

## Routing Architecture (Current)
- Custom string-based routing (src/App.tsx:78-96)
- Manual state management (currentRoute, setCurrentRoute)
- [PLANNED] Migration to React Router (Phase 4)

## State Management
- Local state: React useState
- Navigation context: NavigationContext (to be removed Phase 5)
- Form state: react-hook-form
- No global state management library

## Database Architecture
- PostgreSQL via Supabase
- Row-Level Security (RLS) for multi-tenant isolation
- Real-time subscriptions (minimal usage)
- Schema defined in supabase/schema.sql

## Authentication & Authorization
- Google OAuth via Supabase Auth
- JWT token-based sessions
- Role-based access: Admin/Manager/Staff/Viewer
- Organization membership model

## Data Flow
[Diagram showing: User → Component → API Layer → Supabase → PostgreSQL]

## Design Patterns
- Screen components (page-level)
- Shared UI components (Shadcn/ui)
- Custom hooks for reusable logic
- Form composition with react-hook-form
```

**Analysis Required**:
- Read `src/App.tsx` (routing logic)
- Examine `src/utils/api.tsx` (API patterns)
- Review `src/utils/supabase/client.tsx` (database client)
- Analyze authentication flows (LoginScreen, UserProfileCompletion)

#### 3.2.3 `docs/technical/component-hierarchy.md`

**Purpose**: Component structure, relationships, and data flow

**Content Structure**:
```markdown
# Component Hierarchy

## Screen Components (Page-level)

### Authentication Flow
- LoginScreen.tsx (Google OAuth)
- UserProfileCompletionScreen.tsx (onboarding)
- OrganizationSelectionScreen.tsx (org picker)

### Main Application
- Dashboard.tsx (overview, metrics)
- GigListScreen.tsx → GigDetailScreen.tsx
- CreateGigScreen.tsx (create/edit gigs)
- AssetListScreen.tsx → CreateAssetScreen.tsx
- KitListScreen.tsx → KitDetailScreen.tsx → CreateKitScreen.tsx
- TeamScreen.tsx (team management)
- ImportScreen.tsx (CSV import)

## Shared Components
- AppHeader.tsx (navigation bar)
- NavigationMenu.tsx (sidebar)
- UserSelector.tsx (user picker)
- TagsInput.tsx (tag management)
- MarkdownEditor.tsx (rich text editing)
- EditUserProfileDialog.tsx (profile editing)

## UI Components (Shadcn/ui)
- src/components/ui/* (20+ primitive components)
- Button, Input, Select, Dialog, Card, etc.

## Component Dependencies
- CreateGigScreen.tsx depends on:
  - UserSelector.tsx (staff assignment)
  - TagsInput.tsx (categorization)
  - Form components from ui/
  - API functions: createGig, updateGig, getGig

## Data Flow Patterns
- Screen → API → Supabase → Database
- Form submit → validation → API call → redirect
- List view → fetch data → render table → click → detail view
```

**Analysis Required**:
- List all components in `src/components/`
- Map import relationships
- Identify screen-level vs shared components
- Document data flow through components

#### 3.2.4 `docs/technical/api-reference.md`

**Purpose**: Complete API function reference

**Content Structure**:
```markdown
# API Reference

All API functions are located in `src/utils/api.tsx` (76KB, 56+ functions).

## Authentication

### `getCurrentUser(): Promise<User | null>`
Returns currently authenticated user from Supabase session.

**Returns**: User object or null if not authenticated  
**Throws**: Error if session retrieval fails

## Gigs

### `createGig(data: GigFormData, organizationId: string): Promise<Gig>`
Creates a new gig/event.

**Parameters**:
- `data`: Form data including name, venue, dates, staff slots
- `organizationId`: Required organization scope

**Returns**: Created gig object  
**Throws**: Error if user not authenticated or creation fails

### `getGig(gigId: string, organizationId: string): Promise<Gig>`
Fetches a single gig with all participants and assignments.

**Parameters**:
- `gigId`: Gig UUID
- `organizationId`: Required organization scope

**Returns**: Gig object with nested participants  
**Throws**: Error if not found or user lacks access

[... continues for all 56+ functions ...]

## Assets

### `createAsset(data: AssetFormData, organizationId: string): Promise<Asset>`
...

## Organization Scoping

All API functions require `organizationId` parameter to enforce multi-tenant isolation. This is enforced by:
1. TypeScript function signatures (required parameter)
2. Database RLS policies (PostgreSQL level)
3. Supabase query filters (application level)
```

**Analysis Required**:
- Read entire `src/utils/api.tsx` file
- Extract all function signatures
- Document parameters, return types, error handling
- Group by domain (Gigs, Assets, Kits, Organizations, Users)

#### 3.2.5 `docs/development/getting-started.md`

**Purpose**: Developer onboarding guide

**Content Structure**:
```markdown
# Getting Started

## Prerequisites
- Node.js 18+ (`node --version`)
- npm or yarn
- Supabase account (free tier works)
- Git
- Code editor (VS Code recommended)

## Setup Steps

### 1. Clone Repository
\`\`\`bash
git clone <repo-url>
cd gigmanager
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Configure Supabase
1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Enable Google OAuth in Auth settings
4. Copy project URL and anon key

### 4. Environment Variables
Create `.env.local`:
\`\`\`env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
GOOGLE_MAPS_API_KEY=optional
\`\`\`

### 5. Run Development Server
\`\`\`bash
npm run dev
# Opens http://localhost:5173
\`\`\`

## Common Tasks

### Running Tests
\`\`\`bash
npm test              # Watch mode
npm run test:run      # CI mode
npm run test:coverage # With coverage
\`\`\`

### Building for Production
\`\`\`bash
npm run build
npm run preview  # Test production build
\`\`\`

### Database Migrations
- Schema updates: Edit `supabase/schema.sql`
- Apply changes: Run SQL in Supabase dashboard
- **Note**: No migration system currently (single schema file)

## Troubleshooting

### "Module not found" errors
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Supabase connection errors
- Check `.env.local` values
- Verify Supabase project is active
- Test with Supabase dashboard API
```

**Analysis Required**:
- Verify setup steps in README.md
- Test installation process (if dependencies installable)
- Document common development workflows
- Identify common issues from existing setup docs

#### 3.2.6 `docs/development/coding-conventions.md`

**Purpose**: TypeScript, React, and project-specific patterns

**Content Structure**:
```markdown
# Coding Conventions

## TypeScript

### File Naming
- Components: PascalCase (CreateGigScreen.tsx)
- Utilities: camelCase (form-utils.ts)
- Types: PascalCase (User, Organization)

### Type Definitions
\`\`\`typescript
// Prefer interfaces for objects
interface User {
  id: string;
  email: string;
  first_name: string;
}

// Use type for unions/aliases
type Route = 'login' | 'dashboard' | 'gig-list';
type UserRole = 'Admin' | 'Manager' | 'Staff';
\`\`\`

## React Patterns

### Component Structure
\`\`\`typescript
// 1. Imports
import { useState } from 'react';
import { Button } from './ui/button';

// 2. Type definitions
interface MyComponentProps {
  title: string;
  onSave: () => void;
}

// 3. Component definition
export default function MyComponent({ title, onSave }: MyComponentProps) {
  // 4. Hooks
  const [value, setValue] = useState('');
  
  // 5. Event handlers
  const handleSubmit = () => { ... };
  
  // 6. Render
  return (
    <div>...</div>
  );
}
\`\`\`

### Form Patterns
- Use react-hook-form for all forms
- Use zod for validation schemas
- Use useSimpleFormChanges for change detection
- Always include organizationId in submissions

\`\`\`typescript
const form = useForm<GigFormData>({
  resolver: zodResolver(gigSchema),
  defaultValues: initialValues
});

const { hasChanges } = useSimpleFormChanges(form, ...);
\`\`\`

## API Integration

### Function Pattern
\`\`\`typescript
export async function createResource(
  data: ResourceFormData,
  organizationId: string
): Promise<Resource> {
  // 1. Authentication check
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // 2. Supabase query
  const { data: result, error } = await supabase
    .from('resources')
    .insert({ ...data, organization_id: organizationId })
    .select()
    .single();
    
  // 3. Error handling
  if (error) throw error;
  
  return result;
}
\`\`\`

### Organization Scoping
- **Always** include `organization_id` in queries
- **Always** pass `organizationId` parameter to API functions
- RLS policies enforce at database level

## Testing

### Test File Naming
- Component tests: ComponentName.test.tsx
- Utility tests: utility-name.test.ts

### Test Structure
\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
\`\`\`

## Code Style

- Use single quotes for strings
- 2-space indentation
- Semicolons required
- Trailing commas in multi-line objects/arrays
- Destructure props in function parameters
```

**Analysis Required**:
- Examine existing code patterns in components
- Identify TypeScript conventions (interfaces vs types)
- Document form handling patterns
- Review test file patterns

#### 3.2.7 `docs/development/contributing.md`

**Purpose**: Contribution workflow and standards

**Content Structure**:
```markdown
# Contributing

## Development Workflow

### 1. Create Feature Branch
\`\`\`bash
git checkout -b feature/my-feature
\`\`\`

### 2. Make Changes
- Follow coding conventions (see coding-conventions.md)
- Write tests for new functionality
- Update documentation if needed

### 3. Test Your Changes
\`\`\`bash
npm run test:run  # All tests must pass
npm run build     # Build must succeed
\`\`\`

### 4. Commit Changes
\`\`\`bash
git add .
git commit -m "feat: Add user profile editing"
\`\`\`

**Commit Message Format**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

### 5. Push & Create PR
\`\`\`bash
git push origin feature/my-feature
\`\`\`

## Testing Requirements

Before submitting PR:
- [ ] All existing tests pass (`npm run test:run`)
- [ ] New functionality has tests
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing completed
- [ ] No TypeScript errors

## Code Review Process

1. Submit PR with clear description
2. Respond to reviewer feedback
3. Make requested changes
4. Re-request review when ready
5. Merge after approval

## Documentation Updates

When to update docs:
- New features → Update feature-catalog.md
- API changes → Update api-reference.md
- Architecture changes → Update architecture.md
- New patterns → Update coding-conventions.md
```

**Analysis Required**:
- Review existing git workflow (if .git exists)
- Identify testing requirements (from testing.md)
- Document build/deployment process

#### 3.2.8 `docs/development/development-plan.md`

**Purpose**: Comprehensive development roadmap and strategy

**Content Structure**:
```markdown
# Development Plan

## Current State Assessment

### Codebase Metrics (as of [date])
- Total TypeScript files: 104
- Lines of code: ~[calculated total]
- Main App.tsx: 571 lines
- API layer: 76KB (56+ functions)
- Largest component: CreateGigScreen.tsx (79KB)
- Test coverage: 60 tests passing (26 form-utils, 12 api, 22 component)

### Refactoring Progress
- ✅ Phase 1: Dead code removal (complete)
- ✅ Phase 2: Form change detection (complete)
- ⏸️ Phase 3: API layer refactoring (pending)
- ⏸️ Phase 4: React Router migration (pending)
- ⏸️ Phase 5: Remove abstractions (pending)
- ⏸️ Phase 6: Component refactoring (optional)

### Known Technical Debt
- Custom routing system (570-line App.tsx with manual state)
- Monolithic API layer (76KB, repetitive functions)
- Large components (CreateGigScreen.tsx at 79KB)
- NavigationContext (to be removed after React Router)

## Test Strategy

### Current Test Status
**Passing Tests**: 60 total
- 26 form-utils tests (utility functions)
- 12 api tests (mock-based)
- 22 component tests (screen components)

**Coverage Gaps**:
- [ ] Integration tests for routing flows
- [ ] E2E tests for critical paths
- [ ] Real Supabase integration tests (currently mocked)
- [ ] Form submission flows
- [ ] Organization switching logic

### Test Improvement Plan

#### Phase 1: Stabilize Existing Tests
- [ ] Refine Supabase mocks for reliability
- [ ] Add proper cleanup handlers for async tests
- [ ] Document mock patterns for consistency

#### Phase 2: Add Critical Path Tests
- [ ] User authentication flow (login → profile → org selection)
- [ ] Gig creation and editing
- [ ] Asset and Kit management
- [ ] Organization switching

#### Phase 3: Integration Tests
- [ ] Set up test Supabase project
- [ ] Add integration tests with real database
- [ ] Test RLS policies

### Test Coverage Goals
- Unit tests: 80%+ for utilities and API functions
- Component tests: 60%+ for screen components
- Integration tests: Critical user flows covered

## Refactoring Roadmap

### Phase 3: API Layer Refactoring (Next Up)
**Goal**: Reduce 76KB of repetitive code to generic CRUD operations

**Tasks**:
1. Create `src/utils/api/crud.ts` with generic functions
2. Refactor Assets API (simplest, good starting point)
3. Refactor Kits API
4. Refactor Gigs API (most complex, needs custom logic)
5. Update all component imports
6. Remove old API functions
7. Verify all functionality works

**Timeline**: 2-3 days  
**Risk**: Medium (affects entire app)  
**Verification**: All 60 tests must pass, manual testing of CRUD operations

### Phase 4: React Router Migration (After Phase 3)
**Goal**: Replace custom routing with standard React Router

**Tasks**:
1. Install react-router-dom
2. Create route configuration and protected routes
3. Refactor App.tsx to use BrowserRouter
4. Update all navigation calls in components
5. Test URL navigation, back/forward buttons
6. Remove custom route state management

**Timeline**: 3-4 days  
**Risk**: High (affects entire app navigation)  
**Verification**: All routes accessible, browser navigation works

### Phase 5: Remove Abstractions (After Phase 4)
**Goal**: Remove unnecessary NavigationContext and duplicate utilities

**Tasks**:
1. Remove NavigationContext (replaced by React Router)
2. Consolidate form-utils.ts (keep only what's needed)
3. Update all imports

**Timeline**: 1 day  
**Risk**: Low  
**Verification**: Build succeeds, tests pass

### Phase 6: Component Refactoring (Optional)
**Goal**: Break down CreateGigScreen.tsx (79KB) into smaller components

**Tasks**:
1. Extract StaffSlotsSection component
2. Extract ParticipantsSection component
3. Extract KitAssignmentsSection component
4. Extract BidManagementSection component
5. Update tests for extracted components

**Timeline**: 2-3 days  
**Risk**: Medium (large component, complex state)  
**Verification**: All gig functionality works

## Bug Management Strategy

### Bug Discovery Plan

#### User Testing Sessions
1. **Internal Testing** (Week 1-2)
   - Test all CRUD operations
   - Test organization switching
   - Test role-based access
   - Test CSV import
   - Document all issues

2. **Pilot User Testing** (Week 3-4)
   - 2-3 production companies
   - Real-world scenarios
   - Capture feedback and bugs
   - Prioritize issues

### Bug Triage Process

**Priority Levels**:
- **P0 (Critical)**: Data loss, authentication failures, app crashes
- **P1 (High)**: Major functionality broken, workarounds exist
- **P2 (Medium)**: Minor functionality issues, edge cases
- **P3 (Low)**: UI polish, nice-to-haves

**Bug Workflow**:
1. Report in issue tracker (GitHub Issues)
2. Triage: Assign priority and owner
3. Fix: Create branch, implement fix, add test
4. Verify: Test fix in staging environment
5. Deploy: Merge to main, deploy to production
6. Close: Verify fix in production

### Regression Prevention

- **Automated Tests**: Add test for every bug fix
- **Code Review**: All changes reviewed before merge
- **Staging Environment**: Test changes before production
- **Monitoring**: Error tracking (Sentry or similar)

## Quality Gates

### Definition of Done (Refactoring Phases)

- [ ] All planned tasks completed
- [ ] All existing tests pass
- [ ] No new TypeScript errors
- [ ] Build succeeds without warnings
- [ ] Manual testing of affected functionality
- [ ] Code reviewed and approved
- [ ] Documentation updated (if needed)

### Test Coverage Thresholds

- Unit tests: 80%+ for new code
- Component tests: 60%+ for screen components
- No decrease in overall coverage

### Code Quality Metrics

- No TypeScript `any` types (use proper typing)
- No console.log statements (use proper logging)
- No commented-out code
- Consistent code style (enforced by prettier/eslint if available)

## Timeline & Milestones

### Milestone 1: API Refactoring (Phase 3)
**Target**: Week 1-2  
**Deliverables**:
- Generic CRUD functions created
- All API functions refactored
- 76KB → ~20KB code reduction
- All tests passing

### Milestone 2: React Router Migration (Phase 4)
**Target**: Week 3-4  
**Deliverables**:
- React Router installed and configured
- App.tsx refactored (570 → ~200 lines)
- All navigation working with URLs
- Browser back/forward functional

### Milestone 3: Cleanup & Optimization (Phase 5)
**Target**: Week 5  
**Deliverables**:
- NavigationContext removed
- Duplicate utilities consolidated
- Code simplified and clean

### Milestone 4: Component Refactoring (Phase 6 - Optional)
**Target**: Week 6-7  
**Deliverables**:
- CreateGigScreen.tsx split into smaller components
- Improved maintainability
- Tests for extracted components

### Milestone 5: User Testing & Bug Fixes
**Target**: Week 8-10  
**Deliverables**:
- Internal testing complete
- Pilot user testing complete
- All P0/P1 bugs fixed
- Bug tracking process established

### Milestone 6: Production-Ready Codebase
**Target**: Week 11-12  
**Deliverables**:
- All refactoring complete
- All tests passing
- Code quality metrics met
- Documentation updated
- Ready for feature development

## Success Metrics

### Code Metrics
- [ ] 30-40% code reduction (~1500+ lines removed)
- [ ] API layer: 76KB → ~20KB
- [ ] App.tsx: 571 → ~200 lines
- [ ] No TypeScript errors
- [ ] Build time maintained or improved

### Test Metrics
- [ ] 80%+ test coverage for utilities
- [ ] 60%+ test coverage for components
- [ ] All 60+ existing tests passing
- [ ] 20+ new tests added for refactored code

### Quality Metrics
- [ ] All P0/P1 bugs fixed
- [ ] No functionality regressions
- [ ] Improved code readability (subjective)
- [ ] Standard patterns adopted (React Router, generic CRUD)

### Developer Experience
- [ ] Faster onboarding (new documentation)
- [ ] Easier navigation debugging (React Router)
- [ ] Simpler API usage (generic CRUD)
- [ ] Clearer component structure (smaller components)
```

**Analysis Required**:
- Calculate current codebase metrics
- Review code-simplification-plan.md for timeline estimates
- Identify critical paths for testing
- Estimate effort for each phase

#### 3.2.9 `docs/development/code-simplification-plan.md` (UPDATE)

**Purpose**: Update existing refactoring plan with current analysis

**Update Strategy**:
1. Verify Phase 1-2 completion status
2. Update line count estimates based on current code
3. Add newly discovered simplification opportunities
4. Refine Phase 3-6 task breakdowns
5. Update risk assessments

**Specific Updates**:
- Confirm App.tsx is 571 lines (not 570+ estimate)
- Confirm API layer is 76KB (~2,800+ lines)
- Confirm CreateGigScreen.tsx is 79KB
- Update test count (currently 60 passing)
- Note any new dead code discovered
- Validate Phase 3-6 assumptions against actual code

---

## 4. Data Model / API / Interface Changes

**No changes** - This is a documentation-only task. No modifications to:
- Database schema (`supabase/schema.sql`)
- API functions (`src/utils/api.tsx`)
- Component interfaces
- TypeScript types
- Dependencies (`package.json`)

---

## 5. Delivery Phases

This task will be delivered in **3 incremental phases** to enable early review and course correction:

### Phase 1: README & Feature Documentation (Days 1-2)

**Deliverables**:
1. Review and validate README.md (update if needed)
2. Create `docs/features/feature-catalog.md`

**Tasks**:
- Read all screen components to identify features
- Map features to database schema
- Cross-reference with existing requirements.md
- Document feature status (implemented/partial/planned)
- Identify gaps and limitations

**Verification**:
- README accurately describes application
- Setup instructions are complete
- Feature catalog covers all implemented features
- Cross-references are valid

**Output**: 2 files (1 updated, 1 new)

---

### Phase 2: Technical Reference Documentation (Days 3-5)

**Deliverables**:
1. Create `docs/technical/architecture.md`
2. Create `docs/technical/component-hierarchy.md`
3. Create `docs/technical/api-reference.md`

**Tasks**:
- Analyze App.tsx routing and state management
- Map component relationships and data flow
- Document all 56+ API functions with signatures
- Describe authentication and authorization flows
- Create architectural diagrams (in Markdown/text)

**Verification**:
- Architecture document accurately describes current system
- Component hierarchy matches actual codebase
- API reference includes all functions from api.tsx
- File paths and line numbers are accurate

**Output**: 3 new files

---

### Phase 3: Developer Documentation & Planning (Days 6-8)

**Deliverables**:
1. Create `docs/development/getting-started.md`
2. Create `docs/development/coding-conventions.md`
3. Create `docs/development/contributing.md`
4. Create `docs/development/development-plan.md`
5. Update `docs/development/code-simplification-plan.md`

**Tasks**:
- Document setup and onboarding process
- Extract coding patterns from existing code
- Define contribution workflow
- Calculate current codebase metrics
- Create comprehensive development roadmap
- Update code simplification plan with current analysis

**Verification**:
- Getting started guide is complete and accurate
- Coding conventions reflect actual codebase patterns
- Development plan includes test strategy, refactoring roadmap, bug management
- Code simplification plan reflects current state
- All cross-references are valid

**Output**: 4 new files, 1 updated file

---

## 6. Verification Approach

### 6.1 Documentation Accuracy

**Technical Accuracy**:
- All file paths must exist and be correct
- Line number references must match actual code
- API function signatures must match implementation
- Component relationships must match imports
- Code examples must be syntactically valid

**Verification Methods**:
1. Cross-check file paths with actual codebase
2. Verify line numbers by reading referenced files
3. Test setup instructions (if dependencies installable)
4. Validate code examples with TypeScript compiler (if applicable)

### 6.2 Completeness

**Coverage Checklist**:
- [ ] All 104 TypeScript files reviewed
- [ ] All screen components documented
- [ ] All API functions documented
- [ ] All major features cataloged
- [ ] All refactoring phases analyzed
- [ ] All existing documentation reviewed

**Verification Methods**:
1. Count files in src/ directory and compare to documentation
2. List all API functions and verify against api-reference.md
3. Check all screen components against feature-catalog.md
4. Verify code-simplification-plan.md reflects current state

### 6.3 Cross-Reference Validation

**Link Integrity**:
- All `[text](./path.md)` links must point to existing files
- All `src/Component.tsx:123` references must be valid
- All cross-references between docs must be bidirectional

**Verification Methods**:
1. Parse all Markdown files for links
2. Verify each link points to existing file
3. Spot-check line number references
4. Ensure related docs reference each other

### 6.4 Quality Standards

**Writing Quality**:
- Clear, concise language
- Consistent terminology
- Proper Markdown formatting
- Code examples with syntax highlighting
- Logical structure and hierarchy

**Verification Methods**:
1. Markdown linter (if available)
2. Manual review for clarity
3. Check headings follow hierarchy (##, ###, ####)
4. Verify code blocks have language specifiers

### 6.5 Usability Testing

**Developer Onboarding Test** (if possible):
1. Follow getting-started.md from scratch
2. Verify all steps work as documented
3. Confirm setup completes successfully
4. Test common development tasks

**Documentation Navigation Test**:
1. Start with README.md
2. Follow cross-references to other docs
3. Verify navigation flows logically
4. Ensure no dead ends or circular references

---

## 7. Constraints & Risks

### 7.1 Constraints

**No Code Modifications**:
- Do not modify any source files in `src/`
- Do not modify `package.json` or dependencies
- Do not run `npm install` or build commands (unless already installed)
- Do not create test files or modify existing tests

**Preserve Existing Docs**:
- Do not modify or delete any existing documentation
- Only update `code-simplification-plan.md` as specified
- Create only new documentation files

**Documentation Format**:
- All documentation must be Markdown (.md)
- Follow existing documentation style
- Use consistent formatting and structure

### 7.2 Assumptions

**Codebase State**:
- Assume current code is functional
- Assume Phase 1-2 refactoring is complete as documented
- Assume test infrastructure is set up (60 tests passing)
- Assume existing documentation is mostly accurate

**Environment**:
- Dependencies may or may not be installed (node_modules)
- Build may or may not succeed (if dependencies missing)
- Tests may or may not be runnable (if dependencies missing)
- Supabase connection may or may not be configured

### 7.3 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Code changes during analysis | Low | High | Complete full codebase read before writing docs |
| Incomplete understanding of features | Medium | Medium | Read all related files, cross-reference existing docs |
| Documentation becomes stale quickly | Medium | Low | Focus on stable architecture, note volatile areas |
| Dependencies not installable | Medium | Low | Use file reading only, don't rely on running code |
| Existing docs are outdated | Low | Medium | Cross-verify with actual code, not just existing docs |

---

## 8. Success Criteria

This task will be considered successful when:

### 8.1 Deliverables Complete

- [ ] README.md reviewed and updated (if needed)
- [ ] 8 new documentation files created:
  - [ ] docs/features/feature-catalog.md
  - [ ] docs/technical/architecture.md
  - [ ] docs/technical/component-hierarchy.md
  - [ ] docs/technical/api-reference.md
  - [ ] docs/development/getting-started.md
  - [ ] docs/development/coding-conventions.md
  - [ ] docs/development/contributing.md
  - [ ] docs/development/development-plan.md
- [ ] 1 documentation file updated:
  - [ ] docs/development/code-simplification-plan.md

### 8.2 Quality Standards Met

- [ ] All file paths and line numbers are accurate
- [ ] All code examples are syntactically valid
- [ ] All cross-references are valid
- [ ] Consistent Markdown formatting throughout
- [ ] Clear, concise writing
- [ ] Comprehensive coverage of codebase

### 8.3 Usability Validated

- [ ] New developer can follow getting-started.md
- [ ] Technical reference provides complete API documentation
- [ ] Development plan is actionable and detailed
- [ ] Feature catalog accurately represents current state
- [ ] Documentation is ready for subsequent workflow development

### 8.4 Plan.md Updated

- [ ] Technical Specification step marked as complete in plan.md

---

## 9. Next Steps (After This Task)

1. **Review Documentation**: Stakeholder review of all new documentation
2. **Install Dependencies**: Run `npm install` to enable testing
3. **Execute Development Plan**: Begin Phase 3 of code simplification
4. **User Testing**: Conduct user testing to discover bugs
5. **Iterate**: Refine documentation based on feedback and findings

---

## Appendices

### A. File Size References (Current State)

**Large Files**:
- `src/components/CreateGigScreen.tsx`: 79.21 KB (~2,300+ lines)
- `src/utils/api.tsx`: 76.13 KB (~2,800+ lines)
- `src/components/CreateOrganizationScreen.tsx`: 38.39 KB
- `src/components/TeamScreen.tsx`: 36.89 KB
- `src/components/GigListScreen.tsx`: 35.33 KB

**Documentation Files**:
- `docs/requirements.md`: 28.17 KB
- `docs/UI_FLOWS.md`: 27.5 KB
- `docs/DATABASE.md`: 16.09 KB
- `docs/COMPLEX_EVENTS.md`: 12.93 KB
- `docs/TECH_STACK.md`: 10.77 KB

### B. Codebase Structure Summary

**Total TypeScript Files**: 104  
**Test Files**: ~20 (*.test.tsx, *.test.ts)  
**Screen Components**: ~15 (*Screen.tsx)  
**Shared Components**: ~15  
**UI Components**: ~40 (in components/ui/)  
**Utility Files**: ~10 (in src/utils/)  
**Hook Files**: ~3 (in src/utils/hooks/)

### C. Technology Decision Rationale

**Why Client-Side SPA?**
- Rapid prototyping and deployment
- No server infrastructure needed
- Supabase handles backend complexity
- Static hosting (cheap, fast, CDN)

**Why Supabase over Prisma?**
- Full-stack BaaS (database + auth + storage + real-time)
- No Node.js server required
- Auto-generated APIs and types
- Built-in RLS for multi-tenant security

**Why Not Next.js?**
- Complexity not needed for internal tool
- No SEO requirements (authenticated app)
- Faster iteration with zero config
- Portable to any static host

### D. Refactoring Philosophy

**Simplification Principles**:
1. Use standard libraries over custom solutions (React Router vs custom routing)
2. Reduce code duplication (generic CRUD vs 56 similar functions)
3. Simplify abstractions (react-hook-form's isDirty vs custom deep equality)
4. Remove unnecessary code (dead code, unused features)
5. Break down large components (79KB CreateGigScreen → smaller pieces)

**Risk Management**:
1. Test before refactoring (ensure baseline functionality)
2. Refactor incrementally (one phase at a time)
3. Keep old code until verified (parallel implementation)
4. Manual testing of affected areas (not just automated tests)
5. Commit frequently (easy rollback if needed)
