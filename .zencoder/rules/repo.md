---
description: Repository Information Overview
alwaysApply: true
---

# GigManager Information

## Summary
**GigManager** is a comprehensive management platform designed for organizing gigs, teams, assets, and kits. It features a modern **React** frontend and a **Supabase** backend, providing a robust architecture for multi-tenant data isolation, real-time updates, and secure authentication. The project emphasizes accessibility and composability using **Shadcn/ui** and **Tailwind CSS v4.0**.

## Structure
- [./src/](./src/): Frontend source code.
    - [./src/components/](./src/components/): UI screens and [./src/components/ui/](./src/components/ui/) Shadcn/ui components.
    - [./src/contexts/](./src/contexts/): Global state management (Auth, Navigation).
    - [./src/services/](./src/services/): API communication and business logic.
    - [./src/styles/](./src/styles/): Global CSS and Tailwind design tokens.
- [./supabase/](./supabase/): Backend configuration and database assets.
    - [./supabase/functions/](./supabase/functions/): Deno-based Edge Functions for custom backend logic.
    - [./supabase/migrations/](./supabase/migrations/): SQL migration files for database schema evolution.
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
- **Tailwind CSS 4.0**: Utility-first styling.
- **Lucide React**: Icon set.
- **Zod**: Schema validation.
- **React Hook Form**: Form state management.
- **Recharts**: Data visualization.
- **Sonner**: Toast notifications.

**Development Dependencies**:
- **Vitest**: Testing framework.
- **@testing-library/react**: React component testing.
- **jsdom**: Browser environment simulation for tests.

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
**Database**: PostgreSQL 17  
**Auth**: Integrated Supabase Auth (Email, OAuth)  
**Edge Functions**: Located in [./supabase/functions/](./supabase/functions/), running on Deno.  
**Configuration**: Defined in [./supabase/config.toml](./supabase/config.toml).

## Testing
**Framework**: Vitest  
**Test Location**: [./src/test/](./src/test/) and co-located files.  
**Naming Convention**: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`  
**Configuration**: [./vitest.config.ts](./vitest.config.ts)  

**Run Command**:
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```
