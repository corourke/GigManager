# Coding Conventions

**Purpose**: This document defines the TypeScript, React, and architectural patterns used in the GigManager codebase to ensure consistency and maintainability.

**Last Updated**: 2026-01-17  
**Reference**: Also see [BASE_CODING_PROMPT.md](../BASE_CODING_PROMPT.md) for comprehensive coding guidelines

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [TypeScript Conventions](#typescript-conventions)
3. [Component Structure](#component-structure)
4. [Form Handling Patterns](#form-handling-patterns)
5. [API Integration Patterns](#api-integration-patterns)
6. [State Management](#state-management)
7. [Styling Conventions](#styling-conventions)
8. [Testing Conventions](#testing-conventions)
9. [File Organization](#file-organization)
10. [Naming Conventions](#naming-conventions)
11. [Error Handling](#error-handling)
12. [Security & Organization Context](#security--organization-context)

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

## TypeScript Conventions

### Type Definitions

**Use explicit types for props and state:**

```typescript
// Component props interface
interface CreateAssetScreenProps {
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

export type OrganizationType = 
  | 'Production'
  | 'Sound'
  | 'Lighting'
  | 'Staging'
  | 'Rentals'
  | 'Venue'
  | 'Act'
  | 'Agency';
```

**Use optional chaining and nullish coalescing:**

```typescript
// Safe navigation
const userName = user?.first_name ?? 'Unknown';
const orgName = organization?.name;

// Conditional rendering
{user?.first_name && <span>{user.first_name}</span>}
```

**Avoid `any` types:**

```typescript
// Bad
function processData(data: any) { }

// Good
function processData(data: FormData) { }
function processData<T extends Record<string, any>>(data: T) { }
```

---

## Component Structure

### Screen Components

Screen components are page-level components that correspond to routes. Follow this structure:

```typescript
// 1. Imports (grouped logically)
import { useState, useEffect } from 'react';
import { Package, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import AppHeader from './AppHeader';
import type { Organization, User, UserRole } from '../App';
import { getAsset, createAsset, updateAsset } from '../utils/api';
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';

// 2. Type definitions
interface CreateAssetScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  assetId?: string | null;
  onCancel: () => void;
  onAssetCreated: (assetId: string) => void;
}

interface FormData {
  category: string;
  manufacturer_model: string;
  // ...
}

// 3. Component function
export default function CreateAssetScreen({
  organization,
  user,
  userRole,
  assetId,
  onCancel,
  onAssetCreated,
}: CreateAssetScreenProps) {
  // 4. State declarations
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ... });
  
  // 5. Derived state
  const isEditMode = !!assetId;
  
  // 6. Effects
  useEffect(() => {
    // Load data if edit mode
  }, [assetId]);
  
  // 7. Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    // Handle form submission
  };
  
  const handleCancel = () => {
    onCancel();
  };
  
  // 8. Render
  return (
    <div className="flex flex-col h-screen">
      <AppHeader 
        organization={organization}
        user={user}
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-auto">
        {/* Content */}
      </main>
    </div>
  );
}
```

### Shared Components

Shared components are reusable across multiple screens:

```typescript
// UserSelector.tsx - Example shared component
interface UserSelectorProps {
  organizationId: string;
  selectedUserId?: string | null;
  onChange: (userId: string | null) => void;
  label?: string;
  error?: string;
}

export default function UserSelector({
  organizationId,
  selectedUserId,
  onChange,
  label = 'Select User',
  error,
}: UserSelectorProps) {
  // Component logic
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### Component Size Guidelines

- **Keep components focused**: Single responsibility principle
- **Extract large sections**: Components over 500 lines should be reviewed for extraction opportunities
- **Create sub-components**: For repeated patterns or complex sections
- **Use custom hooks**: Extract complex logic into reusable hooks

**Example - Extract sections from large components:**

```typescript
// CreateGigScreen.tsx (2,091 lines - too large)
// Consider extracting:
// - StaffSlotsSection.tsx
// - ParticipantsSection.tsx
// - KitAssignmentsSection.tsx
// - BidManagementSection.tsx
```

---

## Form Handling Patterns

### Form State Management

**Use react-hook-form for form fields:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const assetSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  manufacturer_model: z.string().min(1, 'Model is required'),
  cost: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

// In component
const form = useForm<AssetFormData>({
  resolver: zodResolver(assetSchema),
  defaultValues: {
    category: '',
    manufacturer_model: '',
    cost: '',
  },
});
```

### Change Detection

**Use useSimpleFormChanges for dirty state tracking:**

```typescript
import { useSimpleFormChanges } from '../utils/hooks/useSimpleFormChanges';

// With react-hook-form
const changeDetection = useSimpleFormChanges({
  form,
  initialData: originalData,
  currentData: { participants, staffSlots }, // Nested data not in form
});

// Access dirty state
const hasChanges = changeDetection.hasChanges;
const changedFields = changeDetection.changedFields;

// Disable save button if no changes
<Button type="submit" disabled={!hasChanges || isSaving}>
  Save Changes
</Button>
```

**Pattern**: Phase 2 simplification - use built-in `form.formState.isDirty` for form fields, track nested data separately with simple reference comparison.

### Form Submission

**Pattern for partial updates (edit mode):**

```typescript
import { createSubmissionPayload, normalizeFormData } from '../utils/form-utils';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);
  
  try {
    // Normalize data (trim strings, convert empty to null)
    const normalized = normalizeFormData(formData);
    
    // Only send changed fields in edit mode
    const payload = isEditMode
      ? createSubmissionPayload(normalized, originalData)
      : normalized;
    
    if (isEditMode) {
      await updateAsset(assetId!, payload, organization.id);
      toast.success('Asset updated');
      onAssetUpdated();
    } else {
      const created = await createAsset(payload, organization.id);
      toast.success('Asset created');
      onAssetCreated(created.id);
    }
  } catch (error) {
    console.error('Error saving asset:', error);
    toast.error('Failed to save asset');
  } finally {
    setIsSaving(false);
  }
};
```

### Form Validation

**Client-side validation:**

```typescript
// Using zod schema with react-hook-form
const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  amount_paid: z.string().optional()
    .refine(val => !val || !isNaN(Number(val)), 'Must be a number'),
});

// Validation errors displayed inline
{errors.title && (
  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
)}
```

**Manual validation for complex rules:**

```typescript
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  if (!formData.category.trim()) {
    newErrors.category = 'Category is required';
  }
  
  if (formData.cost && isNaN(Number(formData.cost))) {
    newErrors.cost = 'Cost must be a valid number';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Form Layout

**Standard form structure:**

```typescript
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Form fields */}
  <div>
    <Label htmlFor="category">
      Category <span className="text-red-500">*</span>
    </Label>
    <Input
      id="category"
      value={formData.category}
      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
      placeholder="e.g., Audio, Lighting, Video"
      required
    />
    {errors.category && (
      <p className="text-sm text-red-500 mt-1">{errors.category}</p>
    )}
  </div>
  
  {/* Submit buttons */}
  <div className="flex gap-3 pt-4">
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
    <Button type="submit" disabled={!hasChanges || isSaving}>
      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditMode ? 'Update' : 'Create'} Asset
    </Button>
  </div>
</form>
```

---

## API Integration Patterns

### API Function Structure

API functions are in `src/utils/api.tsx` (2,824 lines, 57 functions).

**Standard CRUD pattern:**

```typescript
import { createClient } from './supabase/client';

const getSupabase = () => createClient();

// CREATE
export async function createAsset(
  data: Partial<DbAsset>,
  organizationId: string
): Promise<DbAsset> {
  const supabase = getSupabase();
  
  const { data: created, error } = await supabase
    .from('assets')
    .insert({
      ...data,
      organization_id: organizationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating asset:', error);
    throw error;
  }
  
  return created;
}

// READ
export async function getAsset(
  assetId: string,
  organizationId: string
): Promise<DbAsset | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching asset:', error);
    throw error;
  }
  
  return data;
}

// UPDATE
export async function updateAsset(
  assetId: string,
  updates: Partial<DbAsset>,
  organizationId: string
): Promise<DbAsset> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('assets')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .eq('organization_id', organizationId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating asset:', error);
    throw error;
  }
  
  return data;
}

// DELETE
export async function deleteAsset(
  assetId: string,
  organizationId: string
): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId)
    .eq('organization_id', organizationId);
  
  if (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}
```

### Organization Scoping

**CRITICAL: Always include `organization_id` in queries:**

```typescript
// ✅ Good - Filters by organization
const { data } = await supabase
  .from('gigs')
  .select('*')
  .eq('organization_id', organizationId);

// ❌ Bad - Missing organization filter (RLS will block, but explicit is better)
const { data } = await supabase
  .from('gigs')
  .select('*');
```

**Note**: Row-Level Security (RLS) policies enforce organization isolation at the database level, but explicit filtering provides defense in depth.

### Error Handling in API Functions

```typescript
export async function getGig(gigId: string, organizationId: string) {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('gigs')
      .select('*')
      .eq('id', gigId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching gig:', error);
      throw error;
    }
    
    return data;
  } catch (err: any) {
    // Detect network errors
    if (err?.message?.includes('Failed to fetch') || 
        err?.code === 'ERR_NETWORK' ||
        err?.name === 'TypeError') {
      const networkError = new Error('Network error: Unable to fetch gig');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}
```

### Calling API Functions from Components

```typescript
// In component
const loadGig = async () => {
  setIsLoading(true);
  try {
    const gig = await getGig(gigId!, organization.id);
    if (gig) {
      setFormData({
        title: gig.title,
        start_date: gig.start_date,
        // ...
      });
    }
  } catch (error) {
    console.error('Error loading gig:', error);
    toast.error('Failed to load gig');
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  if (gigId) {
    loadGig();
  }
}, [gigId]);
```

---

## State Management

### Local Component State

**Use `useState` for component-local state:**

```typescript
const [isLoading, setIsLoading] = useState(false);
const [formData, setFormData] = useState<FormData>({ ... });
const [errors, setErrors] = useState<Record<string, string>>({});
```

**Update patterns:**

```typescript
// Simple value update
setIsLoading(true);

// Object update (immutable)
setFormData(prev => ({ ...prev, category: newValue }));

// Array update (immutable)
setParticipants(prev => [...prev, newParticipant]);
```

### Global Application State

**Application-level state in App.tsx:**

- `currentUser: User | null`
- `selectedOrganization: Organization | null`
- `userOrganizations: OrganizationMembership[]`
- `currentRoute: Route` (custom routing)

**Passed via props (prop drilling):**

```typescript
<CreateGigScreen
  organization={selectedOrganization!}
  user={currentUser!}
  userRole={getCurrentUserRole()}
  // ...
/>
```

**Note**: No Redux, Zustand, or Context API for state (except NavigationContext, planned for removal in Phase 5).

### Navigation Context

**Current implementation (to be removed in Phase 5):**

```typescript
// src/contexts/NavigationContext.tsx
export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  // Navigation state
  return <NavigationContext.Provider value={...}>{children}</NavigationContext.Provider>;
};

// Usage (will be replaced by React Router)
const { navigate } = useNavigation();
```

---

## Styling Conventions

### Tailwind CSS v4.0

**Utility-first approach:**

```typescript
<div className="flex flex-col h-screen">
  <header className="bg-white border-b px-6 py-4">
    <h1 className="text-2xl font-bold">Page Title</h1>
  </header>
  <main className="flex-1 overflow-auto p-6">
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Content */}
    </div>
  </main>
</div>
```

**Common patterns:**

```typescript
// Layout
"flex flex-col h-screen"                 // Full-height flex column
"flex-1 overflow-auto"                   // Scrollable main content
"max-w-4xl mx-auto"                      // Centered container

// Spacing
"space-y-6"                              // Vertical spacing between children
"gap-3"                                  // Flex/grid gap
"p-6"                                    // Padding
"mt-4"                                   // Margin top

// Cards
"bg-white rounded-lg border p-6"         // Card container

// Forms
"space-y-4"                              // Form field spacing
"w-full"                                 // Full width inputs

// Buttons
"px-4 py-2 rounded-md"                   // Button sizing
"bg-blue-600 text-white hover:bg-blue-700"  // Primary button
"border border-gray-300 hover:bg-gray-50"   // Secondary button

// Typography
"text-2xl font-bold"                     // Page headings
"text-sm text-gray-500"                  // Helper text
"text-red-500"                           // Error text
```

### Shadcn/ui Components

**Import from `./ui/` directory:**

```typescript
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
```

**Standard usage:**

```typescript
// Button variants
<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="destructive">Delete</Button>

// With icon and loading state
<Button disabled={isSaving}>
  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save Changes
</Button>

// Input with label
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter email" />
</div>
```

### Icons

**Use Lucide React:**

```typescript
import { 
  Save, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Package,
  Plus,
  Trash2 
} from 'lucide-react';

// In JSX
<Save className="h-4 w-4" />
<Loader2 className="h-4 w-4 animate-spin" />
```

### Responsive Design

**Mobile-first approach:**

```typescript
// Base styles for mobile, then larger screens
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Content */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">
  {/* Desktop-only content */}
</div>

// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  {/* Items */}
</div>
```

---

## Testing Conventions

### Test File Organization

**Co-locate tests with source files:**

```
src/
  components/
    CreateAssetScreen.tsx
    CreateAssetScreen.test.tsx
  utils/
    form-utils.ts
    form-utils.test.ts
    api.tsx
    api.test.ts
```

### Testing Patterns (Simplified Approach - Phase 1)

**Current status**: 60 passing tests
- 26 form-utils tests
- 12 api tests
- 22 component tests

**Testing approach** (from Phase 1 refactoring):
- Complex mocks removed due to memory issues
- Focus on utility function testing
- Integration testing preferred over complex unit tests

**Example utility test:**

```typescript
// form-utils.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeFormData, getChangedFields } from './form-utils';

describe('normalizeFormData', () => {
  it('trims strings', () => {
    const result = normalizeFormData({ name: '  test  ' });
    expect(result.name).toBe('test');
  });
  
  it('converts empty strings to null', () => {
    const result = normalizeFormData({ name: '' });
    expect(result.name).toBeNull();
  });
});
```

### Test Commands

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once (CI mode)
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

---

## File Organization

### Directory Structure

```
src/
├── components/           # React components
│   ├── ui/              # Shadcn/ui components (46 files)
│   ├── tables/          # Table components (GigTable, etc.)
│   ├── figma/           # Figma-imported components
│   ├── *Screen.tsx      # Screen/page components (15 files)
│   └── *.tsx            # Shared components (10 files)
├── utils/               # Utility functions
│   ├── hooks/           # Custom React hooks
│   ├── supabase/        # Supabase client utilities
│   ├── api.tsx          # API functions (2,824 lines)
│   ├── form-utils.ts    # Form utility functions
│   ├── csvImport.ts     # CSV parsing
│   └── mock-data.tsx    # Mock data (not used)
├── contexts/            # React contexts
│   └── NavigationContext.tsx
├── config/              # Configuration
│   └── autocompleteSeeds.ts
├── styles/              # Global styles
│   └── globals.css
├── test/                # Test utilities
│   └── setup.ts
├── App.tsx              # Main application component (570 lines)
├── main.tsx             # Entry point
└── index.css            # Tailwind CSS (generated)
```

### Naming Patterns

**Screen components**: `*Screen.tsx`
- `CreateGigScreen.tsx`
- `GigListScreen.tsx`
- `LoginScreen.tsx`

**Shared components**: `PascalCase.tsx`
- `AppHeader.tsx`
- `UserSelector.tsx`
- `TagsInput.tsx`

**Utility files**: `camelCase.ts`
- `form-utils.ts`
- `csvImport.ts`

**Test files**: `*.test.ts` or `*.test.tsx`

---

## Naming Conventions

### Variables and Functions

```typescript
// camelCase for variables and functions
const isLoading = true;
const formData = { ... };
function getUserProfile() { }
async function createAsset() { }

// PascalCase for types and interfaces
interface FormData { }
type UserRole = 'Admin' | 'Manager';

// UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.example.com';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
```

### Component Props

```typescript
// Prefix boolean props with "is", "has", "should"
interface ButtonProps {
  isLoading: boolean;
  isDisabled: boolean;
  hasError: boolean;
}

// Callback props start with "on"
interface FormProps {
  onSubmit: () => void;
  onChange: (value: string) => void;
  onCancel: () => void;
}
```

### Event Handlers

```typescript
// Component event handlers: handle*
const handleSubmit = () => { };
const handleCancel = () => { };
const handleInputChange = () => { };

// Passed to children as on* props
<Button onClick={handleSubmit} onCancel={handleCancel} />
```

---

## Error Handling

### Component Error Handling

```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

try {
  await createAsset(data, organization.id);
  toast.success('Asset created successfully');
  onAssetCreated(created.id);
} catch (error) {
  console.error('Error creating asset:', error);
  toast.error('Failed to create asset. Please try again.');
}
```

### Validation Errors

```typescript
// Display inline
{errors.category && (
  <p className="text-sm text-red-500 mt-1">{errors.category}</p>
)}

// Or with icon
{errors.category && (
  <div className="flex items-center gap-2 text-sm text-red-500 mt-1">
    <AlertCircle className="h-4 w-4" />
    <span>{errors.category}</span>
  </div>
)}
```

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('Changes saved successfully');

// Error
toast.error('Failed to save changes');

// Info
toast.info('Processing your request');

// Custom duration
toast.success('Asset created', { duration: 5000 });
```

---

## Security & Organization Context

### Organization Scoping (CRITICAL)

**Every database query MUST include `organization_id`:**

```typescript
// ✅ Correct
const { data } = await supabase
  .from('gigs')
  .select('*')
  .eq('organization_id', organizationId);

// ✅ Also correct (RLS enforces, but explicit is better)
await updateGig(gigId, updates, organizationId);
```

### Authentication Verification

```typescript
// Check authentication before API calls
const supabase = getSupabase();
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  throw new Error('Not authenticated');
}
```

### Input Validation

**Always validate on client AND server:**

```typescript
// Client validation
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  if (!formData.title.trim()) {
    errors.title = 'Title is required';
  }
  
  if (formData.title.length > 200) {
    errors.title = 'Title must be 200 characters or less';
  }
  
  setErrors(errors);
  return Object.keys(errors).length === 0;
};

// Server validation (in API function)
if (!data.title || data.title.length > 200) {
  throw new Error('Invalid title');
}
```

### Sanitization

**React escapes by default, but be careful with:**

```typescript
// ❌ Dangerous
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe (use Markdown parser instead)
import ReactMarkdown from 'react-markdown';
<ReactMarkdown>{userInput}</ReactMarkdown>
```

---

## Code Examples Summary

### Complete Component Example

See `src/components/CreateAssetScreen.tsx` (23.56 KB, 646 lines) for a comprehensive example of:
- TypeScript interfaces
- Form state management
- Change detection
- API integration
- Error handling
- Loading states
- Validation

### Custom Hook Example

See `src/utils/hooks/useSimpleFormChanges.ts` (8.04 KB, 260 lines) for:
- TypeScript generics
- React hooks composition
- Change detection logic
- Integration with react-hook-form

### Utility Function Example

See `src/utils/form-utils.ts` (1.91 KB, 82 lines) for:
- Pure utility functions
- Data normalization
- Field change detection

---

## Related Documentation

- [BASE_CODING_PROMPT.md](../BASE_CODING_PROMPT.md) - Comprehensive coding guidelines and principles
- [Testing Guide](./testing.md) - Detailed testing documentation
- [Tech Stack](../TECH_STACK.md) - Technology choices and rationale
- [Feature Catalog](../features/feature-catalog.md) - Implementation status and patterns
- [Code Simplification Plan](./code-simplification-plan.md) - Refactoring roadmap

---

## Quick Reference Checklist

Before committing code, verify:

- [ ] TypeScript types defined (no `any`)
- [ ] Component props interface created
- [ ] `organization_id` included in all database queries
- [ ] Error handling with try/catch
- [ ] Loading states shown during async operations
- [ ] Form validation (client-side)
- [ ] Toast notifications for user feedback
- [ ] Inline error messages for form fields
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility (labels, keyboard navigation, touch targets)
- [ ] Change detection for forms (disable save if no changes)
- [ ] Partial updates in edit mode (only changed fields)
- [ ] Input normalization (trim, null for empty)
- [ ] Proper imports from correct paths
- [ ] Console errors cleaned up (no unused imports, variables)

---

**Last Updated**: 2026-01-17  
**Maintainers**: Development team
