# Dashboard & Analytics Workflows

**Purpose**: This document describes the dashboard interface, reporting features, and analytics workflows for GigManager.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover the main dashboard landing page and reporting/analytics features that provide insights into gig revenue, asset utilization, staff performance, and financial metrics. Most analytics features are **planned** but not yet implemented.

---

## Flow 1: Dashboard Overview

**User Journey:**

1. User logs in and selects organization → Redirected to Dashboard (`/dashboard`)
2. Dashboard displays:
   - Welcome message with organization name
   - Quick stats cards (upcoming gigs, total assets, active staff)
   - Upcoming gigs summary (next 7 days)
   - Recent activity feed
   - Quick action buttons (Create Gig, Add Asset, View Calendar)
3. User can navigate to specific sections via:
   - Navigation menu (left sidebar or hamburger menu on mobile)
   - Quick action buttons
   - Organization switcher (header dropdown)

**Screens Required:**
- **Dashboard Screen** (`/dashboard`)
  - Organization context header
  - Quick stats section (4 metric cards)
  - Upcoming gigs table (limited to 5 rows, "View All" link)
  - Recent activity feed (last 10 actions)
  - Quick action buttons
  - Empty state: "Get started by creating your first gig"

**Current Implementation Status:**
- ✅ Basic dashboard exists with organization context
- ⏸️ Quick stats not implemented
- ⏸️ Upcoming gigs summary not implemented
- ⏸️ Activity feed not implemented

**Mobile Considerations:**
- Stack stat cards vertically
- Collapsible sections to reduce scrolling
- Bottom navigation bar for quick actions

---

## Flow 2: Gig Reports & Analytics

**User Journey:**

1. User navigates to Dashboard → Reports → Gig Reports
2. User sees available reports:
   - **Revenue by Month**: Bar chart showing income per month
   - **Gigs by Status**: Pie chart showing distribution (Booked, Completed, Cancelled, etc.)
   - **Gigs by Venue**: Table ranking venues by number of gigs
   - **Staff Utilization**: Table showing staff members and gig assignments
3. User selects report type
4. User applies filters:
   - Date range (last 30/90/365 days, custom range)
   - Status filter
   - Venue filter
   - Staff filter
5. Report displays with:
   - Interactive charts (hover for details)
   - Summary statistics
   - Export options (CSV, PDF)
   - Print option
6. User can drill down into specific data points (e.g., click venue to see all gigs)

**Screens Required:**
- **Gig Reports Screen** (`/reports/gigs`)
  - Report type selector (tabs or dropdown)
  - Filter panel (collapsible on mobile)
  - Chart visualization area
  - Summary statistics section
  - Export/print buttons

**Current Implementation Status:**
- ⏸️ Not implemented - no reporting screens exist

**Data Requirements:**
- Query `gigs` table grouped by month/status/venue
- Join with `gig_staff_assignments` for staff utilization
- Calculate totals, averages, trends

**Mobile Considerations:**
- Use responsive charts (Chart.js or Recharts)
- Simplify filters into bottom sheet/modal
- Allow horizontal scrolling for wide tables

---

## Flow 3: Asset Reports & Insurance

**User Journey:**

1. User navigates to Dashboard → Reports → Asset Reports
2. User sees available reports:
   - **Asset Inventory**: Complete list with values
   - **Insurance Report**: Assets with insurance details
   - **Asset Utilization**: Frequency of asset assignments to gigs
   - **Depreciation Report**: Asset values over time
3. User selects report type
4. User applies filters:
   - Category (Sound, Lighting, Video, Staging, Other)
   - Insurance status (Insured, Not Insured)
   - Date range (for utilization/depreciation)
   - Asset value range
5. Report displays:
   - Sortable table with all relevant fields
   - Total value calculations
   - Export to CSV (for insurance claims)
   - Print-friendly format
6. For insurance reports specifically:
   - Include: serial number, manufacturer/model, replacement value, insurance policy flag
   - Calculate total insured value
   - Export formatted for insurance company submission

**Screens Required:**
- **Asset Reports Screen** (`/reports/assets`)
  - Report type selector
  - Filter panel
  - Data table with sorting
  - Total value display (bottom or top)
  - Export buttons (CSV, PDF, Print)

**Current Implementation Status:**
- ⏸️ Not implemented - no asset reporting exists
- ✅ Data exists: assets table has all required fields

