# Figma Make Tech Stack

This document outlines the technology stack used by Figma Make for building web applications, including both UX-only prototypes and fully functioning applications with backend integration.

## Core Stack (All Applications)

### Frontend Framework

- **React** - Component-based UI library
- **TypeScript** - Type-safe JavaScript (inferred from .tsx files)

### Styling

- **Tailwind CSS v4.0** - Utility-first CSS framework
  - Custom design tokens configured in `/styles/globals.css`
  - No `tailwind.config.js` required (using Tailwind v4)

### UI Component Library

- **Shadcn/ui** - High-quality, accessible React components
  - Located in `/components/ui/`
  - Built on Radix UI primitives
  - Fully customizable and composable

## Backend Options

### Recommended: Supabase (Full-Stack Applications)

When you request a fully functioning application with real data persistence, authentication, or API calls, Figma Make recommends **Supabase** as the backend solution.

#### What Supabase Provides:

1. **PostgreSQL Database**
   - Relational database for structured data
   - Row-level security (RLS) policies
   - Real-time subscriptions
   - Full SQL support

2. **Authentication**
   - Multiple providers (Google OAuth, GitHub, Email, etc.)
   - Session management
   - User metadata storage
   - JWT tokens

3. **Storage**
   - File uploads and management
   - CDN-backed asset delivery
   - Access control policies

4. **Edge Functions**
   - Serverless functions for custom backend logic
   - TypeScript support
   - Deployed globally on Deno runtime

5. **Real-time**
   - WebSocket-based real-time subscriptions
   - Live data updates across clients
   - Presence tracking

6. **RESTful API**
   - Auto-generated from database schema
   - Query filtering, sorting, pagination
   - Type-safe client library

#### Implementation Approach:

- **Supabase JS Client** (`@supabase/supabase-js`) for frontend integration
- **Environment Variables** for secure credential storage
- **Row-Level Security** for multi-tenant data isolation
- **Database Functions** for complex business logic

## Supporting Libraries

### Icons

- **lucide-react** - Beautiful, consistent icon set
  - Modern, clean SVG icons
  - Tree-shakeable

### Data Visualization

- **recharts** - Composable charting library
  - Built on D3.js
  - React-friendly API

### Forms & Validation

- **react-hook-form@7.55.0** - Performant form library
- **zod** - TypeScript-first schema validation
- Integrated with Shadcn/ui Form components

### UI Enhancements

- **react-slick** - Carousel/slider components
- **react-responsive-masonry** - Masonry grid layouts
- **react-dnd** - Drag and drop interactions
- **motion/react** (formerly Framer Motion) - Animation library
- **popper.js** - Tooltip and popover positioning
- **sonner@2.0.3** - Toast notifications

### Date Handling

- **date-fns** - Modern date utility library
  - Used with Shadcn/ui Calendar component

### Rich Text

- **@uiw/react-md-editor** - Markdown editor (as used in MarkdownEditor.tsx)

## Tech Stack Variability

### Fixed Components

- ✅ **React** - Always used
- ✅ **Tailwind CSS** - Always used for styling
- ✅ **Shadcn/ui** - Standard UI component library
- ✅ **TypeScript** - Inferred from .tsx files

### Variable Components

- 🔄 **Backend** - Supabase recommended, but can be:
  - Mock data (UX-only mode)
  - Other backends (if explicitly requested)
  - External APIs with mock responses
- 🔄 **Additional Libraries** - Selected based on requirements:
  - Charts: recharts
  - Animation: motion/react
  - Forms: react-hook-form
  - Drag & Drop: react-dnd
  - And others as needed

### Not Supported

- ❌ **Next.js** - Figma Make uses a client-side React SPA architecture, not Next.js
- ❌ **Next.js App Router** - Not applicable (no Next.js support)
- ❌ **Prisma ORM** - Not supported; use Supabase client for database operations
- ❌ **react-resizable** - Use `re-resizable` instead
- ❌ **Konva** - Use HTML5 Canvas directly
- ❌ **Custom build tools** - Uses built-in bundler

