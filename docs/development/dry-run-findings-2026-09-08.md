# GigWrangler — Documentation Dry Run, Pass 2

**Date**: 2026-09-08
**Target**: hosted **dev** Supabase via `.env.development.local`; `npm run dev` → localhost:3000
**Focus** (areas pass 1 missed or barely touched):
1. Organization claiming / access-request flow (PR #48 — newest, least tested)
2. Participant → contact flow (PR #14)
3. Schedule / Run-of-Day entries
4. Calendar view + Google Calendar connect UI
5. Change History panel
6. Equipment / Kits (assign to gig, kit tree, inventory reports)

Legend: 🔴 blocker · 🟠 friction · 🟡 papercut · 💡 doc note · ✅ works · ⚙️ env

Existing dev test data from pass 1: user `cameron.orourke+gwdry1@gmail.com` ("Dana Dryrun"),
org **Dryrun Sound & Lighting Co**, gig **Dryrun — Summer Festival Main Stage**.

---

## Findings log

### 1. Organization claiming / access requests (PR #48)

**How it actually works (from a normal user's view):**
- ✅ **F1 fixed** — the org-selection screen's button is now **"Browse All Organizations"** (was "Admin: View All Organizations").
- 💡 DOC — there is **no "Claim" button**. The path to becoming Admin of an org you don't manage is:
  1. Find the org via **Switch Organization → search** → **"Join as Viewer"** (joins as Viewer; unclaimed *or* claimed doesn't matter for the search card — it always says "Join as Viewer").
  2. Open that org → **Team** tab → **"Request Access"** (top-right).
  3. Dialog: *"Ask <Org>'s Admin — or, if it doesn't have one yet, a platform moderator — to grant you a higher role."* → pick **Manager** or **Admin**, optional message → **Submit Request**.
  4. Toast "Access request submitted". A platform moderator (for unclaimed orgs) or the org's Admin (for claimed orgs) approves/rejects; requester is notified via the bell + email.
- ✅ Duplicate submit is caught server-side: "You already have a pending access request for this organization".
- 🟠 **P2-1 — "Browse All Organizations" page still titled "Admin: All Organizations" / "Manage all organizations in the system"** for a regular non-moderator user. The button was relabeled; the page header and subtitle weren't. Reads as if the user has system-admin powers.
- 🟠 **P2-2 — every *unclaimed* org row on "Browse All Organizations" shows "Edit Organization" and "Delete Organization" to any logged-in user.** Dana (a brand-new user) can open the edit form for "House of Blues", "Fox Theatre", etc., change name/roles/address, add contacts, or delete them. This is the #24 concern one layer down: "unclaimed" currently means "editable/deletable by anyone", and the dev DB has ~50 seeded venues/acts in that state. Claimed orgs correctly show no action buttons.
- 🟡 **P2-3 — after "Request Access", the Team screen gives no pending-state feedback.** The button still says "Request Access", the dialog reopens blank, and you only learn a request exists by submitting again and reading the error toast. Want: button → "Request pending", or show the pending request inline.
- 🟡 **P2-4 — Viewer sees "Create First Gig" / "Create Gig".** Inside House of Blues as a Viewer, the Gigs tab shows the "Create First Gig" empty-state CTA. Role-gating hides Dashboard/Financials for Viewers but not the gig-create CTA (may 403 on submit — not tested).
- ⚠️ **Not tested:** the moderator side (approval queue, approve/reject, the resulting notification + email). Needs a `platform_moderator` account; Cameron already verified this live. Worth a screenshot pass for docs once a moderator login is available.
- 💡 DOC — nav is role-gated: Viewer sees only **Gigs · Team · Equipment** (no Dashboard, no Financials).

Test data added on dev: Dana is now a **Viewer of "House of Blues"** with a **pending Admin access request** (message: "Doc dry-run… Safe to reject").

### 2. Participant → contact flow (PR #14, #28)

On the festival gig's edit view, "Add Participant":
- ✅ **F17 corrected** (Cameron was right) — after you pick a **Role** on the new participant row, a **`Search organizations…`** field appears. Type a name → live results (e.g. *"Found 1 result — Fox Theatre / Venue"*) plus a **`Create "<name>"`** option to register a new participating org inline.
- ✅ Picking an existing org (Fox Theatre) adds it to Participants immediately — row shows role + org name + **Change organization / Mark as client / More actions / Remove participant**.
- ✅ **#28 verified fixed** — the **"More actions"** (⋯) menu is present on the freshly-added participant row **without a page reload** (this was the F17/#28 bug).
- ⚠️ **Not completed via automation** — the "More actions" → *add a contact* submenu is a Radix menu that needs real pointer events; the hidden-pane tooling problem (below) blocked screenshot-guided clicks. Needs a short human pass to document: what the contact form asks, and whether it offers the participating org's existing members first (the #13 behavior).
- 💡 DOC — a participant row also has **"Change organization"** and **"Mark as client"** — worth explaining (client flag drives billing/settlement framing).

### 3. Verified-fixed from pass 1 (incidental confirmations)
- ✅ **#25 (expense date off-by-one)** — the pass-1 expense entered `2026-09-06` now displays **"Sep 06, 2026"** (was "Sep 05, 2026").
- ✅ **#16 (staff-slot assignment row)** — the pass-1 FOH Engineer slot now shows its assignment sub-row (`Search for user…`, Open status, Rate) on load.
- ✅ **#18 (logout)** — avatar menu has a working **Sign Out**.
- ✅ **#26 (deep links)** — `/gigs/:id/edit` deep links resolved this session (redirect-to-list not reproduced; note `/select-organization` still redirects to `/gigs` when an org is already selected, which is expected).
- 💡 pass-1 note corrected: the schedule quick-add from pass 1 **did persist** — the gig shows `SCHEDULE (1) — 12:00 PM Set` (type saved as "Set", the default, not the "Load-In" I intended — the type select may not have taken).

### 4. Change History — gig "History" tab

- ✅ The gig detail view has an **Overview | History** tab toggle (desktop). History shows a
  timeline: actor · org · human-readable change · relative time, oldest ("Gig created") last.
- ✅ **Field edits are tracked** with readable descriptions — after editing:
  - *"Renamed from 'Dryrun — Summer Festival Main Stage' to '… (edited)'"*
  - *"Gig created"*
- 🟠 **P2-5 — a no-op change was logged: "Rescheduled from 20 Sep 2026 14:00 to 20 Sep 2026 14:00"** (identical from/to). Editing only the title triggered a spurious "Rescheduled" entry with no actual change. The diff logic should not emit an event when old == new. (Automated edit may be atypical, but the user-facing log showing "changed X from A to A" is clearly wrong.)
- 🟠 **P2-6 — related-entity changes are not in the gig's history.** Adding a **Venue participant** (Fox Theatre), adding a **staff slot**, and adding a **$250 expense** produced **no** history entries — only direct gig-record fields (title, dates, status) are tracked. Confirm whether that's the intended scope; §9 docs must state exactly what Change History covers and what it doesn't.
- 💡 DOC — adding a participant with the **Venue** role auto-populates the gig's **VENUE** field (you don't set venue directly; you add a Venue participant). Same pattern likely for **Act**.
- 💡 DOC — the gig edit form **auto-saves** (no Save button); Basic Info fields, participant rows, staff rows all persist on change/blur.

### 5. Schedule / Run-of-Day — partial
- ✅ Schedule "Add" → type quick-pick (Load-In / Soundcheck / Rehearsal / Set / Intermission / Load-Out / Other / Custom…) then a compact row: `time` input + type `select` + "End time, date, notes" expander + confirm.
- 🟡 **P2-7** — the compact add row is still fiddly: the pass-1 entry persisted as type **"Set"** (the default) rather than the intended type, suggesting the type `<select>` doesn't always capture the choice before confirm. Needs a careful human pass to confirm the click order that reliably saves the right type.
- ⏭️ End-time / notes expander, editing an entry, and date grouping across multi-day gigs — not tested.

### 6. Not reached this pass
- **Calendar view + Google Calendar connect UI** (§7) — the connect/permission flow from PR #19 / #9 still needs a walkthrough + screenshots.
- **Equipment / Kits** (§4) — assign a kit to a gig, the kit component tree, Location Explorer, the three inventory reports. Untouched in both passes.
- **Moderator side of access requests** (§11) — approve/reject queue, resulting notification + email. Needs a `platform_moderator` login.
- **Participant → add-contact** submenu (§3) — the "More actions" menu is present, but the add-contact form itself and whether it offers existing members first (#13) is untested.

---

## Coverage summary

| Area | Pass 1 | Pass 2 | State |
|---|---|---|---|
| Register / create org / create gig | ✅ | — | done |
| Org claiming / access request (requester) | — | ✅ | done; **P2-1, P2-2** worth issues |
| Access request (moderator) | — | ⏭️ | needs moderator login |
| Participant → pick org | ✅ (blocked) | ✅ | works; contact sub-step still untested |
| Staff slot → assign a person | ⏭️ | ⏭️ | still not completed end-to-end |
| Add expense | ✅ | ✅ verified date fix | done |
| Change History | ⏭️ | ✅ | works; **P2-5, P2-6** worth issues |
| Schedule entries | ⏭️ | ~ | partial; **P2-7** |
| Calendar / Google Calendar | ⏭️ | ⏭️ | **not started** |
| Equipment / Kits | ⏭️ | ⏭️ | **not started** |

**Tooling note:** the embedded browser pane auto-hides between actions, so scroll + screenshots
of anything below the fold return blank. Same limitation as pass 1. A local Chrome (Claude in
Chrome) or a human-driven pass would be much faster for Calendar + Equipment.

## New issue candidates from pass 2

| # | Sev | One-liner |
|---|-----|-----------|
| P2-2 | 🟠 | "Browse All Organizations": any user gets **Edit / Delete** on every *unclaimed* org (~50 seeded venues/acts on dev) |
| P2-5 | 🟠 | Change History logs no-op events ("Rescheduled from X to X" with identical values) |
| P2-6 | 🟠 | Gig Change History omits participant / staff / financial / schedule changes — only direct gig fields |
| P2-1 | 🟡 | "Browse All Organizations" page still titled "Admin: All Organizations" / "Manage all organizations in the system" for non-moderators |
| P2-3 | 🟡 | After "Request Access", Team screen shows no pending state; button still says "Request Access", dupe caught only server-side |
| P2-4 | 🟡 | Viewer sees the "Create First Gig" CTA (role-gating hides Dashboard/Financials but not this) |
| P2-7 | 🟡 | Schedule quick-add: entry type not reliably captured (saved as default "Set") |



