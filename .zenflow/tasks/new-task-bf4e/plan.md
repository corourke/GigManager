# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 945cc5c2-8ddf-4c5a-8462-de9e99228654 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 380db707-823a-4e84-9eba-71ea0cfa521a -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: dcf9b89f-6d77-4e62-8d61-0cbbb04f62f0 -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

---

## Implementation Tasks

### Phase 1: Initial Analysis & Validation

#### [ ] Task 1.1: Validate README.md

**Objective**: Verify README.md accurately reflects the current state of the application

**Actions**:
- Compare README.md tech stack with package.json dependencies
- Verify Quick Start instructions are complete and accurate
- Validate project structure section matches actual directory layout
- Check that documentation links are valid (docs/requirements.md, docs/tech-stack.md, etc.)
- Test if setup instructions would work for new developers

**Verification**:
- [ ] Tech stack matches package.json
- [ ] All mentioned files and directories exist
- [ ] Documentation links are valid
- [ ] Quick Start steps are complete

**Deliverable**: Updated README.md (if changes needed) or validation confirmation

---

#### [ ] Task 1.2: Perform Comprehensive Codebase Analysis

**Objective**: Gather metrics and understand codebase structure for documentation

**Actions**:
- Count all TypeScript files in src/ directory (expected: ~104 files)
- Identify all screen components (*Screen.tsx files)
- List all shared components (non-screen components)
- Count API functions in src/utils/api.tsx (expected: 56+ functions)
- Analyze component sizes (CreateGigScreen.tsx, CreateAssetScreen.tsx, CreateKitScreen.tsx)
- Map routing implementation in App.tsx
- Review form handling patterns across components
- Examine database schema in supabase/schema.sql
- Review existing test files and coverage

**Verification**:
- [ ] File counts recorded
- [ ] Component inventory created
- [ ] API function list compiled
- [ ] Architectural patterns identified

**Deliverable**: Analysis notes for use in subsequent documentation tasks

---

### Phase 2: Feature Documentation

#### [ ] Task 2.1: Create Feature Catalog

**Objective**: Document all implemented features with status tracking

**File**: `docs/features/feature-catalog.md`

**Actions**:
- Review all screen components to identify features
- Cross-reference with docs/requirements.md
- Map features to database tables
- Document feature status (implemented, partial, planned)
- Identify known limitations
- Document user workflows for each feature domain

**Content Sections**:
1. Overview and purpose
2. Features by domain:
   - Gigs & Events Management
   - Equipment Management (Assets & Kits)
   - Organization & Team Management
   - User Management & Authentication
   - Data Import/Export
   - Reporting & Analytics
3. Feature status matrix
4. Known limitations
5. Future enhancements

**Verification**:
- [ ] All screen components accounted for
- [ ] Features cross-referenced with requirements.md
- [ ] Status indicators accurate
- [ ] Workflows documented

**Deliverable**: `docs/features/feature-catalog.md`

---

### Phase 3: Technical Reference Documentation

#### [ ] Task 3.1: Create Architecture Documentation

**Objective**: Document system architecture and design patterns

**File**: `docs/technical/architecture.md`

**Actions**:
- Document application type (client-side SPA, not Next.js)
- Describe current routing architecture (custom string-based in App.tsx:78-96)
- Document state management approach (React useState, Context API)
- Explain database architecture (Supabase, PostgreSQL, RLS)
- Document authentication & authorization flows
- Describe data flow patterns
- Identify key design patterns used
- Note planned architectural changes (React Router migration in Phase 4)

**Content Sections**:
1. Application Type & Deployment Model
2. Routing Architecture (Current & Planned)
3. State Management Strategy
4. Database Architecture & RLS
5. Authentication & Authorization
6. Data Flow Patterns
7. Design Patterns & Conventions
8. Technology Stack Summary

**Verification**:
- [ ] Accurately describes current implementation
- [ ] References specific files with line numbers
- [ ] Notes planned changes from code-simplification-plan.md
- [ ] Includes architecture diagrams (text-based)

**Deliverable**: `docs/technical/architecture.md`

---

#### [ ] Task 3.2: Create Component Hierarchy Documentation

**Objective**: Map component structure and relationships

**File**: `docs/technical/component-hierarchy.md`

**Actions**:
- Categorize all components (Screen, Shared, UI)
- Map authentication flow components
- Document main application screens
- List shared/reusable components
- Identify component dependencies and data flow
- Document component size and complexity
- Note components targeted for refactoring (Phase 6)

**Content Sections**:
1. Component Organization Overview
2. Screen Components (Page-level)
   - Authentication Flow
   - Main Application Screens
