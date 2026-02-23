---
description: Repository Information Overview
alwaysApply: true
---

# GigManager Information

## Summary
**GigManager** is a comprehensive production and event management platform designed for organizing gigs, teams, finances and equipment. It features a multi-tenant architecture that allows different organizations (venues, acts, production companies) to collaborate on the same events while maintaining private data isolation through Supabase Row-Level Security (RLS). The system supports real-time updates, secure authentication, and a composable UI built with **React**, **Shadcn/ui**, and **Tailwind CSS v4.0**.

## Structure
- [./src/](./src/): Frontend source code.
    - [./src/components/](./src/components/): UI screens and [./src/components/ui/](./src/components/ui/) Shadcn/ui components.
    - [./src/contexts/](./src/contexts/): Global state management (Auth, Navigation).
    - [./src/services/](./src/services/): API communication and business logic.
    - [./src/styles/](./src/styles/): Global CSS and Tailwind design tokens.
    - [./src/utils/](./src/utils/): Utility functions, API clients, and Supabase hooks.
    - [./src/config/](./src/config/): Configuration files and seed data.
- [./supabase/](./supabase/): Backend configuration and database assets.
    - [./supabase/functions/](./supabase/functions/): Deno-based Edge Functions for custom backend logic (e.g., `server` function).
    - [./supabase/migrations/](./supabase/migrations/): SQL migration files for database schema evolution.
    - [./supabase/dump/](./supabase/dump/): Database schema and data dumps.
    - [./supabase/seed.sql](./supabase/seed.sql): Database seeding scripts for development.
- [./docs/](./docs/): Extensive project documentation covering technical, product, and development aspects.

## Language & Runtime
**Language**: TypeScript  
**Version**: Node.js (Frontend), Deno 2 (Supabase Edge Runtime)  
**Build System**: Vite 6.3.5  
**Package Manager**: npm  

## Dependencies
**Main Dependencies**:
- **React 18.3.1**: Core UI framework.
- **@supabase/supabase-js**: Client library for backend interaction.
- **Radix UI**: Accessible UI primitives (Accordion, Dialog, Tabs, etc.).
- **Tailwind CSS 4.0**: Utility-first styling with design tokens.
- **Lucide React 0.487.0**: Scalable vector icon set.
- **Zod**: TypeScript-first schema validation.
- **React Hook Form 7.55.0**: Performant form state management.
- **Recharts 2.15.2**: Composable charting library.
- **Sonner 2.0.3**: Elegant toast notifications.
- **Date-fns**: Modern JavaScript date utility library.
- **PapaParse 5.5.3**: Fast CSV parser for data imports.

**Development Dependencies**:
- **Vitest 4.0.10**: Next-generation testing framework.
- **@testing-library/react 14.1.2**: Simple and complete React testing utilities.
- **jsdom 23.0.1**: Browser environment simulation for unit tests.
- **@vitejs/plugin-react-swc**: Fast React plugin for Vite using SWC.

## Build & Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Backend (Supabase)
**Database**: PostgreSQL 17 (Managed via migrations)  
**Auth**: Integrated Supabase Auth supporting Email and OAuth flows.  
**Edge Functions**: Located in [./supabase/functions/](./supabase/functions/), running on Deno.  
**Key Features**:
- **Row-Level Security (RLS)**: Ensures data isolation between organizations.
- **Custom Types**: Extensive use of Postgres Enums for statuses (`gig_status`), roles (`user_role`), and categories.
- **Real-time**: Leverages Postgres CDC for live UI updates.

## Main Files & Resources
- **Entry Point**: [./src/main.tsx](./src/main.tsx) (React initialization)
- **Main App Component**: [./src/App.tsx](./src/App.tsx) (Custom routing and global state)
- **Supabase Config**: [./supabase/config.toml](./supabase/config.toml) (Local development settings)
- **Database Schema**: [./supabase/migrations/20260209000000_initial_schema.sql](./supabase/migrations/20260209000000_initial_schema.sql)
- **Documentation**: [./docs/README.md](./docs/README.md) (Central hub for project docs)

## Testing
**Framework**: Vitest  
**Test Location**: [./src/test/](./src/test/) and co-located `*.test.tsx` files.  
**Naming Convention**: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`  
**Configuration**: [./vitest.config.ts](./vitest.config.ts) and [./src/test/setup.ts](./src/test/setup.ts) (Mocks Supabase).

**Run Command**:
```bash
# Run all tests (watch mode)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```
