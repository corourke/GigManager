# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: af2921b4-ff29-4c56-8bf8-728ae7e8964a -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: e8a859a3-0d00-45ba-af3b-51a53fa77a3c -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: f86c483c-0de5-45df-858e-6f47f82528fd -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: MobileGigList — Sort order fix and scroll position preservation
<!-- chat-id: a8991f6f-5734-46fc-a844-9012a372e7d1 -->

**Files**: `src/components/mobile/MobileGigList.tsx`, `src/App.tsx`, `src/components/mobile/MobileGigList.test.tsx`

**Changes**:

1. **Sort fix** (`MobileGigList.tsx` — `filteredGigs` useMemo, line 131):
   - Remove the descending sort from the `filteredGigs` memo (currently: `.sort((a, b) => new Date(b.start) - new Date(a.start))`).
   - Apply independent sorts to `upcomingGigs` (ascending: nearest first) and `pastGigs` (descending: most recent first) in their own `useMemo` blocks.

2. **Scroll position preservation** (`MobileGigList.tsx` + `App.tsx`):
   - Extend `MobileGigListProps` with `initialScrollTop?: number` and `onScrollPositionChange?: (scrollTop: number) => void`.
   - Inside `MobileGigList`, on mount use `useEffect` to scroll the scrollable container (`document.querySelector('[data-mobile-scroll]')` or `window`) to `initialScrollTop`.
   - Attach a scroll listener that calls `onScrollPositionChange` with the current `scrollTop`.
   - In `App.tsx`, add `const mobileGigListScrollTop = useRef(0)` and wire the two new props:
     - `initialScrollTop={mobileGigListScrollTop.current}`
     - `onScrollPositionChange={(pos) => { mobileGigListScrollTop.current = pos; }}`

3. **Tests** (`MobileGigList.test.tsx`):
   - Add a test asserting upcoming gigs are sorted ascending (nearest first) given two future gigs at different dates.
   - Add a test asserting past gigs are sorted descending (most recent first) given two past gigs at different dates.
   - Add a test verifying the `initialScrollTop` prop triggers scroll (mock `scrollTo` on the target element).

**Verification**: `npm run build && npm run test:run`

---

### [x] Step: MobileGigDetail — View improvements (remove Venue/Act, rename section, add attachments)
<!-- chat-id: cf9fff2b-a75d-4946-922d-ee75f1bf82aa -->

**Files**: `src/components/mobile/MobileGigDetail.tsx`, `src/components/mobile/MobileGigDetail.test.tsx`

**Changes**:

1. **Remove Venue/Act rows** (`MobileGigDetail.tsx`, lines 270–293):
   - Delete the two conditional JSX blocks that render `gig.venue` and `gig.act` inside the upper info `Card`.
   - Keep the `venue`/`act` derivations in `loadGig` (used by `handleDirections` and `handleCall`).
   - Remove unused `MapPin` and `Music` icon imports only if they are no longer referenced anywhere else in the file. Verify before removing.

2. **Rename "Organizations" → "Participants"** (`MobileGigDetail.tsx`, line 345):
   - Change the section heading string from `"Organizations"` to `"Participants"`.

3. **Add Attachments section** (`MobileGigDetail.tsx`):
   - Import `AttachmentManager` from `'../AttachmentManager'`.
   - Destructure `userRole` and `selectedOrganization` from `useAuth()` (in addition to the existing `user` destructure).
   - Derive `const canEdit = userRole === 'Admin' || userRole === 'Manager'`.
   - After the Participants card, add a new `Card` wrapping `<AttachmentManager organizationId={selectedOrganization?.id ?? ''} entityType="gig" entityId={gigId} allowUpload={canEdit} />`.

4. **Tests** (`MobileGigDetail.test.tsx`):
   - Mock `AttachmentManager` (or `attachment.service` functions) to avoid real HTTP calls.
   - Update/remove the existing test `'renders venue and act information'` — assert that Venue and Act labels are **not** present inside the info card.
   - Add a test asserting the section heading reads `"Participants"` (not `"Organizations"`).
   - Add a test (Staff role) asserting `AttachmentManager` is rendered with `allowUpload={false}` (or check the rendered output does not show an upload button).
   - Add a test (Admin role) asserting `AttachmentManager` is rendered with `allowUpload={true}`.
   - Update the `useAuth` mock in tests to expose `userRole` and `selectedOrganization` as needed per test.

**Verification**: `npm run build && npm run test:run`

---

### [x] Step: MobileGigDetail — Inline edit mode for Admin/Manager
<!-- chat-id: 56728d24-56f9-4569-ada2-8e3e068d67b9 -->

**Files**: `src/components/mobile/MobileGigDetail.tsx`, `src/components/mobile/MobileGigDetail.test.tsx`

**Changes**:

