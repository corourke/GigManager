# GigManager AI Coding Guide

**Purpose**: This document provides comprehensive coding guidelines, conventions, and patterns for AI agents working on the GigManager codebase. It consolidates all coding rules, TypeScript/React patterns, and best practices into a single reference.

**Audience**: AI coding assistants, developers, and code reviewers

**Last Updated**: 2026-01-18



---

## Application Context

**GigManager** is a production and event management platform used by sound and lighting companies to track gigs, venues, acts, equipment, staffing, and finances. It can also be used by organizations participating in the delivery of events such as production companies, talent agents, venues, and rental companies. 

**Brand Values**: Professional, Efficient, Modern, Accessible

This is a full production application with:

- Complete Supabase PostgreSQL database with custom schema
- Multiple custom tables (users, organizations, gigs, assets, etc.)
- Existing migration files in `/supabase/migrations/`
- User authentication via Supabase
- Custom RLS policies managed at application layer

## General Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

Be sure to keep the plan documents updated, marking tasks done as they are completed. This includes both high-level plans (i.e. @plan.md) as well as 
detailed implementation plans (i.e. implementation-plan.md).

Allow the user to complete manual verfication steps in the plan before moving on.

## Database Modifications

**You CAN**:
- Write migration files to `/supabase/migrations/`
- Provide DDL statements for the Supabase SQL Editor
- Update migration documentation when schema changes are needed

**Migration Workflow**:
1. Create migration SQL files in `/supabase/migrations/`
2. Update database documentation files in `/docs/technical/database.md`
3. Provide instructions for running migrations in Supabase SQL Editor

**Note**: The KV store limitations DO NOT apply to this project.

### Data Handling Guidelines

- **Partial Updates**: When updating data through user edit actions (form or inline editing), ONLY update database columns for values that have been changed in the UI. Do not make changes to column values that haven't changed to avoid triggering unnecessary change logic in the back-end.
- **Migration Assumptions**: It is not necessary to gracefully handle cases where tables don't exist - we will always assume migrations have been run.
- **No Mock Data**: Do not add or maintain any code to handle mock data - we are using a live database.

---

## Technology Stack

### Core Framework

- **React 18.3.1**: Function components with hooks
- **TypeScript**: Strict type checking enabled
- **Vite 6.3.5**: Build tool and dev server (not Next.js)

### UI & Styling

- **Tailwind CSS v4.0**: Utility-first styling
- **Shadcn/ui**: Component library based on Radix UI
- **Lucide React**: Icon library

### Forms & Validation

- **react-hook-form 7.55.0**: Form state management
- **zod**: Schema validation and type inference
- **@hookform/resolvers**: Integration layer

### Backend & Database

- **Supabase**: PostgreSQL database with RLS
- **@supabase/supabase-js**: Supabase client library
- Direct database access (not Supabase Functions for queries)

### Supporting Libraries

- **date-fns**: Date manipulation
- **papaparse**: CSV parsing
- **sonner**: Toast notifications
- **recharts**: Data visualization

### Testing

- **Vitest 4.0.10**: Test runner
- **@testing-library/react 14.1.2**: Component testing
- **jsdom 23.0.1**: DOM environment for tests

---

## Coding Principles

### 1. Code Readability First, Type Safety Second

- This is a TypeScript project, however, don't sacrifice code readability to achieve strict mode compliance. Strive for type safety, but don't go to unnatural lengths to do so, and keep readability and maintainability of the code at the forefront. 
- Where practical, define explicit types for props, state, and function returns
- Avoid `any` types except in necessary edge cases
- Use type inference where appropriate

### 2. Organization Context

Users are allowed to see gigs, and the tables related to gigs, if they are a member of an organization that is a participant in the gig. They are also able to see assets, kits and documents that are owned by an organization that they are a member of. They can also view users within their organization. 

