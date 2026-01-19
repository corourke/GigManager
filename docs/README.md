# GigManager Documentation

**Welcome to the GigManager documentation!** This directory contains comprehensive documentation for developers, AI agents, stakeholders, and users working with the GigManager production and event management platform.

**Last Updated**: 2026-01-18  
**Application Version**: 0.1.0

---

## Documentation Structure

The documentation is organized into three main categories:

### 📦 [Product Documentation](./product/)
Business requirements, features, and user workflows

### 🔧 [Technical Documentation](./technical/)
Database schema, tech stack, and setup guides

### 💻 [Development Documentation](./development/)
Development plans, AI coding guides, and testing strategies

---

## Quick Navigation

### Getting Started

**New to the project?** Start here:

1. **[Setup Guide](./technical/setup-guide.md)** - Get the application running locally
2. **[Requirements](./product/requirements.md)** - Understand what the system does
3. **[Tech Stack](./technical/tech-stack.md)** - Learn about the technology choices
4. **[Workflows](./product/workflows/)** - See how users interact with the system

### For Developers

**Ready to code?** Check these out:

1. **[AI Coding Guide](./development/ai-agents/coding-guide.md)** - Comprehensive coding conventions and patterns
2. **[Development Plan](./development/development-plan.md)** - Refactoring roadmap and current status
3. **[Database Schema](./technical/database.md)** - Complete data model and RLS policies
4. **[Feature Catalog](./product/feature-catalog.md)** - Feature status and implementation details

### For Product Managers

**Planning features?** Start with:

1. **[Requirements](./product/requirements.md)** - Functional requirements and business rules
2. **[Feature Catalog](./product/feature-catalog.md)** - Feature inventory and status
3. **[Workflows](./product/workflows/)** - User interface flows and interactions
4. **[Development Plan](./development/development-plan.md)** - Implementation timeline and milestones

---

## Product Documentation

Located in [`./product/`](./product/)

### Core Documents

- **[requirements.md](./product/requirements.md)** - Functional requirements, business rules, and feature specifications
- **[feature-catalog.md](./product/feature-catalog.md)** - Complete feature inventory with implementation status

### User Workflows

Located in [`./product/workflows/`](./product/workflows/)

- **[authentication-workflows.md](./product/workflows/authentication-workflows.md)** - Login, profile, organization setup
- **[team-management-workflows.md](./product/workflows/team-management-workflows.md)** - Staff roles, assignments, and organization directory
- **[gig-management-workflows.md](./product/workflows/gig-management-workflows.md)** - Event creation, editing, and management
- **[equipment-management-workflows.md](./product/workflows/equipment-management-workflows.md)** - Asset and kit management
- **[dashboard-analytics-workflows.md](./product/workflows/dashboard-analytics-workflows.md)** - Dashboard, reporting, and analytics
- **[data-import-workflows.md](./product/workflows/data-import-workflows.md)** - CSV import/export functionality
- **[notifications-workflows.md](./product/workflows/notifications-workflows.md)** - Notifications and reminders
- **[calendar-scheduling-workflows.md](./product/workflows/calendar-scheduling-workflows.md)** - Calendar views and scheduling
- **[technical-documentation-workflows.md](./product/workflows/technical-documentation-workflows.md)** - File attachments and technical docs
- **[mobile-workflows.md](./product/workflows/mobile-workflows.md)** - Mobile features and PWA

---

## Technical Documentation

Located in [`./technical/`](./technical/)

- **[database.md](./technical/database.md)** - Complete database schema, Supabase integration, RLS policies
- **[tech-stack.md](./technical/tech-stack.md)** - Technology choices, frameworks, and libraries
- **[setup-guide.md](./technical/setup-guide.md)** - Local development setup, deployment, and configuration

---

## Development Documentation

Located in [`./development/`](./development/)

### Planning & Roadmap

- **[development-plan.md](./development/development-plan.md)** - Development roadmap, refactoring phases, bug management, quality gates

### AI Agent Guidance

Located in [`./development/ai-agents/`](./development/ai-agents/)

- **[coding-guide.md](./development/ai-agents/coding-guide.md)** - Comprehensive coding conventions, TypeScript patterns, React patterns, and best practices for AI agents

---

## Document Types & Purposes

### Requirements Documents
**Purpose**: Define WHAT the system should do and WHY  
**Audience**: Product managers, stakeholders, developers  
**Key File**: [requirements.md](./product/requirements.md)

### Workflow Documents
**Purpose**: Define HOW users interact with the system  
**Audience**: Designers, developers, QA  
**Key Files**: [workflows/](./product/workflows/)

### Technical Specifications
**Purpose**: Define HOW the system is built  
**Audience**: Developers, DevOps, architects  
**Key Files**: [database.md](./technical/database.md), [tech-stack.md](./technical/tech-stack.md)

### Development Guides
**Purpose**: Guide implementation and maintain code quality  
**Audience**: Developers, AI coding agents  
**Key Files**: [coding-guide.md](./development/ai-agents/coding-guide.md), [development-plan.md](./development/development-plan.md)

---

## Technology Stack Overview

**Frontend:**
- React 18.3.1 with TypeScript
- Vite 6.3.5 build tool
- Tailwind CSS v4.0 + Shadcn/ui components
- react-hook-form + Zod validation