**Export Format (Insurance Report):**
```csv
Category,Manufacturer/Model,Serial Number,Acquisition Date,Replacement Value,Insurance Policy Added
Sound,Shure SM58,SN12345,2023-01-15,$120.00,Yes
Lighting,Chauvet DJ SlimPAR Pro,SN67890,2023-03-20,$350.00,Yes
```

**Mobile Considerations:**
- Simplified table view (show key fields only)
- Horizontal scrolling for full data
- Swipe actions for quick export
- Bottom sheet for filters

---

## Flow 4: Financial Reports

**User Journey:**

1. User navigates to Dashboard → Reports → Financial Reports
2. User sees available reports:
   - **Revenue vs. Expenses**: Compare income to costs over time
   - **Outstanding Payments**: Gigs marked as Completed but not Settled
   - **Bid Acceptance Rate**: Track proposal success percentage
3. User selects report type
4. User applies filters:
   - Date range
   - Organization (for multi-org contexts)
   - Status filters
5. Report displays:
   - Line chart for revenue/expenses over time
   - Table for outstanding payments with totals
   - Percentage metrics for bid acceptance
   - Summary statistics (total revenue, average gig value, etc.)
   - Export options

**Screens Required:**
- **Financial Reports Screen** (`/reports/financial`)
  - Report type selector
  - Filter panel
  - Chart visualization
  - Summary metrics cards
  - Data table
  - Export buttons

**Current Implementation Status:**
- ⏸️ Not implemented
- 🚫 Bid tracking deferred - bid acceptance rate unavailable until bid feature implemented

**Data Requirements:**
- `gigs.amount_paid` for revenue
- Expense tracking not yet in schema (future enhancement)
- `gig_bids` table for bid acceptance (when implemented)

**Mobile Considerations:**
- Stacked charts instead of side-by-side
- Tap to expand summary cards
- Simplified table views

---

## Flow 5: Staff Utilization & Performance

**User Journey:**

1. User navigates to Dashboard → Reports → Staff Reports
2. User sees staff utilization report:
   - Table listing all staff members
   - Columns: Name, Role, Total Gigs Assigned, Confirmed Gigs, Declined Gigs, Utilization %
   - Sortable by any column
3. User can click on a staff member to see:
   - Detailed assignment history
   - Upcoming assignments
   - Acceptance rate
   - Preferred roles/categories
4. User applies filters:
   - Date range
   - Role filter
   - Status filter (Confirmed, Declined, Pending)
5. Report shows:
   - Visual chart of top performers
   - Availability conflicts
   - Staff scheduling gaps

**Screens Required:**
- **Staff Reports Screen** (`/reports/staff`)
  - Staff utilization table
  - Filter panel
  - Detail view (modal or side panel)
  - Export to CSV

**Current Implementation Status:**
- ⏸️ Not implemented
- ✅ Data exists: `gig_staff_assignments` table tracks all assignments

**Data Requirements:**
- Join `users`, `gig_staff_assignments`, `gigs`
- Count assignments by status
- Calculate utilization percentages
- Identify scheduling conflicts

**Mobile Considerations:**
- Card-based layout for staff members
- Tap to expand details
- Swipe to see assignments
- Bottom sheet for filters

---

## Common UI Components

### Filter Panel
- Date range picker (presets + custom)
- Multi-select dropdowns (status, category, etc.)
- Search/autocomplete for entities (venues, staff, etc.)
- "Apply Filters" and "Clear All" buttons
- Show active filter count badge

### Chart Components
- Bar charts (revenue by month)
- Pie charts (gig status distribution)
- Line charts (trends over time)
- Interactive tooltips on hover
- Legend with toggleable series
- Responsive to screen size

### Export Options
- **CSV**: Raw data for spreadsheet analysis
- **PDF**: Print-ready formatted report with charts
- **Print**: Browser print dialog with print-friendly CSS
- **Email**: Send report to specified email (future)

### Empty States
- "No data for selected date range"
- "Create your first gig to see reports"
- "No assets tracked yet - add equipment to see insights"
- Actionable buttons to resolve empty state

---

## Related Documentation

- [Requirements: Dashboard, Reporting & Analytics](../requirements.md#5-dashboard-reporting--analytics)
- [Feature Catalog: Dashboard, Reporting & Analytics](../feature-catalog.md#5-dashboard-reporting--analytics)
- [Gig Management Workflows](./gig-management-workflows.md) - Related gig data workflows
- [Equipment Management Workflows](./equipment-management-workflows.md) - Related asset data workflows

---

**Last Updated**: 2026-01-18  
**Status**: Planning Document - Features not yet implemented
