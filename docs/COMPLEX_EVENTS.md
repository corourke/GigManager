# Complex Events: Hierarchical Gig Structure

This document outlines a design for supporting complex events (festivals, multi-act shows, multi-day events, multi-venue events) through a hierarchical gig structure with inheritance through recursive queries.

## Key Principles

### Core Design Philosophy
- **Minimal Schema Changes**: Add only essential columns to maintain simplicity
- **Backward Compatibility**: Existing gigs continue to work without modification
- **Recursive Inheritance**: Use database queries to resolve inheritance, not explicit metadata
- **Child Overrides Parent**: Child values always take precedence over parent values
- **Hierarchical Access**: Users with access to parent gigs automatically access children

### Inheritance Model
- **Simple Precedence**: Child values override parent values at all levels
- **No Explicit Overrides**: No need for override flags - just define values on child gigs
- **Optional Hierarchy**: Most gigs remain flat (no parent) for simple use cases

## Overview

The hierarchical gig structure allows gigs to have parent-child relationships, enabling complex events where:
- **Equipment** can be consistent per stage throughout an event
- **Staffing** can be persistent (Same staff for all days) or variable (different staff on different days)
- **Acts** can change for each individual performance
- **Participants** could be consistent, or variable (different lighting companies per stage)
- **Bids** can encompass the whole event, or roll up from components of the event. (Sub-bids are generally not needed.)

## Core Schema Changes

### 1. Add Hierarchy to Gigs Table

```sql
-- Just add the parent relationship
ALTER TABLE gigs ADD COLUMN parent_gig_id UUID REFERENCES gigs(id);

-- Add depth for performance and validation
ALTER TABLE gigs ADD COLUMN hierarchy_depth INTEGER DEFAULT 0;
```

## Inheritance Through Recursive Queries

### Effective Gig Participants

```sql
WITH RECURSIVE gig_hierarchy AS (
  SELECT id, parent_gig_id, 0 as depth
  FROM gigs
  WHERE id = $target_gig_id

  UNION ALL

  SELECT g.id, g.parent_gig_id, gh.depth + 1
  FROM gigs g
  JOIN gig_hierarchy gh ON g.id = gh.parent_gig_id
  WHERE g.parent_gig_id IS NOT NULL
)
SELECT DISTINCT gp.*
FROM gig_participants gp
JOIN gig_hierarchy gh ON gp.gig_id = gh.id
ORDER BY gh.depth ASC  -- Parent values first
```

### Effective Staff Slots

```sql
WITH RECURSIVE gig_hierarchy AS (
  SELECT id, parent_gig_id, 0 as depth
  FROM gigs
  WHERE id = $target_gig_id

  UNION ALL

  SELECT g.id, g.parent_gig_id, gh.depth + 1
  FROM gigs g
  JOIN gig_hierarchy gh ON g.id = gh.parent_gig_id
  WHERE g.parent_gig_id IS NOT NULL
)
SELECT DISTINCT gss.*
FROM gig_staff_slots gss
JOIN gig_hierarchy gh ON gss.gig_id = gh.id
ORDER BY gh.depth ASC
```

### Effective Staff Assignments

```sql
-- Since assignments are tied to slots, they inherit through the slot hierarchy
WITH RECURSIVE slot_hierarchy AS (
  SELECT gss.id as slot_id, gss.gig_id, gh.depth
  FROM gig_staff_slots gss
  JOIN gig_hierarchy gh ON gss.gig_id = gh.id
)
SELECT DISTINCT gsa.*
FROM gig_staff_assignments gsa
JOIN slot_hierarchy sh ON gsa.slot_id = sh.slot_id
ORDER BY sh.depth ASC
```

### Effective Bids

Bids inherit naturally since they're tied to gigs:

```sql
WITH RECURSIVE gig_hierarchy AS (
  SELECT id, parent_gig_id, 0 as depth
  FROM gigs
  WHERE id = $target_gig_id

  UNION ALL

  SELECT g.id, g.parent_gig_id, gh.depth + 1
  FROM gigs g
  JOIN gig_hierarchy gh ON g.id = gh.parent_gig_id
  WHERE g.parent_gig_id IS NOT NULL
)
SELECT DISTINCT gb.*
FROM gig_bids gb
JOIN gig_hierarchy gh ON gb.gig_id = gh.id
ORDER BY gh.depth ASC
```

## Business Rules and Logic

### Inheritance Resolution Logic

