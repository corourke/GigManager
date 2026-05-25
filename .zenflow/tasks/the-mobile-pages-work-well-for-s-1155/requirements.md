# PRD: Mobile Gig List & Detail Improvements

## Overview

The mobile interface is used by staff to look up upcoming gigs, review details, and work with packing lists and scanning. This set of improvements enhances the usability and completeness of the Mobile Gig List and Mobile Gig Detail screens, and adds lightweight editing capability for admin and manager users.

---

## Goals

1. Make the Mobile Gig List easier to read by displaying gigs in natural chronological order.
2. Improve the Mobile Gig Detail view by showing all relevant information (notes, attachments) and removing redundant data.
3. Align terminology with the full desktop UI ("Participants" instead of "Organizations").
4. Give admin and manager users the ability to make common edits to a gig directly on mobile without needing to switch to the desktop UI.
5. Ensure navigation between the gig list and gig detail feels efficient on mobile.

---

## User Roles

- **Staff / Viewer**: Read-only access. Can see gig details, notes, and attachments.
- **Admin / Manager**: Full read access plus the ability to edit basic gig details and manage participants.

The user role is determined by the `userRole` value available from `AuthContext`, which corresponds to `UserRole`: `Admin`, `Manager`, `Staff`, or `Viewer`.

---

## Feature Requirements

### 1. Mobile Gig List — Sort Order

**Current behavior**: Gigs are sorted newest-first (descending by start date) within each group (Upcoming / Past).

**Required behavior**: Gigs must be sorted in ascending chronological order (nearest date first within Upcoming, most recent first within Past). This is the natural order for a scheduler working through an upcoming schedule.

- Upcoming gigs: ascending by start date (nearest upcoming at the top).
- Past gigs: descending by start date (most recent past at the top) — this is conventional for a history view.

---

### 2. Mobile Gig Detail — Remove Redundant Fields from Upper Detail Area

**Current behavior**: The top info card shows Date & Time, Venue, Act, Tags, and Notes.

**Required behavior**: Remove the standalone **Venue** and **Act** rows from the upper detail card. This information is already visible in the Participants section below and showing it twice is redundant.

The upper detail card should only show: Date & Time, Tags, and Notes.

---

### 3. Mobile Gig Detail — Rename "Organizations" to "Participants"

**Current behavior**: The section listing organizational participants is titled "Organizations".

**Required behavior**: Rename this section to **"Participants"** to match the terminology used in the full desktop UI (`GigParticipantsSection`).

---

### 4. Mobile Gig Detail — Attachments Section (All Users)

**Current behavior**: No attachments are shown in the mobile gig detail view.

**Required behavior**: All users (including Staff and Viewer roles) must be able to **view and download** attachments associated with a gig.

- Display attachments in a read-only list below the Participants section.
- Show each attachment's name and a visual indicator of file type (document, image, etc.).
- Allow tapping an attachment to open/download it (open in a new tab or trigger download).
- Staff/Viewer roles: view and download only — no upload or delete.
- Admin/Manager roles: in addition to viewing, they may upload new attachments and delete existing ones (consistent with the existing `AttachmentManager` component's `allowUpload` prop behavior).

**Assumption**: Attachment upload/delete on mobile for admin/manager is in scope, since the `AttachmentManager` component already handles this with an `allowUpload` flag.

---

### 5. Mobile Gig Detail — Inline Editing for Admin / Manager

Admin and Manager users need to be able to edit common gig fields directly in the mobile gig detail view. The UI should be mobile-friendly: touch-optimized inputs, space-efficient layout.

#### Editing Mode

- An **Edit button** (pencil icon) appears in the header for Admin/Manager users only.
- Tapping Edit switches the relevant fields into an editable state inline (no separate screen/modal).
- A **Save** and **Cancel** button appear while in edit mode.
- Changes are saved on explicit Save tap (not auto-save), to give users control on a small screen.
- On save success, display a toast confirmation and return to view mode.
- On save failure, display a toast error and remain in edit mode.

#### Editable Fields

| Field | Input Type | Notes |
|-------|-----------|-------|
| **Title** | Text input | Single-line, required |
| **Date** | Date picker | Native mobile date input |
| **Time** | Time picker | Native mobile time input; hidden when all-day |
| **Timezone** | Select / dropdown | Same timezone options used in the desktop UI |
| **Tags** | Tag input (add/remove) | Comma or enter to add; tap × to remove |
| **Notes** | Multi-line textarea | Plain text (not markdown on mobile for simplicity) |

#### Participant Management

Admin and Manager users may also add and remove participants while in edit mode.

- **Add participant**: A button to add a new participant row with an organization search/selector and a role selector.
- **Remove participant**: A remove (×) button on each participant row, with protection against removing the current organization (same rule as the desktop UI).
- Changes to participants are saved together with other field edits when the user taps Save.

**Assumption**: Organization search on mobile uses the same `searchOrganizations` service already used in the `QuickCreateGigModal` in `MobileGigList.tsx`. A simplified inline selector (text search → dropdown results) is appropriate; a full `OrganizationSelector` component reuse or a lightweight equivalent is acceptable.

---

### 6. Mobile Navigation — List → Detail Transition

**Current behavior**: Navigating from the gig list to a gig detail and back is a standard page replace.

**Required behavior**: The transition should feel efficient on mobile. The back navigation from detail to list should return the user to the same scroll position they were at in the list, rather than resetting to the top.

**Assumption**: Scroll position preservation (restoring the list scroll position on back) is the primary UX improvement needed. Slide-in animation (if already present in the layout) is a nice-to-have and should be preserved if it exists.

---

## Out of Scope

- Financial fields (rates, budgets, invoices)
- Staff slot management (assigning/removing staff)
- Creating new gigs from the detail screen
- Packing list management (already handled by the existing `MobileInventoryMode` screen)
- Editing attachments (rename, re-link)

---

## Assumptions

1. The notes field is already rendered (read-only) in the current `MobileGigDetail.tsx`. If it is not rendered in the deployed build, displaying it is still in scope as a view-only change.
2. UserRole values `Admin` and `Manager` are the threshold for edit access (not `Staff` or `Viewer`).
3. The `AttachmentManager` component will be reused or adapted for the mobile attachment section.
4. Saving participant changes on mobile uses the existing `updateGigParticipants` service.
5. All editable fields map to the existing `updateGig` service call with the same payload shape used by `GigBasicInfoSection`.