3. Shared Components
4. UI Components (Shadcn/ui)
5. Component Dependencies Map
6. Data Flow Patterns
7. Component Size Analysis

**Verification**:
- [ ] All components in src/components/ listed
- [ ] Component relationships mapped
- [ ] Data flow documented
- [ ] Import dependencies identified

**Deliverable**: `docs/technical/component-hierarchy.md`

---

#### [ ] Task 3.3: Create API Reference Documentation

**Objective**: Document all API functions with signatures and usage

**File**: `docs/technical/api-reference.md`

**Actions**:
- Read entire src/utils/api.tsx file (2,824 lines)
- Extract all function signatures
- Document parameters and return types
- Group functions by domain (Gigs, Assets, Kits, Organizations, Users, etc.)
- Document error handling patterns
- Note organization scoping requirements
- Identify repetitive patterns (to inform Phase 3 refactoring)

**Content Sections**:
1. API Layer Overview
2. Authentication Functions
3. Gigs API
4. Assets API
5. Kits API
6. Organizations API
7. Users API
8. Organization Scoping Pattern
9. Error Handling Conventions
10. Planned Refactoring (Phase 3)

**Verification**:
- [ ] All 56+ API functions documented
- [ ] Function signatures accurate
- [ ] Parameters and return types complete
- [ ] Organization scoping explained

**Deliverable**: `docs/technical/api-reference.md`

---

### Phase 4: Developer Documentation

#### [ ] Task 4.1: Create Getting Started Guide

**Objective**: Provide comprehensive developer onboarding

**File**: `docs/development/getting-started.md`

**Actions**:
- Document prerequisites (Node.js version, tools)
- Write step-by-step setup instructions
- Include Supabase configuration steps
- Document environment variables
- Provide troubleshooting guidance
- Reference existing setup docs in docs/setup/

**Content Sections**:
1. Prerequisites
2. Setup Steps
   - Clone repository
   - Install dependencies
   - Configure Supabase
   - Set environment variables
   - Run database schema
   - Start development server
3. Common Development Tasks
4. Running Tests
5. Troubleshooting Guide
6. Additional Resources

**Verification**:
- [ ] Instructions are complete and accurate
- [ ] Cross-references with docs/setup/ preserved
- [ ] Environment variables documented
- [ ] Common issues addressed

**Deliverable**: `docs/development/getting-started.md`

---

#### [ ] Task 4.2: Create Coding Conventions Documentation

**Objective**: Document TypeScript and React patterns used in the project

**File**: `docs/development/coding-conventions.md`

**Actions**:
- Document TypeScript conventions (types, interfaces, generics)
- Describe component structure standards
- Document form handling patterns (react-hook-form, zod)
- Explain API integration patterns
- Document testing expectations
- Reference BASE_CODING_PROMPT.md
- Include code examples

**Content Sections**:
1. TypeScript Conventions
2. Component Structure Standards
3. Form Handling Patterns
4. API Integration Patterns
5. State Management Patterns
6. Styling Conventions (Tailwind CSS)
7. Testing Conventions
8. File Organization
9. Naming Conventions
10. Code Examples

**Verification**:
- [ ] Reflects actual codebase patterns
- [ ] Includes concrete examples from codebase
- [ ] Cross-references BASE_CODING_PROMPT.md
- [ ] Testing expectations clear

**Deliverable**: `docs/development/coding-conventions.md`

---

#### [ ] Task 4.3: Create Contributing Guide

**Objective**: Define contribution workflow and expectations

**File**: `docs/development/contributing.md`

**Actions**:
- Document contribution process
- Define code review expectations
- Specify testing requirements before PRs
- Document commit message conventions
- Explain branching strategy
- Reference relevant development docs

**Content Sections**:
1. How to Contribute
2. Development Workflow
3. Code Review Process
4. Testing Requirements
5. Commit Message Conventions
6. Branching Strategy
7. Pull Request Guidelines
8. Documentation Update Expectations

**Verification**:
- [ ] Workflow is clear and actionable
- [ ] Testing requirements specified
- [ ] Code review process defined
- [ ] Links to related docs included

**Deliverable**: `docs/development/contributing.md`

---

### Phase 5: Development Planning

#### [ ] Task 5.1: Update Code Simplification Plan

**Objective**: Update plan with current codebase analysis

**File**: `docs/development/code-simplification-plan.md` (UPDATE EXISTING)

**Actions**:
- Verify Phase 1-2 completion status is accurate
- Update line count estimates based on actual measurements
- Validate Phase 3-6 task lists against current codebase
- Refine task breakdowns for remaining phases
- Identify new simplification opportunities discovered during analysis
- Update risk assessments based on findings
- Add metrics from codebase analysis