**Core Algorithm:**
1. Start with target gig
2. Walk up the hierarchy tree using recursive CTE
3. Collect all values from all levels
4. Return values ordered by depth (parents first, children last)
5. Child values naturally override parent values in application logic

**Value Precedence:**
- **Participants**: Child participants are added to inherited parent participants
- **Staff Slots**: Child staff slots override parent slots with same role
- **Equipment**: Child equipment assignments override parent assignments for same assets
- **Bids**: All bids from hierarchy are considered (no override logic)

### Status Propagation Logic

**Default Behavior (Simple):**
- Parent and child gigs maintain independent statuses
- No automatic cascading of status changes
- Children can complete while parent remains booked

**Optional Advanced Logic (Future):**
- **Cascade Cancellation**: When parent is cancelled, optionally cancel all children
- **Completion Rules**: Parent can only complete when all children are completed
- **Status Constraints**: Children cannot be booked if parent is cancelled

### Data Integrity Rules

**Hierarchy Constraints:**
- **No Cycles**: Prevent A→B→A relationships through database constraints
- **Date Validation**: Child gig dates must fall within parent date range

**Referential Integrity:**
- Deleting a parent gig requires handling child gigs (cascade delete or reparent)
- Moving gigs between hierarchies requires permission checks
- Circular reference prevention through application logic

### Conflict Resolution

**Staff Conflicts:**
- Prevent double-booking staff across overlapping gigs in same hierarchy
- Allow same staff on non-overlapping gigs within hierarchy
- Warn when staff availability conflicts arise

**Equipment Conflicts:**
- Track equipment usage across hierarchy
- Prevent double-assignment of same equipment to overlapping gigs
- Allow equipment reuse on non-overlapping gigs

### Access Control Logic

**Row-Level Security:**
- Users can access child gigs if they can access the parent
- Organization membership grants access to entire hierarchies
- Private data (notes, annotations) respects hierarchy boundaries

**Permission Inheritance:**
- Admin role on parent grants admin access to children
- Manager role allows creating child gigs
- Viewer role allows read-only access to hierarchy

## Examples

### Example: Multi-Day Music Festival

```
Summer Music Festival (parent_gig_id = null)
├── Main Stage Setup (parent_gig_id = festival.id)
│   ├── Equipment: Full PA system, lighting rig
│   ├── Staff Slots: Stage Manager, Lighting Tech
│   ├── Participants: Venue, Production Company
│   └── Friday Night Concert (parent_gig_id = main_stage.id)
│       ├── Act: Headliner Band
│       └── Staff Assignments: Specific lighting tech for this show
├── Side Stage Setup (parent_gig_id = festival.id)
│   └── [inherits equipment/staff from festival, overrides with smaller setup]
└── VIP Lounge (parent_gig_id = festival.id)
    └── [inherits equipment/staff from festival, overrides with lounge setup]
```

### Example: Wedding with Ceremony + Reception

```
Sarah & John Wedding (parent_gig_id = null)
├── Ceremony at Church (parent_gig_id = wedding.id)
│   ├── Equipment: Basic sound system
│   ├── Staff: sound engineer, musicians
│   └── Participants: sound company, band
└── Reception at Hotel (parent_gig_id = wedding.id)
    ├── Equipment: Full DJ/sound system, DJ lighting
    ├── Staff: DJ, sound engineer, lighting engineer
    └── Participants: Hotel (venue), DJ company, sound company, lighting company
```

## UI Design Principles

### Progressive Disclosure
- **Simple First**: Most users never need hierarchy - keep it hidden until needed
- **Contextual UI**: Show hierarchy features only when creating/editing hierarchical gigs
- **Optional Complexity**: Users can opt into complex features without affecting simple workflows

### Visual Hierarchy Indicators
- **Parent-Child Relationships**: Clear visual indicators (nesting, indentation, breadcrumbs)
- **Inheritance Status**: Show which values are inherited vs. locally defined
- **Hierarchy Depth**: Visual cues for different levels (colors, icons, indentation)
- **Status Propagation**: Visual indicators for related gig statuses

### Gig Creation Workflow

**Parent Gig Creation:**
- Standard gig creation form with optional "Create as Parent" toggle
- When enabled, show hierarchy planning section
- Allow defining shared resources (equipment, staff slots, participants)

**Child Gig Creation:**
- Parent selection dropdown (filtered by accessible gigs)
- Pre-populated inherited values
- Clear indication of what can be overridden
- Validation against parent constraints

### Form Design Patterns

