# Product Requirements Document (PRD): Organization Editing Enhancements

## 1. Overview
This feature aims to relax the restrictions on editing organization details to allow organization admins to manage information for other organizations participating in their gigs. It also improves the user experience for adding participants and managing organization roles.

## 2. Problem Statement
*   Currently, only members with administrative access to an organization can edit its details.
*   Organization admins often need to update details (address, phone, etc.) for placeholder organizations or partner organizations participating in their gigs.
*   The "Gig Participants" view lacks direct actions to view or edit organization details.
*   The organization search when adding participants has a UI quirk where results only show after a second click.
*   Organizations are currently limited to a single "type," but they often need to fulfill multiple roles (e.g., Sound AND Lighting).

## 3. Goals
*   Allow Organization Admins to edit details for any organization.
*   Provide a warning when editing an organization that has existing members.
*   Improve navigation to organization details from the Gig Participants view.
*   Smooth out the organization search experience.
*   Support multiple roles for organizations.

## 4. Requirements

### 4.1. Relaxed Organization Edit Permissions
*   **Update Access**: Any user who is an "Admin" in at least one organization shall be permitted to edit details for any organization in the system.
*   **Ownership Warning**: If a user is editing an organization where they do not have an "Admin" role, and that organization has at least one member, a prominent warning must be displayed at the top of the Edit Organization screen.
*   **Warning Message**: "You are making changes to another organization's information, you may wish to contact the admin of this organization instead."
*   **No Warning**: No warning should be shown if the user is an Admin of the organization being edited, or if the organization has zero members.

### 4.2. Gig Participant UI Enhancements
*   **Action Buttons**: Add "View" and "Edit" icon buttons to the organization tiles/rows in the "Gig Participants" section of the Gig Detail screen.
*   **Navigation**:
    *   "View": Provides a read-only modal popup view of the organization.
    *   "Edit": Navigates directly to the Organization Edit screen for that participant. *Only show the Edit view if the user is an Admin.*

### 4.3. Improved Participant Search
*   **Debounced Search**: When typing in the Organization name in the "Add Participant" dialog/field, the search should automatically trigger after a 1-second delay (debounce) without requiring a second click or focus change.
*   **Immediate Feedback**: Show a loading indicator while the search is in progress.

### 4.4. Multi-Role Organizations
*   **Data Model Change**: Rename `organization_type` to `organization_role`.
*   **Schema Update**: Change the field from a single selection to a collection (array) that allows an organization to have multiple roles.
*   **Roles**: Use the existing roles (Production, Sound, Lighting, Staging, Rentals, Venue, Act, Agency).
*   **UI Update**:
    *   Update the Organization Edit screen to allow selecting multiple roles (e.g., using checkboxes).
    *   Update all displays of organization "type" to show the list of roles as badges or a comma-separated list.
    *   Update filtering logic, especially when selecting gig participants, to support multi-role organizations.

## 5. Constraints & Assumptions
*   "Any Admin" means any user with an 'Admin' role in at least one organization they belong to.
*   The system uses Supabase RLS for permissions, which will need to be updated.
*   We assume that showing a warning is sufficient to prevent accidental or malicious edits to active organizations.

## 6. Verification Plan
*   **Permission Test**: Verify an Admin of Org A can edit Org B.
*   **Warning Test**: Verify the warning appears for Org B if it has members, and doesn't appear for Org A (when edited by its own Admin) or Org C (with no members).
*   **UI Test**: Verify "View" and "Edit" buttons appear in Gig Participants and function correctly. Ensure that the "Edit" button only appears for Admins.
*   **Search Test**: Verify the 1-second debounce when searching for organizations.
*   **Multi-Role Test**: Verify an organization can be saved with multiple roles and they are displayed correctly, and that they are shown in the Gig Participants search when one of the included roles is selected.
