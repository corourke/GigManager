---
description: Repository Information Overview
alwaysApply: true
---

# Repository Information Overview

## Repository Summary
GigManager is a comprehensive web application designed for production and event management companies. It facilitates the management of events, equipment inventory, and staff scheduling. The project follows a modern full-stack architecture with a React-based frontend and a Supabase-powered backend.

## Repository Structure
- **`src/`**: React frontend application source code.
- **`supabase/`**: Backend configuration, including database schemas, migrations, and edge functions.
- **`docs/`**: Technical and product documentation.
- **`node_modules/`**: Frontend dependencies.

### Main Repository Components
- **Frontend (GigManager)**: A React SPA built with Vite and TypeScript, featuring a responsive UI using Radix UI and Tailwind CSS.
- **Backend (Supabase)**: Provides authentication, real-time database (PostgreSQL), and serverless Edge Functions (Deno).

## Projects

### Frontend (GigManager)
**Configuration File**: `package.json`

#### Language & Runtime
**Language**: TypeScript / React 18  
**Version**: Node.js 18+  
**Build System**: Vite 6  
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- `@supabase/supabase-js`: Supabase client integration
- `react`, `react-dom`: UI framework
- `react-hook-form`, `zod`: Form management and validation
- `lucide-react`: Icon library
- `@radix-ui/*`: Accessible UI primitives
- `recharts`: Data visualization
- `tailwind-merge`, `clsx`: CSS utility management

**Development Dependencies**:
- `vite`: Build tool
- `vitest`: Testing framework
- `@testing-library/react`: UI testing utilities
- `typescript`: Static typing

#### Build & Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

#### Testing
**Framework**: Vitest  
**Test Location**: `src/test/` and alongside components  
**Naming Convention**: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`  
**Configuration**: `vitest.config.ts`

**Run Command**:
```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with UI
npm run test:ui
```

### Backend (Supabase)
**Type**: Backend-as-a-Service (Supabase)

#### Specification & Tools
**Type**: Supabase Project  
**Version**: PostgreSQL 15+ (managed by Supabase)  
**Required Tools**: Supabase CLI (optional but recommended for local dev), Node.js (for frontend integration)

#### Key Resources
**Main Files**:
- `supabase/schema.sql`: Primary database schema definition.
- `supabase/migrations/`: SQL migration files for versioned schema changes.
- `supabase/functions/server/index.tsx`: Main Deno-based Edge Function.

**Configuration Structure**:
- Database schema is centralized in `schema.sql`.
- Edge functions are located in `supabase/functions/`, using Deno runtime and JSR imports.

#### Usage & Operations
**Key Commands**:
```bash
# Apply schema to Supabase project via SQL Editor or CLI
# (Manual process described in README)
```

**Integration Points**:
- Frontend communicates via `@supabase/supabase-js`.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

#### Validation
**Quality Checks**: Manual verification via Supabase Dashboard, frontend unit tests for integration logic.
**Testing Approach**: Backend logic in Edge Functions is validated through frontend integration tests and manual API testing.