- **Every API route must verify user membership** in the organization
- **Every database query must filter by `organization_id`** (enforced by RLS)
- **Use middleware or helper functions** to extract and validate organization context
- **Default to rejecting access** if organization membership cannot be verified
- **Never trust client-provided organization IDs** without server-side verification

### 3. Error Handling

- **Always use standardized error responses** consistent across the application
- Always catch and handle errors gracefully
- Log errors server-side for debugging
- Return user-friendly error messages (don't expose internal details)
- Use specific error codes for different error types
- Include validation details in `details` field for form validation errors

### 4. Database Access

- **Always include `organization_id` in WHERE clauses** for tenant-scoped queries
- **Use transactions for multi-step operations** that must be atomic
- Ensure referential integrity
- Use UUIDs for all primary keys
- Timestamps use server-side defaults

### 5. Security

- **Never trust client input** - always validate on the server
- **Verify authentication** before any protected operation
- **Verify authorization** (organization membership, role) before sensitive operations
- **Sanitize user input** before displaying (React handles this by default, but be careful with `dangerouslySetInnerHTML`)
- **Use HTTPS in production**
- **Never expose sensitive data** in error messages or logs

### 6. Performance

- **Use database indexes** for frequently queried fields
- **Implement pagination** for large result sets
- **Use `select` to limit fields** returned from database when possible
- **Cache frequently accessed data** when appropriate
- Optimize re-renders with React.memo when needed

### 7. Maintainability

- **Write self-documenting code** with clear variable and function names
- **Extract reusable logic** into utility functions
- **Keep functions focused** on a single responsibility
- **Add comments for complex business logic**
- Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
- Refactor code as you go to keep code clean
- **Keep components small and focused** - Put helper functions and components in their own files

---

## TypeScript Conventions

### Type Definitions

**Use explicit types for props and state:**

```typescript
// Component props interface
interface AssetScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId?: string | null;
  onCancel: () => void;
  onAssetCreated: (assetId: string) => void;
}

// Form data interface
interface FormData {
  category: string;
  manufacturer_model: string;
  cost: string;
  insurance_policy_added: boolean;
}
```

**Export types from centralized locations:**

- Shared types in `src/App.tsx`: `Organization`, `User`, `UserRole`, `OrganizationType`
- Database types in `src/utils/supabase/types.ts`: `DbAsset`, `DbGig`, etc.
- Form-specific types defined inline in component files

### Type Safety Patterns

**Use string literal types for enums:**

```typescript
// In App.tsx
export type UserRole = 'Admin' | 'Manager' | 'Staff' | 'Viewer';

// Usage
const role: UserRole = 'Admin';
```

**Use proper null/undefined handling:**

```typescript
// Good: Explicit null check
if (user?.email) {
  sendEmail(user.email);
}

// Good: Optional chaining with nullish coalescing
const displayName = user?.name ?? 'Anonymous';

// Avoid: Non-null assertion (!)
const email = user!.email; // Don't do this
```

**Type function parameters and returns explicitly:**

```typescript
// Good: Explicit types
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Avoid: Implicit any
function formatCurrency(amount) { // Missing type
  return amount.toFixed(2);
}
```

### Database Type Patterns

**Map database types to application types:**

```typescript
// Database type (from Supabase)
interface DbAsset {
  id: string;
  organization_id: string;
  category: string;
  manufacturer_model: string;
  cost: number | null;
  created_at: string;
  updated_at: string;
}

// Application type (used in components)
interface Asset {
  id: string;
  organizationId: string;
  category: string;
  manufacturerModel: string;
  cost: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Conversion function
function dbAssetToAsset(dbAsset: DbAsset): Asset {
  return {
    id: dbAsset.id,
    organizationId: dbAsset.organization_id,
    category: dbAsset.category,
    manufacturerModel: dbAsset.manufacturer_model,
    cost: dbAsset.cost,
    createdAt: new Date(dbAsset.created_at),
    updatedAt: new Date(dbAsset.updated_at),
  };
}
```

---

## Component Structure

### Component Pattern

**Use function components with TypeScript:**

```typescript
interface MyComponentProps {
  title: string;
  onSave: (data: FormData) => void;
  isLoading?: boolean;
}

export function MyComponent({ title, onSave, isLoading = false }: MyComponentProps) {
  // Component logic
  return (
    <div>
      <h1>{title}</h1>
      {/* JSX */}
    </div>
  );
}
```

### Screen Components

**Screen components follow this pattern:**

```typescript
interface AssetScreenProps {
  organization: Organization;
  user: User;
  assetId?: string | null;
  onCancel: () => void;
  onAssetCreated: (assetId: string) => void;
}

export function AssetScreen({
  organization,
  user,
  assetId,
  onCancel,
  onAssetCreated,
}: AssetScreenProps) {
  // 1. State hooks
  const [isLoading, setIsLoading] = useState(false);
  const [asset, setAsset] = useState<DbAsset | null>(null);
  
  // 2. Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });
  
  // 3. Effects
  useEffect(() => {
    if (assetId) {
      loadAsset(assetId);
    }
  }, [assetId]);
  
  // 4. Event handlers
  const handleSubmit = async (data: FormData) => {
    // Implementation
  };
  
  // 5. Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

### Component Organization

**Order within component:**

1. Props interface
2. Component function
3. State declarations (useState)
4. Form setup (useForm)
5. Effects (useEffect)
6. Event handlers
7. Helper functions (or extract to separate file)
8. Return/JSX

---

## Form Handling Patterns

### Form Setup with react-hook-form

**Standard form pattern:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define schema
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  cost: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// 2. In component
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    name: '',
    email: '',
    cost: '',
  },
});

// 3. Submit handler
const onSubmit = form.handleSubmit(async (data) => {
  try {
    await saveData(data);
    toast.success('Saved successfully');
  } catch (error) {
    toast.error('Failed to save');
  }
});
```

### Form Change Detection

**Use the simplified `useSimpleFormChanges` hook:**

```typescript
import { useSimpleFormChanges } from '@/utils/hooks/useSimpleFormChanges';

const { hasChanges, changedFields } = useSimpleFormChanges({
  form,
  initialNestedData: {
    staffSlots,
    kitAssignments,
  },
  currentNestedData: {
    staffSlots: currentStaffSlots,
    kitAssignments: currentKitAssignments,
  },
});

// Enable submit button when there are changes
<Button disabled={!hasChanges || isLoading}>Save</Button>
```

**Pattern**: The hook tracks both form field changes (via react-hook-form's `isDirty`) and nested data changes (via simple reference comparison).

### Form Field Rendering

**Use Shadcn/ui form components:**

```typescript
<Form {...form}>
  <form onSubmit={onSubmit}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name *</FormLabel>
          <FormControl>
            <Input {...field} placeholder="Enter name" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    
    <Button type="submit">Save</Button>
  </form>
</Form>
```

### Form Submission Pattern

**Partial updates in edit mode:**

```typescript
const onSubmit = form.handleSubmit(async (data) => {
  setIsLoading(true);
  
  try {
    if (isEditMode && entityId) {
      // Only send changed fields
      const updates = changedFields;
      await updateEntity(entityId, updates, organization.id);
    } else {
      // Create mode: send all fields
      const id = await createEntity(data, organization.id);
      onEntityCreated(id);
    }
    
    toast.success('Saved successfully');
  } catch (error) {
    console.error('Save error:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to save');
  } finally {
    setIsLoading(false);
  }
});
```

---

## API Integration Patterns

### API Function Structure

**API functions in `src/utils/api.tsx`:**

```typescript
export async function createAsset(
  assetData: Partial<DbAsset>,
  organizationId: string
): Promise<string> {
  try {
    const supabase = getSupabase();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to create assets');
    }
    
    // Insert with organization scoping
    const { data, error } = await supabase
      .from('assets')
      .insert({
        ...assetData,
        organization_id: organizationId,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Supabase error creating asset:', error);
      throw new Error(`Failed to create asset: ${error.message}`);
    }
    
    return data.id;
  } catch (err: any) {
    // Network error detection
    if (err?.message?.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your connection.');
    }
    throw err;
  }
}
```

### Organization Scoping Pattern

**Always filter by organization_id:**

```typescript
// Correct: Organization scoped
const { data } = await supabase
  .from('assets')
  .select('*')
  .eq('organization_id', organizationId);

// Wrong: Missing organization filter
const { data } = await supabase
  .from('assets')
  .select('*'); // SECURITY ISSUE!
```

### Error Handling Pattern

**Consistent error handling:**

```typescript
try {
  const result = await apiFunction();
  return result;
} catch (err: any) {
  // Network errors
  if (err?.message?.includes('Failed to fetch')) {
    throw new Error('Network error: Unable to connect to the server.');
  }
  
  // Re-throw with context
  console.error('API error:', err);
  throw err;
}
```

### Update Pattern with Timestamps

**Always update `updated_at`:**

```typescript
const { error } = await supabase
  .from('assets')
  .update({
    ...updates,
    updated_at: new Date().toISOString(),
  })
  .eq('id', assetId)
  .eq('organization_id', organizationId);
```

---

## State Management

### Component State

**Use useState for local component state:**

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<Asset[]>([]);
```

### App-Level State

**Pass state through props (no global state library currently):**

```typescript
// App.tsx manages:
// - user: User | null
// - selectedOrganization: Organization | null
// - currentRoute: Route

// Pass down to screens:
<AssetScreen
  organization={selectedOrganization}
  user={user}
  onCancel={handleCancel}
/>
```

### Form State

**Use react-hook-form for all form state:**

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: initialData,
});

// Access values
const name = form.watch('name');

// Set values
form.setValue('name', 'New Name');

// Reset form
form.reset(newData);
```

---

## Styling Conventions

### Tailwind CSS Patterns

**Use Tailwind utility classes:**

```typescript
// Layout
<div className="container mx-auto px-4 py-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Content */}
  </div>
</div>

// Responsive
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Responsive width */}
</div>

// State variants
<Button className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50">
  Save
</Button>
```

### Component Styling

**Use Shadcn/ui components with variant props:**

```typescript
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="destructive">Delete</Button>
```

### Responsive Design

**Mobile-first approach:**

```typescript
// Mobile first, then tablet, then desktop
<div className="
  p-4           /* mobile */
  md:p-6        /* tablet */
  lg:p-8        /* desktop */
">
  {/* Content */}
</div>
```

---

## Testing Conventions

### Testing Framework

**Use Vitest with React Testing Library:**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Testing Philosophy

**Simplified Testing Approach**:
- Focus on utility functions and business logic
- Avoid complex mocking (Supabase, react-hook-form)
- Test behavior, not implementation details
- Integration tests over unit tests where practical
- 60 passing tests covering form utilities, API, and components

### Test Organization

**Test files next to source:**

```
src/
  utils/
    form-utils.ts
    form-utils.test.ts
  components/
    MyComponent.tsx
    MyComponent.test.tsx
```

---

## File Organization

### Directory Structure

```
src/
  components/
    screens/          # Screen components (*Screen.tsx)
    shared/           # Shared components
    ui/               # Shadcn/ui components
    tables/           # Table components
    forms/            # Form-specific components
  utils/
    api.tsx           # API functions
    hooks/            # Custom hooks
    supabase/         # Supabase client
    form-utils.ts     # Form utilities
  App.tsx             # Root component
  main.tsx            # Entry point
```

### File Naming

- **Components**: PascalCase (e.g., `AssetScreen.tsx`)
- **Utilities**: camelCase (e.g., `form-utils.ts`)
- **Tests**: Same as source + `.test` (e.g., `form-utils.test.ts`)
- **Types**: Same as source or `types.ts`

---

## Naming Conventions

### Components

- **Screens**: `{Feature}Screen.tsx` (e.g., `GigScreen.tsx`)
- **Dialogs**: `{Feature}Dialog.tsx` (e.g., `EditUserProfileDialog.tsx`)
- **Shared**: Descriptive names (e.g., `UserProfileForm.tsx`)

### Functions

- **API functions**: Verb + noun (e.g., `createAsset`, `getGigs`, `updateUser`)
- **Event handlers**: `handle{Event}` (e.g., `handleSubmit`, `handleCancel`)
- **Utility functions**: Descriptive verbs (e.g., `formatCurrency`, `normalizeFormData`)

### Variables

- **Boolean**: `is/has/can` prefix (e.g., `isLoading`, `hasChanges`, `canEdit`)
- **Arrays**: Plural nouns (e.g., `assets`, `gigs`, `users`)
- **Objects**: Singular nouns (e.g., `asset`, `gig`, `user`)

### Constants

- **All caps**: For true constants (e.g., `MAX_FILE_SIZE`, `API_TIMEOUT`)
- **PascalCase**: For enum-like objects

---

## Error Handling

### User-Facing Errors

**Use toast notifications:**

```typescript
import { toast } from 'sonner';

try {
  await saveData();
  toast.success('Saved successfully');
} catch (error) {
  console.error('Error:', error);
  toast.error(error instanceof Error ? error.message : 'An error occurred');
}
```

### Form Validation Errors

**Display inline with FormMessage:**

```typescript
<FormField
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* Shows validation error */}
    </FormItem>
  )}
/>
```

### API Error Handling

**Consistent error messages:**

```typescript
export async function createAsset(data: any, orgId: string): Promise<string> {
  try {
    // API call
  } catch (err: any) {
    if (err?.message?.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to the server.');
    }
    throw new Error(`Failed to create asset: ${err.message}`);
  }
}
```

---

## Security & Organization Context

### Multi-Tenant Isolation

**Every query must be organization-scoped:**

```typescript
// Correct
const { data } = await supabase
  .from('assets')
  .select('*')
  .eq('organization_id', organizationId);

// Wrong - security issue!
const { data } = await supabase
  .from('assets')
  .select('*');
```

### Authentication Checks

**Verify user authentication:**

```typescript
const supabase = getSupabase();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  throw new Error('You must be logged in');
}
```

### Authorization Checks

**Verify user has access to organization:**

```typescript
// In App.tsx
const userRole = await getCurrentUserRole(user.id, selectedOrganization.id);

if (!userRole) {
  throw new Error('You do not have access to this organization');
}
```

### RLS Policies

**Rely on RLS for database-level security:**

All tables have RLS policies that enforce:
- Organization isolation (organization_id)
- User membership verification
- Role-based permissions where applicable

---

## UI/UX Guidelines

### UI Design Principles

- **Don't create separate components** for Add and Update screens - use one form component with logic to handle both Create and Update operations
- **Only use absolute positioning when necessary** - Opt for responsive and well-structured layouts using flexbox and grid by default
- **Refactor code as you go** to keep code clean
- **Keep file sizes small** - Put helper functions and components in their own files

### Mobile Considerations

Apply these mobile design principles to all screens:

- **Touch-friendly button size**: Minimum 44x44px
- **Touch-friendly input heights**: Minimum 44px
- **Full-screen layout** optimized for mobile viewport
- **Card-based layouts** that stack vertically on mobile
- **Larger touch targets** for interactive elements
- **Bottom sheets or modals** for secondary actions on mobile
- **Sticky headers or action buttons** where appropriate
- **Smooth scrolling** with action buttons sticky at bottom or after all fields
- **Native input types** for better mobile keyboard experience
- **Keyboard "Next" button** should navigate between fields logically
- **Progressive disclosure**: Show primary fields first, with expandable sections for optional fields

### Accessibility Standards

All screens must adhere to these accessibility standards:

- **Proper color contrast**: WCAG AA minimum
- **Keyboard navigation support**
- **Screen reader friendly labels**
- **Focus states visible**
- **Touch targets minimum 44x44px**
- **Form labels properly associated with inputs**
- **Table headers properly associated with cells**
- **Error messages clearly associated with form fields**
- **Loading states communicated to assistive technologies**

### Common UI States

Design these states for interactive elements:

#### Default States

- Ready for user interaction
- Clear visual hierarchy
- Prominent primary actions

#### Loading States

- Show loading indicators (spinners, skeletons)
- Disable interactive elements during loading
- Provide feedback that action is in progress
- Loading spinner on submit buttons during form submission

#### Error States

- Inline validation errors below form fields
- General error messages at top of forms or in toast notifications
- Visually distinct error styling (red borders, error icons)
- Clear error messages with actionable guidance
- Retry options where applicable
- Form remains accessible for correction

#### Empty States

- Helpful messaging explaining why the state is empty
- Clear call-to-action buttons
- Visual indicators (icons or illustrations) to reduce cognitive load

#### Success States

- Success messages/toasts after successful actions
- Brief confirmation before redirects
- Visual success indicators (green checkmarks, success colors)

### Form Design Patterns

#### Layout

- **Single-column form layout**: Centered on desktop, full-width on mobile
- **Form fields grouped logically**
- **Required field indicators**: Asterisk (*)
- **Help text** for optional fields where helpful

#### Validation

- **Inline validation errors** below each field
- **Real-time validation** where appropriate
- **Clear error messages**
- **Success indicators** for valid inputs

#### Form Actions

- **Primary button**: Right-aligned (desktop) or full-width (mobile)
- **Secondary button**: Left-aligned (desktop) or stacked above primary (mobile)
- **Buttons placed at bottom of form**
- **Disable submit button** during form submission

### User Experience Goals

- **Minimal friction** in user flows
- **Clear context**: Users always know where they are and what they're doing
- **Professional appearance** that builds trust
- **Intuitive navigation** and interactions
- **Progressive disclosure** of information
- **Helpful error messages** and validation feedback
- **Quick access to all data**: Fast filtering and search
- **Inline editing** for quick updates without page navigation
- **Clear status indicators** and organized information
- **Smooth experience on mobile** with appropriate patterns

---

## Quick Checklist

Before finalizing code, verify:

- [ ] Organization membership is verified
- [ ] Input is validated (client and server-side)
- [ ] Status changes are recorded in gig_status_history (for gigs)
- [ ] Timezones are handled explicitly
- [ ] Errors are caught and handled gracefully
- [ ] Types are properly defined
- [ ] All queries filter by `organization_id`
- [ ] Transactions used for multi-step operations
- [ ] Constants used instead of magic strings
- [ ] Loading states are shown during async operations
- [ ] Validation on both client and server
- [ ] Error messages don't expose internal details
- [ ] Touch targets meet 44x44px minimum (mobile)
- [ ] Proper color contrast (WCAG AA)
- [ ] Form labels properly associated with inputs
- [ ] Keyboard navigation works
- [ ] Components are small and focused (<500 lines ideal)

---

## Related Documentation

- [Development Plan](../development-plan.md) - Refactoring phases and roadmap
- [Feature Catalog](../../product/feature-catalog.md) - Complete feature inventory
- [Requirements](../../product/requirements.md) - Product requirements
- [Tech Stack](../../technical/tech-stack.md) - Technology overview
- [Database Documentation](../../technical/database.md) - Schema and RLS policies

---

**Last Updated**: 2026-01-18  
**Maintained By**: Development Team  
**Review Frequency**: Update when coding patterns or conventions change
