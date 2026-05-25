# Technical Specification: Mobile Gig List & Detail Improvements

## Technical Context

**Language / Runtime**: TypeScript / React 18, Vite build  
**UI library**: Tailwind CSS + shadcn/ui components (Card, Button, Badge, Select, etc.)  
**State**: Local React state (`useState`, `useMemo`) — no global store  
**Auth / roles**: `useAuth()` from `AuthContext` exposes `userRole: UserRole | undefined` where `UserRole = 'Admin' | 'Manager' | 'Staff' | 'Viewer'`  
**Services**:
- `getGig(gigId)` — fetch full gig with participants, staff_slots, etc.
- `updateGig(gigId, payload)` — accepts `title`, `start`, `end`, `timezone`, `tags`, `notes`, `participants[]`; enforces Admin/Manager server-side
- `updateGigParticipants(gigId, participants[])` — replace participant list atomically
- `searchOrganizations(filter)` — already used in `QuickCreateGigModal`
- `getEntityAttachments`, `uploadAttachment`, `linkAttachmentToEntity`, `unlinkAttachmentFromEntity`, `getAttachmentUrl` — from `attachment.service`
**Date utilities**: `formatDateTimeDisplay`, `formatGigDateTimeForInput`, `parseGigDateTimeFromInput` in `src/utils/dateUtils.ts`  
**Key constants**: `ORG_ROLE_CONFIG`, `GIG_STATUS_CONFIG`, `USER_ROLE_CONFIG` in `src/utils/supabase/constants.ts`; `getAllTimezones()` / `getTimezoneOptions()` in `src/utils/timezones.ts`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/mobile/MobileGigList.tsx` | Sort fix + scroll-position preservation |
| `src/components/mobile/MobileGigDetail.tsx` | Remove Venue/Act rows, rename section, add notes (already present), add attachments, add inline edit mode |
| `src/components/mobile/MobileGigList.test.tsx` | Update / extend tests |
| `src/components/mobile/MobileGigDetail.test.tsx` | Update / extend tests |
| `src/App.tsx` | Pass scroll-position ref to `MobileGigList` and restore on back-navigation |

No new files are required; all changes are localised to the existing mobile components and their tests.

---

## Implementation Approach

### 1. MobileGigList — Sort Order Fix

**Location**: `filteredGigs` `useMemo` in `MobileGigList.tsx` (line 131).

**Current**: A single descending sort is applied to `filteredGigs` before splitting into upcoming/past.

**Change**: Replace the single sort with two independent sorts applied after splitting:
- `upcomingGigs`: sorted **ascending** by `start` (nearest first).
- `pastGigs`: sorted **descending** by `start` (most recent first).

The existing `filteredGigs` memo no longer needs its own sort; sorting is delegated to each derived memo.

```
upcomingGigs = filteredGigs
  .filter(g => new Date(g.start) >= now)
  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

pastGigs = filteredGigs
  .filter(g => new Date(g.start) < now)
  .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