**Updates Needed**:
- Confirm actual line counts (api.tsx: 2,824 lines, CreateGigScreen.tsx: 2,091 lines, App.tsx: 570 lines)
- Update Phase 3 task list with actual API function count (56+ functions)
- Refine Phase 4 routing migration tasks based on App.tsx analysis
- Update Phase 6 component refactoring targets with actual component sizes
- Add any newly discovered dead code or simplification opportunities

**Verification**:
- [ ] Phase 1-2 status accurate
- [ ] Line counts updated
- [ ] Task lists refined
- [ ] New opportunities documented

**Deliverable**: Updated `docs/development/code-simplification-plan.md`

---

#### [ ] Task 5.2: Create Development Plan

**Objective**: Create comprehensive development roadmap

**File**: `docs/development/development-plan.md`

**Actions**:
- Document current state assessment
- Create test strategy (review existing tests, identify coverage gaps)
- Integrate code-simplification-plan.md phases into roadmap
- Define bug discovery and resolution strategy
- Establish quality gates and success metrics
- Create timeline with milestones
- Define "done" criteria for each phase

**Content Sections**:
1. Current State Assessment
   - Application status
   - Test coverage (60 passing tests)
   - Known technical debt
   - Completed refactoring (Phases 1-2)
2. Test Strategy
   - Existing test review
   - Coverage gap analysis
   - Test refactoring needs
   - Testing approach for simplifications
3. Refactoring Phases (from code-simplification-plan.md)
   - Phase 3: API Layer Refactoring
   - Phase 4: React Router Migration
   - Phase 5: Remove Unnecessary Abstractions
   - Phase 6: Component Refactoring
   - Phase priorities and dependencies
   - Incremental milestones
4. Bug Management Strategy
   - User testing plan
   - Bug discovery process
   - Triage and prioritization
   - Resolution workflow
   - Regression prevention
5. Quality Gates
   - "Done" criteria per phase
   - Test coverage thresholds
   - Code quality metrics
   - Performance benchmarks
6. Timeline & Milestones
7. Success Metrics
8. Risk Management

**Verification**:
- [ ] Integrates code-simplification-plan.md
- [ ] Test strategy is comprehensive
- [ ] Bug management process defined
- [ ] Quality gates established
- [ ] Timeline is realistic

**Deliverable**: `docs/development/development-plan.md`

---

### Phase 6: Final Verification

#### [ ] Task 6.1: Verify Documentation Cross-References

**Objective**: Ensure all documentation links and references are accurate

**Actions**:
- Check all internal links between documentation files
- Verify all file path references exist
- Confirm line number references are accurate
- Validate cross-references between new and existing docs
- Ensure consistent terminology across all docs

**Verification**:
- [ ] All internal links work
- [ ] File paths are correct
- [ ] Line numbers accurate
- [ ] Terminology consistent

---

#### [ ] Task 6.2: Documentation Quality Review

**Objective**: Final quality assurance for all documentation

**Actions**:
- Review all new documentation for completeness
- Check Markdown formatting is correct
- Verify code examples are accurate
- Ensure tables and lists are properly formatted
- Validate that all sections from requirements.md are covered
- Confirm no placeholder text or TODOs remain

**Quality Checklist**:
- [ ] All required documents created
- [ ] Markdown formatting correct
- [ ] Code examples accurate
- [ ] Tables properly formatted
- [ ] No placeholders or TODOs
- [ ] Writing is clear and concise
- [ ] Technical accuracy verified

**Deliverable**: Complete, validated documentation suite

---

## Summary

**Total Tasks**: 12 main tasks across 6 phases

**Deliverables**:
1. Validated/Updated README.md
2. docs/features/feature-catalog.md (NEW)
3. docs/technical/architecture.md (NEW)
4. docs/technical/component-hierarchy.md (NEW)
5. docs/technical/api-reference.md (NEW)
6. docs/development/getting-started.md (NEW)
7. docs/development/coding-conventions.md (NEW)
8. docs/development/contributing.md (NEW)
9. docs/development/development-plan.md (NEW)
10. docs/development/code-simplification-plan.md (UPDATED)

**Verification Approach**:
- Each task includes verification checklist
- Cross-reference validation in Phase 6
- Final quality review before completion

**Notes**:
- This is a documentation-only task - no code modifications
- Analysis requires reading 104 TypeScript files
- Must preserve all existing documentation in docs/
- Focus on accuracy and completeness for future development work