## Application Architecture

### Single-Page Application (SPA)

Figma Make generates **client-side React SPAs**, not server-side rendered applications. This means:

- ✅ **Entry Point**: `/App.tsx` - Required default export, main component
- ✅ **Client-Side Routing**: React state/conditional rendering or libraries like `react-router-dom`
- ✅ **Build Target**: Static bundle (HTML, CSS, JS)
- ✅ **Deployment**: Any static hosting (Vercel, Netlify, GitHub Pages, etc.)

- ❌ **No Server-Side Rendering (SSR)** - Not a Next.js application
- ❌ **No API Routes** - Use Supabase Edge Functions or external APIs instead
- ❌ **No File-Based Routing** - No Next.js App Router or Pages Router
- ❌ **No Server Components** - Pure client-side React

### Why Not Next.js?

Figma Make is optimized for:

1. **Rapid prototyping** - Zero configuration, instant preview
2. **Pure frontend development** - No server setup required
3. **Portability** - Runs entirely in the browser
4. **Simplicity** - Single entry point, straightforward component model

For production applications requiring SSR, SEO optimization, or API routes, you would need to migrate the generated code to a Next.js project manually.

### Why Not Prisma?

Figma Make uses **Supabase** instead of Prisma because:

1. **Supabase is full-stack BaaS** - Database + Auth + Storage + Real-time in one
2. **No server required** - Direct client-to-database with RLS security
3. **Auto-generated APIs** - No need to write backend code
4. **Built-in type safety** - TypeScript types generated from schema
5. **Real-time subscriptions** - Live data updates out of the box

Prisma requires a Node.js server layer, which conflicts with Figma Make's client-side architecture.

## File Structure Patterns

```
/
├── App.tsx                          # Main application entry point (REQUIRED)
├── components/                      # Application components
│   ├── ui/                         # Shadcn/ui components (DO NOT modify structure)
│   ├── figma/                      # Figma Make system components (PROTECTED)
│   │   └── ImageWithFallback.tsx   # Image component with fallback
│   └── [Feature]Screen.tsx         # Feature-specific screens
├── styles/
│   └── globals.css                 # Tailwind v4 config & design tokens
└── guidelines/                     # Project documentation
```

**Key Constraints:**

- `/App.tsx` must exist and have a default export
- No `pages/` or `app/` directories (not Next.js)
- No `api/` routes (use Supabase or external APIs)
- All components are `.tsx` files

## Migration Path

### Using Figma Make → Next.js (Manual Migration)

If you need Next.js features (SSR, API routes, file-based routing), you'll need to manually migrate:

#### Step 1: Create Next.js Project

```bash
npx create-next-app@latest gig-manager-next --typescript --tailwind --app
```

#### Step 2: Port Components

- Copy `/components/*` to Next.js `app/components/` or `components/`
- Update imports to use Next.js conventions
- Replace `/App.tsx` logic with `app/page.tsx` or `app/layout.tsx`

#### Step 3: Adapt for Server Components

```typescript
// Before (Figma Make - Client Component)
"use client"; // Add this directive
import { useState } from "react";

// After (Next.js - can use Server Component if no state)
import { getGigs } from "./actions"; // Server action
const gigs = await getGigs();
```

#### Step 4: Replace Supabase Client Calls

Option A - Keep Supabase (server-side):

```typescript
// app/actions/gigs.ts
"use server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function getGigs() {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.from("gigs").select("*");
  return data;
}
```

