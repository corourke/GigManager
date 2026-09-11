# GigWrangler Documentation

**Welcome to the GigWrangler documentation!** This directory contains comprehensive documentation for developers, AI agents, stakeholders, and users working with the GigWrangler production and event management platform.

**Last Updated**: 2026-09-07  
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

### For Developers

**Ready to code?** Check these out:

1. **[AI Coding Guide](./development/coding-guide.md)** - Comprehensive coding conventions and patterns
2. **[Database Schema](./technical/database.md)** - Complete data model and RLS policies
3. **[Testing](./development/testing.md)** - Testing strategy and conventions

### Shipping to Production

**Deploying, or debugging a deploy?**

1. **[Deployment](./technical/deployment.md)** - How production is deployed, every service involved, full config inventory, rollback procedures
2. **[`deploy_prod.sh`](../deploy_prod.sh)** - The executable production runbook

---

## Product Documentation

Located in [`./product/`](./product/)

- **[requirements.md](./product/requirements.md)** - Functional requirements, business rules, and feature specifications

---

## Technical Documentation

Located in [`./technical/`](./technical/)

- **[database.md](./technical/database.md)** - Complete database schema, Supabase integration, RLS policies
- **[tech-stack.md](./technical/tech-stack.md)** - Technology choices, frameworks, and libraries
- **[setup-guide.md](./technical/setup-guide.md)** - Local development setup and per-service configuration
- **[deployment.md](./technical/deployment.md)** - Production deployment: pipeline, Cloudflare Pages, Supabase, Vite, Sentry, Google, Anthropic, Resend, WebAuthn; environment variable and secret inventory; rollback and recovery
- **[SmartDataTable.md](./technical/SmartDataTable.md)** - SmartDataTable component documentation
- **[conflict-detection.md](./technical/conflict-detection.md)** - Equipment scheduling conflict detection
- **[security-scheme.md](./technical/security-scheme.md)** - Security and authorization scheme
- **[tenant-isolation-architecture.md](./technical/tenant-isolation-architecture.md)** - Options analysis for verifiable operator-exclusion (can't-read-your-data guarantees), per-tenant isolation, and cross-org federation (draft)
- **[schema-verification-2026-09.md](./technical/schema-verification-2026-09.md)** - Point-in-time findings from a live-database RLS/tenancy audit (Sep 2026): confirmed cross-org data leaks, dev/prod drift, offboarding gaps, deferred remediation plan

---

## Development Documentation

Located in [`./development/`](./development/)

- **[coding-guide.md](./development/coding-guide.md)** - Coding conventions, patterns, and guidelines
- **[testing.md](./development/testing.md)** - Testing strategy, conventions, and test utilities

---

## Document Types & Purposes

### Requirements Documents
**Purpose**: Define WHAT the system should do and WHY  
**Audience**: Product managers, stakeholders, developers  
**Key File**: [requirements.md](./product/requirements.md)

### Technical Specifications
**Purpose**: Define HOW the system is built  
**Audience**: Developers, DevOps, architects  
**Key Files**: [database.md](./technical/database.md), [tech-stack.md](./technical/tech-stack.md)

### Development Guides
**Purpose**: Guide implementation and maintain code quality  
**Audience**: Developers, AI coding agents  
**Key Files**: [coding-guide.md](./development/coding-guide.md), [testing.md](./development/testing.md)

---

## Technology Stack Overview

**Frontend** — React + TypeScript on Vite, routed by react-router with TanStack Query for server state, styled with Tailwind v4 and shadcn/ui. Installable as a PWA.

**Backend** — Supabase: PostgreSQL 17 with Row-Level Security as the tenant boundary, Auth, Storage, Realtime, and two Deno edge functions (a Hono-based API and an AI receipt scanner).

**Quality** — Vitest with Testing Library, TypeScript strict mode, and ESLint, all gating CI and the production deploy.

Version numbers are deliberately not repeated here — they go stale. See **[tech-stack.md](./technical/tech-stack.md)** for the full stack with versions, and [`package.json`](../package.json) for the authoritative constraints.

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

### Google Calendar Integration
Sync gigs to Google Calendar with OAuth-based authentication, per-user calendar settings, and bidirectional sync status tracking.

See [requirements.md](./product/requirements.md) for the complete feature list.

---

## Contributing

### For AI Coding Agents

Before making code changes:

1. Read [coding-guide.md](./development/coding-guide.md) for comprehensive coding conventions
2. Review [database.md](./technical/database.md) for data model understanding
3. Review [requirements.md](./product/requirements.md) for feature requirements

### For Human Developers

1. **Setup**: Follow [setup-guide.md](./technical/setup-guide.md)
2. **Understand requirements**: Read [requirements.md](./product/requirements.md)
3. **Check conventions**: Review [coding-guide.md](./development/coding-guide.md)
4. **Run tests**: `npm test`
5. **Submit changes**: Follow git workflow in project root

---

## Documentation Maintenance

### When to Update Documentation

**Requirements Changes:**
- Update [requirements.md](./product/requirements.md) when business logic changes

**Technical Changes:**
- Update [database.md](./technical/database.md) when schema changes
- Update [tech-stack.md](./technical/tech-stack.md) when dependencies change
- Update [setup-guide.md](./technical/setup-guide.md) when setup process changes
- Update [deployment.md](./technical/deployment.md) when the deploy pipeline changes, a hosting/service setting changes, or **any new environment variable or edge-function secret is introduced** — its configuration inventory is only useful if it stays exhaustive

**Development Changes:**
- Update [coding-guide.md](./development/coding-guide.md) when new patterns emerge
- Update [testing.md](./development/testing.md) when testing approach changes

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
See [requirements.md](./product/requirements.md) for complete feature requirements.

### How does the app get to production?
A human runs `./deploy_prod.sh` from `main`. See [deployment.md](./technical/deployment.md) for the full pipeline, service reference, and rollback procedures.

### Where do I set an environment variable or API key for production?
Frontend `VITE_*` values go in the Cloudflare Pages dashboard; edge-function secrets go through `supabase secrets set`. See the [configuration inventory](./technical/deployment.md#configuration-inventory) for the complete list of both.

---

## External Resources

- **Supabase Documentation**: https://supabase.com/docs
- **React Documentation**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Shadcn/ui**: https://ui.shadcn.com
- **Vite Guide**: https://vitejs.dev/guide/