**Inherited Value Display:**
```
[Field Label] (Inherited from "[Parent Gig Name]")
[Value Display - Read-only] [Override Button]
[Override: Editable Input Field - when override enabled]
```

**Hierarchy Navigation:**
- Breadcrumb trail: Festival > Main Stage > Friday Night
- Sibling navigation: Previous/Next child gigs
- Parent jump: Quick access to parent gig details

### List View Enhancements

**Gig List with Hierarchy:**
- Indented rows for child gigs
- Expandable/collapsible parent rows
- Hierarchy-aware sorting and filtering
- Bulk selection across hierarchies

**Status Overview:**
- Parent gig shows rollup status of children
- Color-coded hierarchy indicators
- Quick status changes with cascade options

### Conflict Resolution UI

**Staff Conflicts:**
- Real-time warnings for double-booked staff
- Conflict resolution suggestions
- Override options with confirmation dialogs

**Equipment Conflicts:**
- Visual calendar showing equipment usage
- Conflict highlighting and resolution workflows
- Alternative equipment suggestions

### Mobile Considerations

**Responsive Hierarchy:**
- Collapsed hierarchy on mobile (expand on demand)
- Touch-friendly drag-and-drop for reordering
- Simplified forms for mobile hierarchy creation
- Swipe actions for common hierarchy operations

### Accessibility

**Keyboard Navigation:**
- Tab order through hierarchical elements
- Keyboard shortcuts for hierarchy operations
- Screen reader support for inheritance indicators
- Focus management in complex forms

**Visual Indicators:**
- High contrast for hierarchy levels
- Alternative text for inheritance status
- Clear focus indicators for nested elements
- Consistent iconography for hierarchy actions

## Implementation Considerations

### Database Migration Strategy

**Phase 1: Core Schema**
1. Add `parent_gig_id` and `hierarchy_depth` to gigs table (nullable initially)
2. Create `gig_assets` table with proper indexes
3. Add database constraints (no cycles via triggers, max depth checks)
4. Create indexes on `parent_gig_id` for performance

**Phase 2: Inheritance Logic**
1. Implement recursive query functions for each entity type
2. Update application data access layer to use effective values
3. Add hierarchy-aware RLS policies
4. Create database views for common hierarchy queries

**Phase 3: Application Updates**
1. Update gig creation/edit forms to support parent selection
2. Modify queries to use inheritance-aware logic
3. Add validation for hierarchy constraints
4. Update permission checks for hierarchical access

**Phase 4: Advanced Features (Future)**
1. Bulk operations across hierarchies
2. Status cascade options
3. Hierarchy templates and presets
4. Advanced reporting across hierarchies

### Performance Optimization

**Query Optimization:**
- Use recursive CTEs efficiently with proper indexing
- Cache frequently accessed hierarchy data
- Implement pagination for large hierarchies
- Consider materialized views for complex aggregations

**Database Indexes:**
- Index on `parent_gig_id` for fast hierarchy traversal
- Composite indexes on `(gig_id, inheritance_type)` for related tables
- Partial indexes for active hierarchies only

**Caching Strategy:**
- Cache hierarchy structures for frequently accessed gigs
- Invalidate cache when hierarchy changes
- Use Redis/application cache for complex inheritance results

### Error Handling and Validation

**Hierarchy Validation:**
- Prevent circular references through database triggers
- Validate depth limits on insert/update
- Check date consistency across hierarchy
- Validate organization membership

**Conflict Detection:**
- Real-time staff availability checking
- Equipment usage validation
- Business rule enforcement at application layer
- User-friendly error messages for constraint violations

### Testing Strategy

**Unit Tests:**
- Recursive query correctness
- Inheritance resolution logic
- Constraint validation
- Permission inheritance

**Integration Tests:**
- Full hierarchy CRUD operations
- Complex event creation workflows
- Performance under load
- Data consistency across operations

**Edge Cases:**
- Deep hierarchies (3 levels)
- Circular reference prevention
- Concurrent modifications
- Partial hierarchy access

## Benefits

- **Backward Compatible**: Existing gigs work unchanged
- **Simple to Implement**: Minimal schema changes
- **Powerful**: Supports complex nested events
- **Flexible**: Easy to extend with more features later

## Related Documentation

- [DATABASE.md](DATABASE.md) - Current database schema
- [REQUIREMENTS.md](REQUIREMENTS.md) - Feature requirements
- [UI_FLOWS.md](UI_FLOWS.md) - Current UI specifications
