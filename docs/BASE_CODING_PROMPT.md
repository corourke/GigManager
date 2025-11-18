# Base Coding Prompt

## Purpose

This document consolidates all coding rules, principles, patterns, and conventions for generating code in the Gig Manager application. Use this as a base prompt for AI-assisted code generation.

---

## Application Context

**Gig Manager** is a production and event management platform used by:

- Production companies managing events and performances
- Sound and lighting companies tracking equipment and staff
- Event producers coordinating venues, acts, and logistics

**Brand Values**: Professional, Efficient, Modern, Accessible

 This is a full production application with:

- Complete Supabase PostgreSQL database with custom schema
- Multiple custom tables (users, organizations, gigs, assets, etc.)
- Existing migration files in `/supabase/migrations/`
- Direct Supabase database access outside of Figma Make environment
- Custom RLS policies managed at application layer

Database modifications:
- You CAN write migration files to `/supabase/migrations/`
- You CAN provide DDL statements for the Supabase SQL Editor
- You SHOULD update migration documentation when schema changes are needed
- The KV store limitations DO NOT apply to this project

Migration workflow:
- Create migration SQL files in `/supabase/migrations/`
- Update documentation files (RLS_FIX_SUMMARY.md, APPLY_DATABASE_FIXES.md, etc.)
- Provide instructions for running migrations in Supabase SQL Editor


### UI guidelines

* Don't create separate components for Add and Update screens, use one form component with logic to correctly handle both Create and Update operations. 
* Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default.
* Refactor code as you go to keep code clean.
* Keep file sizes small and put helper functions and components in their own files.

### Data handling guidelines

* When updating data in the database through a user edit action (whether on a form, or inline editing
  in a table) ensure that we ONLY update database columns (including rows in related tables) for 
  values that have been changed in the UI. We should not make changes to column values that have not 
  changed to avoid triggering change logic in the back-end.
* It is not necessary to include code to gracefully handle the case where a table 
  doesn't exist as we will always assume that migrations will be run. 
* Do not add or maintain any code to handle mock data -- we are using a live database. 

---

## Mobile Considerations

Apply these mobile design principles to all screens:

- Touch-friendly button size (minimum 44x44px)
- Touch-friendly input heights (minimum 44px)
- Full-screen layout optimized for mobile viewport
- Card-based layouts that stack vertically on mobile
- Larger touch targets for interactive elements
- Bottom sheets or modals for secondary actions on mobile
- Sticky headers or action buttons where appropriate
- Smooth scrolling with action buttons sticky at bottom or after all fields
- Native input types for better mobile keyboard experience
- Keyboard "Next" button should navigate between fields logically
- Progressive disclosure: Show primary fields first, with expandable sections for optional fields

---

## Accessibility Considerations

All screens must adhere to these accessibility standards:

- Proper color contrast (WCAG AA minimum)
- Keyboard navigation support
- Screen reader friendly labels
- Focus states visible
- Touch targets minimum 44x44px
- Form labels properly associated with inputs
- Table headers properly associated with cells
- Error messages clearly associated with form fields
- Loading states communicated to assistive technologies

---

## Common States to Design

When applicable, design these states for interactive elements:

**Default States:**

- Ready for user interaction
- Clear visual hierarchy
- Prominent primary actions

**Loading States:**

- Show loading indicators (spinners, skeletons)
- Disable interactive elements during loading
- Provide feedback that action is in progress
- Loading spinner on submit buttons during form submission

**Error States:**

- Inline validation errors below form fields
- General error messages at top of forms or in toast notifications
- Visually distinct error styling (red borders, error icons)
- Clear error messages with actionable guidance
- Retry options where applicable
- Form remains accessible for correction

**Empty States:**

- Helpful messaging explaining why the state is empty
- Clear call-to-action buttons
- Visual indicators (icons or illustrations) to reduce cognitive load

**Success States:**

- Success messages/toasts after successful actions
- Brief confirmation before redirects
- Visual success indicators (green checkmarks, success colors)

---

## Form Design Patterns

**Layout:**

- Single-column form layout (centered on desktop, full-width on mobile)
- Form fields grouped logically
- Required field indicators: asterisk (*)
- Help text for optional fields where helpful

**Validation:**

- Inline validation errors below each field
- Real-time validation where appropriate
- Clear error messages
- Success indicators for valid inputs

**Form Actions:**

- Primary button: Right-aligned (desktop) or full-width (mobile)
- Secondary button: Left-aligned (desktop) or stacked above primary (mobile)
- Buttons placed at bottom of form
- Disable submit button during form submission

---

## User Experience Goals

- Minimal friction in user flows
- Clear context (users always know where they are and what they're doing)
- Professional appearance that builds trust
- Intuitive navigation and interactions
- Progressive disclosure of information
- Helpful error messages and validation feedback
- Quick access to all data, fast filtering and search
- Inline editing for quick updates without page navigation
- Clear status indicators, organized information
- Smooth experience on mobile with appropriate patterns

## Coding Principles

### 1. Type Safety First

- **Prefer TypeScript with strict mode enabled**

### 2. Organization Context

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
- **Use React Server Components by default** (App Router)

### 7. Maintainability

- **Write self-documenting code** with clear variable and function names
- **Extract reusable logic** into utility functions
- **Keep functions focused** on a single responsibility
- **Add comments for complex business logic**
- Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
- Refactor code as you go to keep code clean
- **Keep components small and focused** -- Keep file sizes small and put helper functions and components in their own files.

## Quick Checklist

Before finalizing code, verify:

- [ ] Organization membership is verified
- [ ] Input is validated
- [ ] Status changes are recorded in gig_status_history (for gigs)
- [ ] Timezones are handled explicitly
- [ ] Errors are caught and handled
- [ ] Types are properly defined
- [ ] Queries filter by `organization_id`
- [ ] Transactions used for multi-step operations
- [ ] Constants used instead of magic strings
- [ ] Loading states are shown
- [ ] Validation on both client and server
- [ ] Errors don't expose internal details

## Testing Philosophy

- Write tests alongside implementation, not after
- Focus on testing behavior, not implementation details
- Prefer integration tests over unit tests for API routes
- Use E2E tests for critical user flows
- Keep tests maintainable and readable
