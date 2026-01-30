# Tech Stack

This document outlines the technology stack used and why we chose them.

## Frontend

### Frameworks

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

## Backend

### Supabase

Supabase provides data persistence, authentication, and API calls.

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

- **react-hook-form** - Performant form library
- **zod** - TypeScript-first schema validation
- Integrated with Shadcn/ui Form components

### UI Enhancements

- **react-slick** - Carousel/slider components
- **react-responsive-masonry** - Masonry grid layouts
- **react-dnd** - Drag and drop interactions
- **motion/react** (formerly Framer Motion) - Animation library
- **popper.js** - Tooltip and popover positioning
- **sonner** - Toast notifications

### Date Handling

- **date-fns** - Modern date utility library
  - Used with Shadcn/ui Calendar component

### Rich Text

- **@uiw/react-md-editor** - Markdown editor (as used in MarkdownEditor.tsx)

## File Structure Patterns

```
/
├── App.tsx                         # Main application entry point (REQUIRED)
├── components/                     # Application components
│   ├── ui/                         # Shadcn/ui components (DO NOT modify structure)
│   ├── figma/                      # Figma Make system components (PROTECTED)
│   │   └── ImageWithFallback.tsx   # Image component with fallback
│   └── [Feature]Screen.tsx         # Feature-specific screens
├── styles/
│   └── globals.css                 # Tailwind v4 config & design tokens
└── guidelines/                     # Project documentation
```

