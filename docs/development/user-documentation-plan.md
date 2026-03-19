# GigManager User Documentation Plan

## Overview
This plan outlines the structure and content for comprehensive user-facing documentation for the GigManager application. The goal is to provide clear, actionable guidance for all user roles (Admins, Project Managers, and Field Staff).

---

## Proposed Documentation Structure

### 1. Getting Started
- **What is GigManager?**: High-level overview of the platform's purpose.
- **Onboarding**: Setting up your profile and joining an organization.
- **The Dashboard**: Understanding the main navigation and your upcoming schedule.

### 2. Organization & Team Management
- **Organization Settings**: Managing organization-wide defaults (branding, timezones).
- **Team Roles**: Explaining permissions for Admins, Project Managers, and Staff.
- **Inviting Members**: How to add your team and manage invitations.
- **Member Profiles**: Managing skills, contact info, and availability.

### 3. Gig Management
- **Creating a Gig**: Basic info, scheduling (Setup, Show, Strike), and location.
- **Gig Detail View**: Centralized hub for all gig-related data.
- **Staffing & Participants**:
    - Managing Staff Slots (Roles, Quantities).
    - Assigning Team Members and tracking status.
    - External Participants and point-of-contact management.
- **Gig Documents & Notes**: Using the Markdown editor for show notes and attachments.

### 4. Equipment & Inventory
- **Assets vs. Kits**: Understanding trackable individual items vs. grouped equipment sets.
- **The Asset Library**: Searching, filtering, and managing your equipment database.
- **Creating Kits**: Building standardized equipment packages (e.g., "Camera Op Kit").
- **Barcode & QR Scanning**:
    - Generating and printing asset tags.
    - Using the mobile scanner for inventory checks.
- **Kit Assignments**: How to assign specific gear to a Gig.

### 5. Financials & Purchases
- **The Financials Tab**: Centralized view of all organization-wide transactions.
- **Purchase Management**:
    - **What is a Purchase?**: Header vs. item relationship (Invoice details vs. line items).
    - **Source Types**: 0-Invoice (Header), 1-Asset (Trackable), 2-Expense (Consumables/Fees).
- **Cost Allocation**: How the system scales item prices to match the total "Burdened Cost" (including tax/shipping).
- **Gig-Specific Expenses**: Tracking purchases and expenses against specific projects.

### 6. Data Import & AI Scanning
- **CSV Asset Import**:
    - **A-Z Template**: Detailed guide to the 26-column import format.
    - **Bulk Processing**: Best practices for importing large equipment lists.
- **AI Receipt & Invoice Scanning**:
    - **Uploading Documents**: Supported formats and upload locations.
    - **The Review Dialog**: Verifying and correcting AI-extracted data.
    - **Classification Rules**: The $50/$100 rule for Assets vs. Expenses.
    - **Reconciliation**: Ensuring line items match the invoice total.

### 7. Calendar & Integrations
- **The Calendar View**: Filtering by Gig status, type, and member.
- **Google Calendar Integration**:
    - Connecting your account.
    - Syncing Gigs to your personal or organization-wide calendar.
- **Conflict Detection**: How the system warns about overlapping schedules.

### 8. Mobile App & Field Operations
- **Mobile Dashboard**: Simplified view for staff on-site.
- **Clocking In/Out**: (If applicable/future feature) - Tracking on-site time.
- **Field Inventory**: Using Mobile Inventory Mode to check gear in/out.
- **Offline Access**: Understanding what data is available without a connection.

---

## Expert Prompts for Documentation Generation

### Prompt 1: Comprehensive Platform Overview
> "Act as a technical writer for GigManager, a professional AV production and labor management software. Write a 'User Welcome Guide' that explains the core philosophy: connecting People (Team), Projects (Gigs), and Gear (Equipment) with integrated Financials. Focus on how the platform reduces 'spreadsheet fatigue' for production managers."

### Prompt 2: Advanced Equipment Management (Assets & Kits)
> "Write a detailed guide on 'Mastering Your Inventory'. Explain the relationship between individual Assets (each with a unique serial number) and Kits (logical groupings). Describe the workflow for a Project Manager: from creating a new Asset, assigning it to a Kit, and finally scheduling that Kit for a Gig. Include a section on the benefits of QR code scanning for field operations."

### Prompt 3: Financials & Burdened Cost (Purchases)
> "Write a 'Financial Best Practices' guide for production accountants using GigManager. Explain the 'Purchase' model: how one invoice (Purchase) can contain multiple Assets and Expenses. Detail the 'Cost Allocation' logic—why an item with a $100 price tag might show a $112 'True Cost' after pro-rata tax and shipping are applied. Highlight how this provides more accurate equipment valuation."

### Prompt 4: The Gig Workflow
> "Create a step-by-step 'Gig Life Cycle' guide. Start from initial creation (Lead/Draft), through Staffing and Equipment Assignment, to 'Show Ready' status, and finally 'Completed'. Explain how each stage updates the Calendar and Dashboard for the rest of the team."

### Prompt 5: AI-Powered Data Entry
> "Write a 'Quick Start' guide for the AI Scanning feature. Describe the workflow from 'Upload Receipt' to the 'Review Dialog'. Explain how the system suggests whether an item should be an 'Asset' (trackable gear >= $50) or an 'Expense' (consumables or cheap gear). Include tips for ensuring high-quality scans for better AI accuracy."