```

---

### 2. MobileGigList → MobileGigDetail — Scroll Position Preservation

**Location**: `App.tsx` (mobile routing block, lines 644–658) + `MobileGigList.tsx`.

**Approach**: Lift a `listScrollRef` (`useRef<number>(0)`) into the mobile routing section of `App.tsx`. Pass it as a prop (`scrollPosition` / `onScrollPositionChange`) to `MobileGigList`. Inside `MobileGigList`, attach a `onScroll` handler to the scrollable container that writes to the ref. When returning from detail to list (i.e., `onBack` triggers `setCurrentRoute('mobile-gig-list')`), restore the scroll position via `useEffect` on mount in `MobileGigList`.

Because the scroll container is the `<main>` element in `MobileLayout` (not an internal element in `MobileGigList`), the simpler approach is to pass `initialScrollTop` as a prop to `MobileGigList` and let it use `useEffect` to scroll `window` or the nearest scrollable ancestor on mount.

**Concrete design**:
1. In `App.tsx`, add `const mobileGigListScrollTop = useRef(0)`.
2. Extend `MobileGigListProps` with `initialScrollTop?: number` and `onScrollPositionChange?: (pos: number) => void`.
3. Inside `MobileGigList`, on component mount, call `document.querySelector('[data-testid="mobile-main-content"]')?.scrollTo(0, initialScrollTop ?? 0)`.
4. Attach a `scroll` listener to that same element and call `onScrollPositionChange` with the current `scrollTop`.
5. In `App.tsx`, wire up the ref reads/writes.

---

### 3. MobileGigDetail — Remove Venue/Act from Upper Info Card

**Location**: `MobileGigDetail.tsx`, lines 270–293 (the two conditional blocks for `gig.venue` and `gig.act` inside the first `Card`).

**Change**: Delete both blocks. The `MapPin`/`Music` imports and `gig.venue`/`gig.act` fields derived in `loadGig` can be kept since they may still be referenced in the directions/call logic; only the JSX render blocks in the upper card are removed.

The upper `Card` will then contain only: Date & Time, Tags, Notes.

---

### 4. MobileGigDetail — Rename "Organizations" → "Participants"

**Location**: The section heading text on line 345 of `MobileGigDetail.tsx`.

**Change**: Replace the string `"Organizations"` with `"Participants"` in the section label.

---

### 5. MobileGigDetail — Attachments Section

**Location**: `MobileGigDetail.tsx`, added after the Participants card.

**Approach**: Reuse the existing `AttachmentManager` component from `src/components/AttachmentManager.tsx`. It already supports:
- `allowUpload` prop — pass `true` for Admin/Manager, `false` for Staff/Viewer.
- `organizationId`, `entityType: 'gig'`, `entityId: gigId`.

The component is wrapped in a `Card` styled consistent with the rest of the detail view. The `title` prop is set to `"Attachments"`.

Role check:
```ts
const canEdit = userRole === 'Admin' || userRole === 'Manager';
```

`useAuth()` is already imported; `userRole` is destructured from it.

The `selectedOrganization` is needed for `organizationId`; add it to the `useAuth()` destructure in `MobileGigDetail`.

---

### 6. MobileGigDetail — Inline Edit Mode for Admin/Manager

**Location**: `MobileGigDetail.tsx` — augmented with local edit state.

#### State additions

```ts
const [isEditing, setIsEditing] = useState(false);
const [editTitle, setEditTitle] = useState('');
const [editStartDate, setEditStartDate] = useState('');
const [editStartTime, setEditStartTime] = useState('');
const [editEndDate, setEditEndDate] = useState('');
const [editEndTime, setEditEndTime] = useState('');
const [editAllDay, setEditAllDay] = useState(false);
const [editTimezone, setEditTimezone] = useState('');
const [editTags, setEditTags] = useState<string[]>([]);
const [editNotes, setEditNotes] = useState('');
const [editParticipants, setEditParticipants] = useState<EditParticipant[]>([]);
const [isSaving, setIsSaving] = useState(false);
```

Where `EditParticipant` is a local interface:
```ts
interface EditParticipant {
  id?: string;
  organization_id: string;
  organization_name: string;
  role: string;
}
```

#### Entering edit mode

When the pencil-icon Edit button is tapped, populate all edit state from the current `gig` object:
- Use `formatGigDateTimeForInput(gig.start, gig.timezone)` to populate date/time fields, matching the pattern in `GigBasicInfoSection`.
- Tags, notes, timezone, title copied directly.
- Participants mapped from `gig.participants`.

#### Header changes (Admin/Manager only)

In view mode: show pencil (`Pencil`) icon button in the header.  
In edit mode: replace with **Save** and **Cancel** buttons.  
The status badge toggle remains available in both modes.

#### Editable fields — rendering in edit mode

Replace read-only display rows with native inputs, matching the `QuickCreateGigModal` style (class `w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30`):

| Field | Input | Notes |
|-------|-------|-------|
| Title | `<input type="text">` | Required |
| Date | `<input type="date">` | Bound to `editStartDate` |
| Time | `<input type="time">` | Hidden when `editAllDay` |
| End Date | `<input type="date">` | Optional |
| End Time | `<input type="time">` | Hidden when `editAllDay` |
| All-day | `<input type="checkbox">` | Toggles time inputs |
| Timezone | `<select>` using `getAllTimezones()` | Same as `QuickCreateGigModal` |
| Tags | Inline tag chips with text input — lightweight version (not using the full `TagsInput` component which uses Popover/Command) | Render existing tags as `×`-removable badges; text input adds tag on Enter |
| Notes | `<textarea rows={3}>` | Plain text |

Tags lightweight implementation: render as a flex-wrap row of badge chips (sky-50/sky-700, matching the view-mode style) each with an `×` button, followed by a small text input. On `Enter` or comma, trim and push to `editTags`. This avoids the Popover dependency that doesn't work well inside a scrolling card on mobile.

#### Participant editing in edit mode

Render the participants list in a separate card section (still titled "Participants") with an edit variant:
- Each participant row shows: role label, org name, and a red `×` remove button.
- Prevent removing the current organization (`selectedOrganization.id`) — show the button disabled with `opacity-50 cursor-not-allowed`.
- **Add participant** button at the bottom of the list opens an inline search form (not a modal) inside the card:
  - A text `<input>` bound to a local `orgSearchQuery` state.
  - Debounced `searchOrganizations({ query })` call, results shown in a small dropdown list beneath.
  - A role `<select>` using `Object.keys(ORG_ROLE_CONFIG)`.
  - Confirm / Cancel buttons.
  - On confirm, push the selected org + role to `editParticipants`.
  
This pattern is consistent with `QuickCreateGigModal` which also uses `searchOrganizations` for inline search.

#### Save logic

On Save tap:
1. `setIsSaving(true)`.
2. Build the ISO start/end strings from date+time inputs using `parseGigDateTimeFromInput(editStartDate + 'T' + editStartTime, editTimezone)` (matching `GigBasicInfoSection`'s pattern).
3. Call `updateGig(gigId, { title, start, end, timezone, tags, notes, participants: editParticipants.map(...) })`.
4. On success: `toast.success(...)`, call `loadGig()` to refresh, `setIsEditing(false)`.
5. On error: `toast.error(...)`, remain in edit mode.
6. `setIsSaving(false)` in `finally`.

---

## Data Model / API Changes

No schema or API changes are required. All operations use existing service functions:

- `updateGig()` already accepts `participants`, `title`, `start`, `end`, `timezone`, `tags`, `notes`.
- `AttachmentManager` uses `getEntityAttachments` / `uploadAttachment` / `unlinkAttachmentFromEntity` which are already implemented.
- `searchOrganizations` is already available and used in the same file.

The `EntityType` for attachments is `'gig'` (confirmed from existing `AttachmentManager` usage in `GigDetailScreen.tsx`).

---

## Interface / Prop Changes

### `MobileGigListProps` (extends existing)
```ts
interface MobileGigListProps {
  onViewGig: (gigId: string) => void;
  initialScrollTop?: number;
  onScrollPositionChange?: (scrollTop: number) => void;
}
```

### `MobileGigDetailProps` (no change)
No prop changes needed. `userRole` is read from `useAuth()` internally.

---

## Verification

Run after all changes:
```
npm run build && npm run test:run
```

### Key test scenarios to cover / update

**`MobileGigList.test.tsx`**:
- Upcoming gigs sorted ascending (nearest first).
- Past gigs sorted descending (most recent first).
- `initialScrollTop` prop restores scroll position (stub scroll target).

**`MobileGigDetail.test.tsx`**:
- Venue and Act rows are **not** rendered in the info card.
- Section heading reads `"Participants"` (not `"Organizations"`).
- `AttachmentManager` is rendered for all roles (mock `getEntityAttachments`).
- Edit button is present for Admin/Manager user, absent for Staff/Viewer.
- Entering edit mode shows title input, date/time inputs, tags, notes, participant list.
- Save calls `updateGig` with correct payload.
- Cancel returns to view mode without saving.
- Error on save shows toast and stays in edit mode.

Existing tests that reference `"Organizations"` heading must be updated to `"Participants"`. Existing tests that assert Venue/Act appear in the main info card must be removed or updated.