**Backend:**
- Supabase (PostgreSQL 15+)
- Row-Level Security (RLS) for multi-tenant isolation
- Real-time subscriptions via Postgres CDC

**Testing:**
- Vitest 4.0.10
- @testing-library/react 14.1.2
- 60 passing tests (26 form-utils, 12 api, 22 component)

See [tech-stack.md](./technical/tech-stack.md) for complete details.

---

## Key Features

### Multi-Organization Collaboration
Different organizations (venues, acts, production companies) can collaborate on the same gig while maintaining their own private data.

### Shared Organization Directory
Organization profiles are shared globally, eliminating duplicate data entry across tenants.

### Gig Management
Full lifecycle tracking from Date-Hold to Completed/Settled with automatic status history logging.

### Equipment Management
Track assets and kits with insurance values, assign to gigs, and detect scheduling conflicts.

### Personnel Management
Define staff roles, assign personnel to gigs, send notifications, and track confirmations.

See [feature-catalog.md](./product/feature-catalog.md) for complete feature list.

---

## Development Status

**Current Phase**: Phase 2 Complete (Form Change Detection Simplification)

**Completed:**
- ✅ Phase 1: Dead Code Removal (~200 lines removed)
- ✅ Phase 2: Form Change Detection Simplification (~32 lines reduced)

**Next Up:**
- ⏸️ Phase 3: API Layer Refactoring (~1,200 lines reduction estimated)
- ⏸️ Phase 4: React Router Migration (~200 lines reduction estimated)
- ⏸️ Phase 5: Remove Unnecessary Abstractions (~100 lines reduction estimated)
- ⏸️ Phase 6: Component Refactoring (~1,500 lines refactored estimated)

**Total Estimated Reduction**: ~3,232 lines (25-30% of codebase)

See [development-plan.md](./development/development-plan.md) for detailed phase specifications and task tracking.

---

## Contributing

### For AI Coding Agents

Before making code changes:

1. Read [coding-guide.md](./development/ai-agents/coding-guide.md) for comprehensive coding conventions
2. Check [development-plan.md](./development/development-plan.md) for current refactoring phase
3. Review [database.md](./technical/database.md) for data model understanding
4. Reference [workflows/](./product/workflows/) for UI/UX requirements

### For Human Developers

1. **Setup**: Follow [setup-guide.md](./technical/setup-guide.md)
2. **Understand requirements**: Read [requirements.md](./product/requirements.md)
3. **Check conventions**: Review [coding-guide.md](./development/ai-agents/coding-guide.md)
4. **Run tests**: `npm test` (60 tests should pass)
5. **Submit changes**: Follow git workflow in project root

---

## Documentation Maintenance

### When to Update Documentation

**Requirements Changes:**
- Update [requirements.md](./product/requirements.md) when business logic changes
- Update [workflows/](./product/workflows/) when user flows change
- Update [feature-catalog.md](./product/feature-catalog.md) when features are added/removed

**Technical Changes:**
- Update [database.md](./technical/database.md) when schema changes
- Update [tech-stack.md](./technical/tech-stack.md) when dependencies change
- Update [setup-guide.md](./technical/setup-guide.md) when setup process changes

**Development Changes:**
- Update [development-plan.md](./development/development-plan.md) when phases complete or tasks change
- Update [coding-guide.md](./development/ai-agents/coding-guide.md) when new patterns emerge

### Documentation Standards

- Use Markdown formatting with headers, lists, tables, and code blocks
- Include "Last Updated" date in document headers
- Cross-reference related documents in "Related Documentation" sections
- Use consistent terminology across all documents
- Keep documents focused (single responsibility principle)

---

## Frequently Asked Questions

### How do I set up the development environment?
See [setup-guide.md](./technical/setup-guide.md) for step-by-step instructions.

### What's the database schema?
See [database.md](./technical/database.md) for complete schema with all tables, relationships, and RLS policies.

### What coding conventions should I follow?
See [coding-guide.md](./development/ai-agents/coding-guide.md) for comprehensive guidelines.

### What features are currently implemented?
See [feature-catalog.md](./product/feature-catalog.md) for complete feature inventory with status.

### What's the development roadmap?
See [development-plan.md](./development/development-plan.md) for refactoring phases and timeline.

### How do users interact with the system?
See [workflows/](./product/workflows/) for detailed UI flows organized by functional area.

---

## External Resources

- **Supabase Documentation**: https://supabase.com/docs
- **React Documentation**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Shadcn/ui**: https://ui.shadcn.com
- **Vite Guide**: https://vitejs.dev/guide/

---

## Document History

**2026-01-18**: Completed documentation reorganization
- Consolidated 17 documentation files into 3-category structure (product/, technical/, development/)
- Merged development plans into unified document
- Consolidated AI agent documentation
- Merged requirements documentation  
- Split UI flows into 5 focused workflow documents
- Merged database and setup documentation
- Moved files to appropriate directories
- Created this documentation overview

**Total Reduction**: ~10,252 lines → ~6,500 lines (~37% reduction through consolidation and deduplication)

---

**Questions or suggestions?** Update this README or related documentation files to improve clarity and usability for all users.