Option B - Use Prisma (requires backend):

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// app/actions/gigs.ts
("use server");
export async function getGigs() {
  return await prisma.gig.findMany({
    include: { venue: true, act: true, tags: true },
  });
}
```

#### Step 5: Update Routing

- Replace conditional rendering with Next.js routing
- Use `app/gigs/page.tsx`, `app/gigs/[id]/page.tsx`, etc.
- Leverage `useRouter()` from `next/navigation`

#### Step 6: Optimize for Next.js

- Use `next/image` for optimized images
- Add metadata exports for SEO
- Implement API routes in `app/api/` if needed
- Configure `next.config.js` for deployment

**Trade-offs:**

- ✅ **Gain**: SSR, SEO, API routes, better performance
- ❌ **Lose**: Simplicity, instant preview, zero config
- ⚠️ **Complexity**: Requires understanding of Server/Client Components, server actions, and Next.js architecture

## Privacy & Security Notice

As mentioned in Figma Make guidelines:

- **Not for PII** - Figma Make is not designed for collecting personally identifiable information
- **Not for sensitive data** - Should not be used for securing highly sensitive information
- **Prototyping focus** - Best suited for prototypes, demos, and internal tools

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS v4**: https://tailwindcss.com
- **React Documentation**: https://react.dev

## Comparison Table

| Feature             | Figma Make (Current)  | + Supabase            | + Next.js                    | + Next.js + Prisma           |
| ------------------- | --------------------- | --------------------- | ---------------------------- | ---------------------------- |
| **Architecture**    | Client SPA            | Client SPA            | Hybrid SSR/SPA               | Hybrid SSR/SPA               |
| **Entry Point**     | `/App.tsx`            | `/App.tsx`            | `app/page.tsx`               | `app/page.tsx`               |
| **Routing**         | Manual/react-router   | Manual/react-router   | File-based                   | File-based                   |
| **Database**        | Mock data             | PostgreSQL (Supabase) | PostgreSQL (Supabase/Prisma) | PostgreSQL (Prisma)          |
| **Auth**            | Mock                  | Supabase Auth         | NextAuth/Supabase            | NextAuth                     |
| **API Layer**       | None                  | Auto-generated        | API routes/Server actions    | API routes/Server actions    |
| **Real-time**       | None                  | Built-in (Supabase)   | Built-in (Supabase)          | Custom (WebSockets)          |
| **Deployment**      | Any static host       | Any static host       | Vercel/specialized           | Vercel/specialized + DB host |
| **Server Required** | ❌ No                 | ❌ No                 | ✅ Yes (Edge/Node)           | ✅ Yes (Node + DB)           |
| **Configuration**   | Zero                  | Minimal               | Moderate                     | Complex                      |
| **SEO**             | Limited (client-only) | Limited (client-only) | ✅ Full SSR                  | ✅ Full SSR                  |
| **Learning Curve**  | Low                   | Low-Medium            | Medium-High                  | High                         |
| **Best For**        | Prototypes, demos     | Production SPAs       | Full websites, SEO apps      | Enterprise apps              |

## Summary

**What Figma Make IS:**

- ✅ Client-side React SPA generator
- ✅ Zero-config rapid prototyping tool
- ✅ Tailwind CSS + Shadcn/ui based
- ✅ Supabase-integrated when backend is needed
- ✅ Perfect for UX validation and demos

**What Figma Make IS NOT:**

- ❌ Next.js application builder
- ❌ Server-side rendered framework
- ❌ Full-stack framework with API routes
- ❌ ORM-integrated development environment
- ❌ Production-ready for SEO-critical sites

**Choose Figma Make When:**

- You need a prototype fast
- You're validating UX/UI concepts
- You want a deployable demo without backend complexity
- You're building internal tools or dashboards
- You can use Supabase for backend needs

**Migrate Away When:**

- You need server-side rendering for SEO
- You require custom API logic that Supabase can't provide
- You have existing backend infrastructure
- You need file-based routing (Next.js App Router)
- Your team is already invested in Next.js/Prisma

## Questions?

The tech stack is designed to be:

- **Focused** - Optimized for rapid prototyping
- **Modern** - Uses current best practices (React, Tailwind, TypeScript)
- **Type-safe** - TypeScript throughout
- **Pragmatic** - Supabase for backend, no server complexity

Choose the approach that best fits your development workflow and timeline. Figma Make excels at getting ideas into code quickly; migration to production frameworks is straightforward when needed.