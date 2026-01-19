# UI Workflows Documentation

**Purpose**: This directory contains detailed user interface workflows organized by functional area. Each workflow document describes user journeys, screen specifications, and interaction patterns.

**Last Updated**: 2026-01-18

---

## Workflow Documents

### 1. [Authentication Workflows](./authentication-workflows.md)
User authentication, profile management, and organization selection/creation.

**Key Flows:**
- User Login & Organization Selection
- Create New Organization

**Use Cases:** Initial user onboarding, organization setup, switching between organizations

---

### 2. [Gig Management Workflows](./gig-management-workflows.md)
Complete gig lifecycle: browsing, creating, viewing, editing, and managing events.

**Key Flows:**
- View Gig List & Filter
- Create a New Gig
- View Gig Details
- View Gig Calendar
- Update Gig Status
- Modify Organization Participants
- Link Bids to Gig

**Use Cases:** Event planning, gig tracking, participant coordination, bid management

---

### 3. [Equipment Management Workflows](./equipment-management-workflows.md)
Asset inventory and kit management, including conflict resolution.

**Key Flows:**
- View & Filter Assets
- Create/Update Assets
- View & Filter Kits
- Create/Edit/Duplicate Kits
- Assign Kit to Gig
- Conflict Resolution

**Use Cases:** Equipment inventory tracking, kit creation, gig equipment assignment, conflict detection

---

### 4. [Team & Personnel Management Workflows](./team-management-workflows.md)
Staff roles, personnel assignments, and organization directory.

**Key Flows:**
- Manage Staff Roles
- Define Staff Needs for Gig
- Assign Staff to Gig
- Staff Accept/Decline Assignment
- Search Organizations
- View Organization Details
- Add Private Annotations

**Use Cases:** Staffing gigs, managing crew, organization collaboration, private notes

---

### 5. [Data Import & Export Workflows](./data-import-workflows.md)
Bulk data operations via CSV import/export.

**Key Flows:**
- Bulk Import Assets
- Bulk Export Assets
- CSV Validation & Error Handling
- Template Downloads

**Use Cases:** Initial data migration, bulk updates, backup/archival, reporting

---

## Common Patterns

All workflow documents share consistent patterns:

### List → Detail → Edit Pattern
Most entities follow: List view → Click item → Detail view → Edit button → Edit form

### Search & Filter Pattern
- Consistent search input placement
- Filter dropdowns/collapsible sections
- Clear filters button
- Results count display

### Create/Edit Form Pattern
- Consistent form layout and validation
- Save/Cancel buttons
- Loading states during submission
- Success redirect or toast notification
- Error handling with inline validation

### Status Management Pattern
- Status badges with color coding
- Status transition dropdowns/modals
- Validation of allowed transitions
- History/logging of changes

---

## Platform Considerations

### Web Browser
- Multi-column layouts
- Mouse interactions (hover states, right-click menus)
- Keyboard shortcuts
- Higher information density

### Mobile Device
- Single-column layouts
- Touch interactions (swipe gestures, pull-to-refresh)
- Offline-first with sync indicators
- Camera integration
- Push notifications
- Biometric authentication

---

## UI Component Guidelines

### shadcn/ui Components

**Common Components:**
- Button - Actions and form submissions
- Input, Textarea - Form inputs
- Select - Dropdown selections
- Checkbox, RadioGroup - Boolean and single-choice inputs
- Card - Container for content
- Dialog - Modal dialogs
- Table - Data tables
- Badge - Status indicators
- Skeleton - Loading states
- Toast - Notifications

### Responsive Design

**Breakpoints:**
- Mobile: 0px - 767px (default, mobile-first)
- Tablet: 768px - 1023px
- Desktop: 1024px+

---

## Related Documentation

- **Requirements**: See [../requirements.md](../requirements.md) for functional requirements and business rules
- **Feature Catalog**: See [../feature-catalog.md](../feature-catalog.md) for feature status and roadmap
- **Database Schema**: See [../../technical/database.md](../../technical/database.md) for data model
- **Coding Guide**: See [../../development/ai-agents/coding-guide.md](../../development/ai-agents/coding-guide.md) for implementation patterns
- **Development Plan**: See [../../development/development-plan.md](../../development/development-plan.md) for project roadmap

---

## Document History

**2026-01-18**: Created workflows directory structure by splitting UI_FLOWS.md into 5 focused workflow documents organized by functional area. This reorganization improves navigation and makes it easier for both developers and AI agents to find relevant workflow specifications.