1. **New imports**:
   - `Pencil` from `lucide-react`.
   - `formatGigDateTimeForInput`, `parseGigDateTimeFromInput` from `'../../utils/dateUtils'`.
   - `getAllTimezones` from `'../../utils/timezones'`.
   - `searchOrganizations` from `'../../services/organization.service'`.
   - `Badge` from `'../ui/badge'` (if not already imported).

2. **Local interface** (add above component):
   ```ts
   interface EditParticipant {
     id?: string;
     organization_id: string;
     organization_name: string;
     role: string;
   }
   ```

3. **Edit state** (add inside component, after existing state):
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
   const [editTagInput, setEditTagInput] = useState('');
   const [editNotes, setEditNotes] = useState('');
   const [editParticipants, setEditParticipants] = useState<EditParticipant[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [showAddParticipant, setShowAddParticipant] = useState(false);
   const [orgSearchQuery, setOrgSearchQuery] = useState('');
   const [orgSearchResults, setOrgSearchResults] = useState<any[]>([]);
   const [selectedOrgResult, setSelectedOrgResult] = useState<any>(null);
   const [addParticipantRole, setAddParticipantRole] = useState('');
   ```

4. **Enter edit mode handler** (`handleStartEdit`):
   - Populate all edit state from the current `gig` object.
   - Use `formatGigDateTimeForInput(gig.start, gig.timezone)` for date/time fields.
   - Map `gig.participants` to `EditParticipant[]`.

5. **Save handler** (`handleSave`):
   - `setIsSaving(true)`.
   - Build ISO start/end strings from date+time inputs using `parseGigDateTimeFromInput`.
   - Call `updateGig(gigId, { title: editTitle, start, end, timezone: editTimezone, tags: editTags, notes: editNotes })`.
   - Call `updateGigParticipants(gigId, editParticipants.map(p => ({ organization_id: p.organization_id, role: p.role })))` — import `updateGigParticipants` from `gig.service`.
   - On success: `toast.success('Gig updated')`, `await loadGig()`, `setIsEditing(false)`.
   - On error: `toast.error(err.message || 'Failed to save')`, remain in edit mode.
   - `finally`: `setIsSaving(false)`.

6. **Header changes**:
   - In view mode (Admin/Manager): show a `Pencil` icon `Button` that calls `handleStartEdit` and `setIsEditing(true)`.
   - In edit mode: replace with **Save** (`Button` primary) and **Cancel** (`Button` variant=ghost) buttons.
   - The status badge toggle remains in both modes.

7. **Editable fields rendering** (inside the upper info `Card`, conditional on `isEditing`):
   - **Title**: `<input type="text">` replacing the `<h1>` title display (in edit mode only; the header `<h1>` can stay showing original title or be hidden — keep it simple, put the title input inside the card instead of the header).
   - **Date / Time / All-day / End Date / End Time**: native date+time inputs with the all-day checkbox toggling the time inputs' visibility.
   - **Timezone**: `<select>` using `getAllTimezones()` for options.
   - **Tags**: flex-wrap row of badge chips (sky-50/sky-700) each with `×` remove, plus a text input that pushes to `editTags` on Enter or comma keypress.
   - **Notes**: `<textarea rows={3}>`.
   - Use input style class: `w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border-0 outline-none focus:ring-2 focus:ring-sky-500/30`.

8. **Participant editing** (inside the Participants card, in edit mode):
   - Each row shows role label, org name, and a red `×` remove button.
   - Disable the `×` button for the current organization (`selectedOrganization?.id === p.organization_id`).
   - **Add participant** button toggles `showAddParticipant` inline form:
     - Text input for `orgSearchQuery` — on change, call debounced `searchOrganizations({ query })` and set `orgSearchResults`.
     - Results dropdown (small `<ul>`) — clicking a result sets `selectedOrgResult`.
     - Role `<select>` using `Object.keys(ORG_ROLE_CONFIG)`.
     - Confirm button: push `{ organization_id, organization_name, role }` to `editParticipants`, hide form.
     - Cancel button: hide form.

9. **Tests** (`MobileGigDetail.test.tsx`):
   - Update `useAuth` mock to expose `userRole` and `selectedOrganization`.
   - Add `updateGigParticipants` to the `gig.service` mock.
   - Mock `searchOrganizations` from `organization.service`.
   - Test: Edit button is present for Admin role, absent for Staff role.
   - Test: Clicking Edit shows title input, date input, textarea for notes, timezone select.
   - Test: Clicking Cancel returns to view mode without calling `updateGig`.
   - Test: Clicking Save calls `updateGig` with correct title/start/end/timezone/tags/notes.
   - Test: If `updateGig` rejects, toast error is shown and edit mode is preserved.
   - Test: Participant `×` button removes that participant from the edit list.
   - Test: Add participant flow — search, select org, choose role, confirm — adds to participant list.

**Verification**: `npm run build && npm run test:run`

### [x] Step: Fix small issues
<!-- chat-id: 5d6d63ee-4021-45e3-8741-672488455933 -->

As detailed by user.
