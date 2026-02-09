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

1. **[AI Coding Guide](./development/coding-guide.md)** - Comprehensive coding conventions and patterns
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

1. **[Authentication Workflows](./product/workflows/1-authentication-workflows.md)** - Login, profile, organization setup
2. **[Organization Management Workflows](./product/workflows/2-organization-management-workflows.md)** - Staff roles, assignments, and organization directory
3. **[Gig Management Workflows](./product/workflows/3-gig-management-workflows.md)** - Event creation, editing, and management
4. **[Equipment Management Workflows](./product/workflows/4-equipment-management-workflows.md)** - Asset and kit management
5. **[Dashboard & Analytics Workflows](./product/workflows/5-dashboard-analytics-workflows.md)** - Dashboard, reporting, and analytics
6. **[Data Import & Export Workflows](./product/workflows/6-data-import-workflows.md)** - CSV import/export functionality
7. **[Notifications & Reminders Workflows](./product/workflows/7-notifications-workflows.md)** - Notifications and reminders
8. **[Calendar Integration & Scheduling Workflows](./product/workflows/8-calendar-scheduling-workflows.md)** - Calendar views and scheduling
9. **[Technical Documentation Workflows](./product/workflows/9-technical-documentation-workflows.md)** - File attachments and technical docs
10. **[Mobile Features Workflows](./product/workflows/10-mobile-workflows.md)** - Mobile features and PWA

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
**Key Files**: [coding-guide.md](./development/coding-guide.md), [development-plan.md](./development/development-plan.md)

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
4. **Run tests**: `npm test`
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
- Update [coding-guide.md](./development/coding-guide.md) when new patterns emerge

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
See [coding-guide.md](./development/coding-guide.md) for comprehensive guidelines.

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

