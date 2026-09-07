# GigWrangler — Documentation Dry Run Findings

**Date**: 2026-09-06
**Tester**: Claude (browser automation)
**Target backend**: hosted **dev** Supabase (`qcrzwsazasaojqoqxwnr.supabase.co`) via `.env.development.local`
**Dev server**: `npm run dev` → http://localhost:3000
**Method**: Walk the primary new-user path as if writing "Getting Started". Log every hang, dead end, confusing label, or missing affordance.

Legend: 🔴 blocker · 🟠 friction/confusing · 🟡 papercut · 💡 doc note · ✅ works cleanly · ⚙️ env/tooling

**Test data created on dev (safe to delete):** user `cameron.orourke+gwdry1@gmail.com` ("Dana Dryrun"),
org **Dryrun Sound & Lighting Co**, gig **Dryrun — Summer Festival Main Stage** (2026-09-20),
one $250 Supplies expense on that gig, one unassigned FOH Engineer staff slot.

---

## Flow coverage
- [x] Register a new user
- [x] Create an organization
- [x] Create a gig (basic + start/end times)
- [x] Add a staff slot (role) — **could not assign a person** (see F15/F18)
- [x] Add an expense (Simple Expense)
- [x] Upcoming/Past split verified on the web gig list
- [~] Participants: add a participating org — **row appears but has no org/contact field** (F17)
- [ ] Schedule entry — quick-add UI is fiddly under automation; not completed (see F19)
- [ ] Calendar view — not reached
- [ ] Change history — not reached

---

## Top issue candidates (my ranking)

