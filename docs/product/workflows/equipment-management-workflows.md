# Equipment Management Workflows

**Purpose**: This document describes all workflows related to managing assets (equipment inventory) and kits (pre-configured equipment bundles).

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover asset inventory management (individual equipment items) and kit management (pre-configured equipment bundles), including conflict resolution when assigning kits to overlapping gigs.

---

## Asset Management Flows

### Flow 10: View & Filter Assets

**User Journey:**
1. User navigates to Assets list (`/org/[orgId]/assets`)
2. System loads assets filtered by `organization_id`
3. User can:
   - Search by manufacturer/model, serial number, description
   - Filter by category, sub-category, insurance status
   - Sort by various fields
   - Click asset to view details
4. "New Asset" button prominent

**Screens Required:**
- **Asset List Screen** (`/org/[orgId]/assets`)
  - Search and filter toolbar
  - Table/cards showing: Category, Manufacturer/Model, Serial Number, Replacement Value, Insurance Status
  - Filter by: Category, Sub-category, Insurance Added (boolean)
  - Empty state: "Add your first asset"

---

### Flow 11: Create New Asset

**User Journey:**
1. User clicks "New Asset" → Navigate to form
2. Fill asset form:
   - Category (required)
   - Manufacturer/Model (required)
   - Serial Number (optional, unique per org if provided)
   - Financial info: Acquisition Date, Vendor, Cost, Replacement Value
   - Insurance: Checkbox for "Added to Insurance Policy"
   - Description (Markdown)
3. Submit → Asset created
4. Redirect to asset detail or list

**Screens Required:**
- **Create Asset Form** (`/org/[orgId]/assets/new`)
  - Required fields: Category, Manufacturer/Model
  - Financial section: Acquisition Date, Vendor, Cost, Replacement Value
  - Insurance checkbox
  - Description with Markdown editor
  - Mobile: QR/barcode scanner for serial number

---

### Flow 12: Update Asset

**User Journey:**
1. User views asset detail page
2. User clicks "Edit"
3. Form pre-filled with current values
4. User updates fields
5. User saves → Asset updated
6. Redirect to detail page

**UI Screens Needed:**
- Edit asset form (same as create, pre-filled)
- Update confirmation
- Change history (future enhancement)

---

## Asset Kit Management Flows

### Flow 13: View & Filter Kits

**User Journey:**
1. User navigates to Kits list (`/org/[orgId]/kits`)
2. System loads kits filtered by `organization_id`
3. User can:
   - Search by name, description, or tags
   - Filter by category, tags, template status
   - Sort by various fields
   - Click kit to view details
4. "New Kit" button prominent

**Screens Required:**
- **Kit List Screen** (`/org/[orgId]/kits`)
  - Search and filter toolbar
  - Table/cards showing: Name, Category, Asset Count, Total Value, Template status
  - Filter by: Category, Tags, Template status (boolean)
  - Empty state: "Create your first kit"
  - Quick actions: Duplicate, Edit, Delete

---

### Flow 14: Create New Kit

**User Journey:**
1. User clicks "New Kit" → Navigate to form
2. Fill kit form:
   - Basic info: Name, Category, Description, Tags, Template status
   - Asset selection: Search and add assets with quantities
3. Submit → Kit created with asset associations
4. Redirect to kit detail or list

**Screens Required:**
- **Create Kit Form** (`/org/[orgId]/kits/new`)
  - Step 1: Basic Info (Name, Category, Description, Tags, Template checkbox)
  - Step 2: Asset Selection
    - Asset search with category/type filters
    - Add assets with quantity inputs
    - Asset list with remove options
    - Total value calculation
  - Mobile: Multi-step form with progress indicator

**Form Fields:**
- **Required:** Name (1-200 chars), at least one asset
- **Optional:** Category, Description (Markdown), Tags, Template status

---

### Flow 15: View Kit Details

**User Journey:**
1. User clicks kit from list → Navigate to detail page
2. View comprehensive kit information:
   - Header: Name, Category, Template status, Asset count, Total value
   - Description and tags
   - Assets section: List of all assets with quantities and notes
   - Usage section: Gigs this kit is assigned to
3. Actions: Edit kit, Duplicate kit, Delete kit, Assign to gig

**Screens Required:**
- **Kit Detail Screen** (`/org/[orgId]/kits/[kitId]`)
  - Header with key metrics (asset count, total value)
  - Assets table: Asset details, quantity, notes, individual value
  - Gig assignments list
  - Action buttons (Edit, Duplicate, Delete, Assign to Gig)

---

### Flow 16: Edit Kit

**User Journey:**
1. User views kit detail page
2. User clicks "Edit"
3. Form pre-filled with current values
4. User can:
   - Update basic info (name, category, description, tags)
   - Add/remove assets
   - Change quantities
   - Update asset-specific notes
5. User saves → Kit updated
6. Redirect to detail page

**UI Screens Needed:**
- Edit kit form (similar to create, pre-filled)
- Asset management within edit form
- Save confirmation with impact warning (affects assigned gigs)

---

### Flow 17: Duplicate Kit

**User Journey:**
1. User views kit detail or clicks "Duplicate" from list
2. System creates copy with "(Copy)" suffix
3. User optionally modifies name and template status
4. Redirect to new kit detail

**UI Screens Needed:**
- Duplicate confirmation modal
- Optional name/template editing
- Success redirect to new kit

---

### Flow 18: Assign Kit to Gig

**User Journey:**
1. User views gig detail page
2. User clicks "Assign Kit" in equipment section
3. User searches/selects from organization's kits
4. System checks for asset conflicts
5. If conflicts found:
   - Show conflict details
   - User can choose alternative kits or override
6. If no conflicts → Kit assigned to gig
7. Equipment section updates to show assigned kit

**Screens Required:**
- **Kit Assignment Modal** (from gig detail)
  - Kit search/selection
  - Conflict detection display
  - Assignment confirmation
  - Mobile: Bottom sheet interface

**Mobile Considerations:**
- Kit selection in bottom sheet
- Conflict warnings as modal overlays
- Swipe actions for kit management

---

### Flow 19: Remove Kit from Gig

**User Journey:**
1. User views gig detail → Equipment section
2. User clicks remove on assigned kit
3. System removes kit assignment
4. Equipment section updates

**UI Screens Needed:**
- Remove confirmation (if kit has many assets)
- Undo option (toast notification)

---

### Flow 20: Conflict Resolution

**User Journey:**
1. User attempts to assign kit to gig
2. System detects conflicts → Shows conflict modal
3. User sees:
   - Which assets are conflicted
   - Which gigs they're assigned to
   - Date/time overlaps
4. User options:
   - Choose different kit
   - Remove conflicting assignments first
   - Override (admin only, with warning)

**Screens Required:**
- **Conflict Resolution Modal**
  - Conflict details table
  - Resolution options
  - Impact warnings
  - Alternative kit suggestions

**Mobile Considerations:**
- Scrollable conflict list
- Clear action buttons
- Progressive disclosure of conflict details

---

## Related Documentation

- **Requirements**: See [requirements.md](../requirements.md) for feature requirements (Sections 4-5: Asset & Kit Management)
- **Database Schema**: See [technical/database.md](../../technical/database.md) for data model
- **Coding Guide**: See [development/ai-agents/coding-guide.md](../../development/ai-agents/coding-guide.md) for implementation patterns
- **Data Import**: See [data-import-workflows.md](./data-import-workflows.md) for CSV import/export of assets