| # | Sev | Issue | One-liner |
|---|-----|-------|-----------|
| F4  | 🔴 | [#22](https://github.com/corourke/GigManager/issues/22) | Google Places business/venue search returns **"API key expired"** (500) on dev — breaks org autofill and likely gig venue lookup |
| F13 | 🔴 | [#23](https://github.com/corourke/GigManager/issues/23) | Tags typed on the **Create Gig** form are silently discarded on save (must press Enter to commit a tag) |
| F1  | 🟠 | [#24](https://github.com/corourke/GigManager/issues/24) | **"Admin: View All Organizations"** is shown to every user, ungated in code; restrict edit/delete to unclaimed orgs (listing is fine) |
| F16 | 🟠 | [#25](https://github.com/corourke/GigManager/issues/25) | Expense **date displays one day earlier** than entered (entered 2026-09-06 → shows "Sep 05, 2026") — UTC/local parsing |
| F14 | 🟠 | [#26](https://github.com/corourke/GigManager/issues/26) | Deep-linking to `/gigs/:id/edit` (bookmark / hard refresh) **redirects to `/gigs`** — contradicts the June remediation's "deep-linkable URLs" goal |
| F15 | 🟠 | [#27](https://github.com/corourke/GigManager/issues/27) | In the gig **list**, nothing opens a gig on click (cells are inline-editable); the gig opens only via the row **⋮ → View/Edit** menu |
| F17 | 🟠 | [#28](https://github.com/corourke/GigManager/issues/28) | **Add Participant** row: the "⋯" contact menu doesn't appear until a page reload (the org search field *is* present — earlier note corrected) |
| F18 | 🟠 | [#16](https://github.com/corourke/GigManager/issues/16) (comment) | Newly-added **staff slots** only fully render their sub-fields after a full page reload — folded into #16 |
| F5  | 🟠 | [#29](https://github.com/corourke/GigManager/issues/29) | Raw API error strings surfaced to users ("Google Places API error: 400"); Participants section's search-with-fallback is the pattern to follow |
| F7  | 🟠 | [#30](https://github.com/corourke/GigManager/issues/30) | Create-Org has three unexplained submit buttons: Cancel / Create without Joining / Create and Join |
| F9  | 🟠 | _not filed_ | No venue/location field on the Create Gig form at all |
| F10 | 🟠 | _not filed_ | Gig **End** Date/Time is mandatory (a Date Hold often has no known end) |
| F6  | 🟡 | [#31](https://github.com/corourke/GigManager/issues/31) | Error toasts never auto-dismiss |
| F11 | 🟡 | _not an issue_ | Time entry = native date input + separate HH / MM (5-min) dropdowns; schedule quick-add uses a single `<input type=time>` — inconsistent, and 5-min steps can't express e.g. 7:12. Minor. |
| F12 | 🟡 | _OK for now_ | Timezone list is US-only; should ideally default from detected user location |
| F2  | 🟡 | [#32](https://github.com/corourke/GigManager/issues/32) | Signup: no confirm-password field, no strength meter (low priority) |
| F20 | 🟡 | _wontfix_ | Seeded staff-role near-duplicates — fine on dev/test; production seed is correct |

Issues filed 2026-09-07: **#22–#32**, plus a comment on **#16** (F18).

---

## Findings log

### 1. Register a new user
- ✅ Sign In / Sign Up toggle is clear. Sign Up = First name, Last name, Email, Password ("Minimum 6 characters" hint).
- ✅ Submit → account created, auto-signed-in, **no email-confirmation step** (dev has confirmation disabled) → lands on "Select Organization".
- 💡 DOC: new users land on **Select Organization**, not a dashboard. First action is always create-or-join an org.
- 🟠 **F1 — "Admin: View All Organizations" shows for a brand-new user with zero memberships.** Confirmed in code: `src/routes/screens.tsx:102` passes `onAdminViewAll={nav.toAdminOrgs}` unconditionally — no `isSuperAdmin`/role guard. `src/components/AdminOrganizationsScreen.tsx` then `GET`s `server/organizations` (all orgs) and renders per-row **Edit** and **Delete**. Severity hinges on whether the `server/organizations` edge function enforces authz server-side; the client gate is absent either way. File as security/authz.
- 🟡 **F2** — no confirm-password field, no strength meter. Fine for beta.
- 🟡 **F3** — avatar "DD" shows top-right immediately, but no profile view/edit affordance from the Select Organization screen.

### 2. Create an organization
- ✅ "Create New Organization" → Google-business search to auto-fill, with "Skip search and enter details manually".
- 🔴 **F4 — business search is broken on dev.** Any query → toast **"Google Places API error: 400"**; console shows the real cause: `status: 500, details: "API key expired. Please renew the API key."` from the `server` edge function's Google Places call. The **same dependency** almost certainly powers gig venue/address lookup, so treat venue search as broken too until the key is renewed. Blocks documenting any "search for your business/venue" step.
- 🟠 **F5** — raw developer error shown to users. Want: "Couldn't reach business search — enter details manually."
- 🟡 **F6** — that error toast never auto-dismisses; still visible screens later, after the org was created.
- 💡 DOC — manual org form: Name (req); **Organization Roles** (req, multi-select: Production / Sound / Lighting / Staging / Rental Company, Venue, Act, Agency); Phone; Website; **Allowed Email Domains** (comma-sep — anyone with a matching email domain can self-join, worth calling out as an access-control setting); Markdown Description (Edit/Preview tabs); optional Location block (Address, Line 2, City, State, Postal, Country).
- 🟠 **F7 — three submit buttons, unexplained:** Cancel / **Create without Joining** / **Create and Join**. A first-timer won't know why they'd make an org they don't join (it's for adding a partner org — venue/vendor — you don't belong to). Needs helper text + a doc callout.
- ✅ "Create and Join" → Dashboard, toast "Organization created successfully!". `role: 'Admin'` assigned to the creator (`src/routes/screens.tsx:117`).
- ✅ **F8 resolved** — the "Admin" seen near the org name is the **role badge** (Dana is Admin of the org she made), *not* a nav item. Nav bar is Dashboard · Gigs · Financials · Team · Equipment only. Disregard the earlier "Admin in nav" note.
- 💡 DOC — Dashboard tiles: Gigs (Booked / Proposed / Date Hold), Equipment value (Total / Insured / Rental), Revenue (This month / Last month / This year), Status Summary (Completed / Settled / Cancelled), Upcoming Gigs (next 30 days), Recent Activity. Good "tour" screenshot once populated.

### 3. Create a gig
- ✅ Gigs page: List / Calendar toggle; New Gig, Import, Export. Empty state "No gigs yet — Create your first gig" is clear.
- 💡 DOC — **Create New Gig form is deliberately minimal**: Title (req), All-day, Start Date/Time (req), End Date/Time (req), Timezone (req, default PT), Status (default Date Hold; options Date Hold / Proposed / Booked / Completed / Cancelled / Settled), Tags, Notes (Markdown).
- 🟠 **F9 — no venue / location / address field anywhere on Create Gig.** Everything else (venue, participants, staffing, financials, equipment, schedule) is added afterward from the gig's edit page. DOC must set this expectation.
- 🟠 **F10 — End Date/Time is required** even for a Date Hold. Contrast: schedule entries allow an optional end. Candidate issue.
- 🟡 **F11** — time entry: native date input + two dropdowns (HH, then MM in 5-min steps).
- 🟡 **F12** — Timezone list is US-only (ET/CT/MT/PT/AZ/AK/HI).
- 🔴 **F13 — Tags typed on Create Gig are silently dropped.** Entered "festival, main-stage", submitted, "Gig created successfully" — the saved gig shows **no tags** (blank on the edit view and "empty" in the list's Tags column). Likely needs Enter-to-chip and discards free text without warning.
- ✅ After create → the gig **edit** view (`/gigs/:id/edit`) with inline-editable Basic Info + a "⋮" menu.
- 💡 DOC — gig edit sections, in order: **Basic Information · Participants · Schedule · Staff Assignments · Financials · Equipment · Gig Attachments** ("anatomy of a gig" reference).
- 💡 DOC — the creating org is **auto-added as a Participant** (here role "Sound", derived from the org's roles).

### 4. Schedule
- 💡 DOC — Schedule "Add" reveals a quick-pick type list: **Load-In, Soundcheck, Rehearsal, Set, Intermission, Load-Out, Other, Custom…**, then a compact row = start-time input + type select + a "**End time, date, notes**" expander + confirm/delete. Matches the "compact rows, optional end time" design.
- 🟡 **F19** — the compact quick-add row is easy to dismiss accidentally (loses focus → discards) and has no visible labels; under automation it never persisted an entry. Worth a human pass to confirm it's not also fiddly for real users; at minimum the doc needs a precise click-path.

### 5. Staff Assignments
- 💡 DOC — "Add Staff Slot" → inline row: **Role** picker + **Required** qty (default 1) + **Notes** + delete. Seeded roles present: CameraOp, FOH, FOH Engineer, Lighting, Lighting Operator, Lighting Tech, Loader, Monitor, Monitor Engineer, Rigger, Runner, Stage, Stage Hand, Stage Manager, Video.
- 🟡 **F20** — that role list has confusing near-duplicates (FOH vs FOH Engineer, Monitor vs Monitor Engineer, Stage vs Stage Hand vs Stage Manager, Lighting vs Lighting Operator vs Lighting Tech). Trim the seed or explain the distinction.
- 🟠 **F18 — sub-fields only appear after a reload.** Right after adding a slot: only Role/Required/Notes. After a full page reload the same slot also shows **Open** (status) + **Rate $**. So the person-assignment affordance isn't discoverable in the moment you create the slot — exactly what open issue **#16** describes.
- 🟠 **F15 (list)** — separately, in the gig **list** the row/title cells are inline-editable; a gig opens only via **⋮ → View** (read-only) or **⋮ → Edit**. New users will click the title expecting to open the gig.
- ⚠️ Could not complete an actual person-to-slot assignment via automation (needs the reloaded state + a person to assign; only "Dana" exists). Flag for a human pass — this is the crux of issue #16.
- 🟡 deleting a staff slot happens with no confirmation dialog (no undo observed).

### 6. Financials — add an expense
- ✅ "Edit Financials" toggles the section into edit mode ("Done Editing") and reveals: **Agreement · Payment · Expense / Mileage · Other · Upload Receipt**.
- ✅ "Expense / Mileage" → chooser dialog: **Mileage** (auto-calc via IRS rate) vs **Simple Expense** (manual amount & category). Clear.
- ✅ "Record Simple Expense" dialog: Date, Amount, **Category** (IRS Schedule C list: Advertising, Commissions and fees, Contract labor, Insurance, Legal and professional services, Office expense, Rent or lease, Repairs and maintenance, Supplies, Travel, Meals, Utilities, Other expenses), Description, **Already paid** toggle, **Receipt (optional)** inline upload, "Show advanced fields", Save.
- ✅ Saved $250 / Supplies → COSTS $250.00, PROFIT card flips to **"LOSS -$250.00"** (nice), Expenses table shows the row (Manual · Expense Incurred · Unpaid · Supplies · $250.00).
- 🟠 **F16 — date off by one.** Entered **2026-09-06**; the saved row displays **"Sep 05, 2026"**. Classic UTC-midnight vs local-date parsing (matches the project's known UTC/timezone gotchas). Check the Mileage and Payment forms for the same bug.

### 7. Participants — add a participating organization
- 🟠 **F17** — "Add Participant" inserts a row with a **Role** combobox (Production / Sound / Lighting / Staging / Rentals / Venue / Act / Agency) and "Mark as client" / "Remove participant" — but **no field to type or pick the participating organization's name, and no contact affordance**. The auto-created own-org row has an extra "More actions" menu the new row lacks. Presumably the org/name + "add contact" (issue #13 / PR #14 work) only appear after the row persists + reload (F18 pattern). Needs a human pass — this is recent, high-touch work and the dry run couldn't exercise it.

### 8. Upcoming / Past split (web gig list) — ✅
- ✅ With one future gig, the list shows **Upcoming (1) / Past (0)** tabs, "1 row", filter chips (All Dates, All Statuses), a Columns menu, and SmartDataTable columns Title / Start / Status / Venue / Act / Tags. Matches PR #15 / issues #6, #7. (Didn't get to create a past-dated gig to see Past populate, or to verify the new "filled funnel" active-filter icon state from issue #6.)

---

## Environment / tooling notes (not app bugs)
- ⚙️ `.env.development.local` points the app at the **hosted dev** Supabase, not local. Local Supabase is up but has **no edge-runtime container** running, so `server` / `ai-scan` functions wouldn't work locally anyway — hosted dev was the right target.
- ⚙️ `npm run dev` (Vite, port 3000) was killed once by the preview harness ~10s in; restart was clean and the auth session survived. If this recurs for real devs, worth noting in the run docs.
- ⚙️ Google Places key expired on dev (F4) — renew `GOOGLE_PLACES_API_KEY` (Supabase secret) and confirm "Places API (New)" is enabled before any venue/business-search documentation or screenshots.
