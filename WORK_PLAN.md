# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage routine ("GitWrangler issue triage", 09:00 UTC) and the
GigWrangler Coordinator session. Edit this file in place; it is not an append-only log.**

**Who writes what.** The triage routine keeps §1, §2, §4 and §5 current and may add entries to
[§3b](#3b-raised-by-triage-for-the-coordinator). Only the coordinator session writes
[§3a](#3a-waiting-on-cameron) and [§3c](#3c-ready-to-build-nothing-blocking), and only the coordinator asks
Cameron questions.

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-10-06 (coordinator: PR #142 merged; PR [#143](https://github.com/corourke/GigManager/pull/143) merged 23:15 UTC — equipment details pop-up, Kit + Type save, drop `sub_category`; Cameron to apply migration `20261011000000` on dev, then prod)
- **State verified:** 2026-10-06 09:15 UTC by triage (10 open issues: #20, #39, #92, #125, #129, #130, #131, #133, #134, #135; open PRs: #138 (coordinator, CI green, mergeable at `c3d9b4e`) and #139 (triage user-guide pass, getting-started))

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#39](https://github.com/corourke/GigManager/issues/39) | Too many menu levels | UI/UX design | Design and 5-PR plan approved 10-06 (canvas https://claude.ai/artifact/KNK7pFzHHXkF74Y7mHgUv2; plan in the issue). PR 1 (frame) [#144](https://github.com/corourke/GigManager/pull/144) merged 10-07 (coordinator review: clean against main after #143/#145, 1192 tests pass); PR 2 (drill-down screens) unblocked, #143 merged | Nothing — PR 2 next |
| [#92](https://github.com/corourke/GigManager/issues/92) | Replace-all autosave can delete rows another user or tab added | Bug | From the 09-29 code review, confirmed by reading the code | Coordinator — not started |
| [#129](https://github.com/corourke/GigManager/issues/129) | Expense → asset deletes the wrong ledger rows; no asset → expense | Bug / feature | Filed 10-05; fix proposed (needs a migration) | Cameron: approve fix |
| [#133](https://github.com/corourke/GigManager/issues/133) | Purchases: separate "track as equipment" from tax treatment (expense / depreciate) | Feature / data | Step 1 live in prod 10-06; step 2 merged 10-06 (PR [#137](https://github.com/corourke/GigManager/pull/137): UI, report, tax-years card, migration `20261007000000`) | Excellines → expense and 2024 + 2025 locked in prod 10-06 (Cameron's go). Categories + report design A merged 10-06 in PR [#138](https://github.com/corourke/GigManager/pull/138) (migration `20261008000000`). Cameron: apply `20261007000000` + `20261008000000` with that build; equipment-category tidy applied in prod 10-06 (4 assets, 3 lines; 2025 caster-board line left, locked). Step 3 (gig links on lines, fixes #130) in PR [#140](https://github.com/corourke/GigManager/pull/140), migration `20261009000000`. **Next (Cameron 10-06):** add every Schedule C expense line to `expense_categories`, `active = false` for unused ones (name clashes with his 27b headings to settle with him); 10-06 decisions: org-specific expense + equipment category tables with a starter set; `assets.sub_category` folds into `assets.type` written general → specific ("Cable, XLR, Snake"). Type worksheet https://claude.ai/artifact/AchBgpE5Q3PeyaEDy6LPBj approved by Cameron; applied to prod 10-06 with his go (196 assets retyped, 7 moved category, 3 linked 2026 lines followed; EtherCon/PowerCon spelling; backups in coordinator scratchpad). PR [#140](https://github.com/corourke/GigManager/pull/140) merged 10-06: gig links on lines (closes #130) + per-org category tables. Migrations `20261007000000`–`20261010000000` live on dev and prod 10-06 (prod verified read-only: no header gig links; the 4 receipts' lines and money rows moved; Act4Audio has its own lists). 10-06: `20261009000000` failed on dev under db push (pending deferred trigger before ALTER TABLE); fixed in PR [#141](https://github.com/corourke/GigManager/pull/141) with Cameron's OK to edit it (never applied anywhere); the RLS runner now applies migrations as single transactions. Next (coordinator): equipment details pop-up + drop `sub_category`. Equipment details pop-up mockup on the design canvas https://claude.ai/artifact/F5bNChuF1sm9r7LX4KyL16. Kit name and Type typed on the review screen are never saved today (RPC ignores kit, reads `type` not `equipment_type`) — fixed by the pop-up work. **PR [#143](https://github.com/corourke/GigManager/pull/143) (10-06):** pop-up + compact chip, Kit and Type save, asset form Category/Type pickers, drops `assets.sub_category`, `purchases.sub_category` and `reclassify_expense_as_asset` (migration `20261011000000`; prod values backed up in coordinator scratchpad). Merged 10-06 23:15 UTC. Deployed to dev 10-07 by Cameron (with #145; user tests passed). PR [#146](https://github.com/corourke/GigManager/pull/146) merged 10-07: Equipment switch moved after the expense category and joined to its details (no migration). Prod pending: #143 + #145 + #146 + `20261011000000`. Follow-up PR [#145](https://github.com/corourke/GigManager/pull/145) merged 10-06: pop-up no longer overflows on a long item name, styled to the mockup (no migration). Leftovers: `ai-scan` still returns `sub_category` (ignored; remove at its next deploy); optional "+ New kit" in the pop-up |
| [#134](https://github.com/corourke/GigManager/issues/134) | Grey-zone check: expensed items with per-item cost $200–$2,500 | Report / data | Answered 10-05 (2024–25: none; 2026: SHEHDS moving heads $2,392.05) | Cameron decides the 2026 item before filing |
| [#135](https://github.com/corourke/GigManager/issues/135) | Audit and fix 2026 purchase data (tax treatment, equipment, gig expenses) after the code fixes | Data | Filed 10-05 | Blocked on #133, #130, #131, #125 steps 2–3 |
| [#130](https://github.com/corourke/GigManager/issues/130) | Scan on a gig page books the whole invoice (assets included) as one gig expense | Bug | Filed 10-05; fix proposed | Cameron: approve fix |
| [#131](https://github.com/corourke/GigManager/issues/131) | Purchases: smaller data issues (line dates, ledger edits, dropped fields, stale import script) | Bug (checklist) | Filed 10-05 | Cameron: approve; line dates first (blocks #125) |
| [#125](https://github.com/corourke/GigManager/issues/125) | Financials → Reporting: tax-program data export (expenses by category, assets by recovery period, disposals) | Feature / data | Plan agreed 10-05; step 0 done (PR #127); blocked on #128–#131 | Cameron: category table, 6 questions, F1–F7 approvals |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Refactor | Pilot merged (PR #66); `attachment.service.ts` merged 09-30 (PR [#106](https://github.com/corourke/GigManager/pull/106)); 14 services remain | Nothing — next service when released |

---

## 2. Open items in detail

### Bugs

#102 and #103 were fixed by PRs #104 and #107, merged 09-30, and #109 by PR #120, merged 10-04 (see §4). #107 put the shared lookup in `resolveGigActivityCtx` (`gigService.shared.ts`); `GigScheduleEditor` and `updateGig` still rely on the membership fallback.

### Features

*(#111 and #117 shipped 10-04 in PRs #122 and #121; see §4.)*

### Financials UX

*(#75, one edit mode for the whole gig on web, was folded into #12 on 09-26.)*

### Security

*(#61 closed 09-25: every leak fixed in PR #76; the migration was applied to dev and prod on 09-26. Any new org-private
table or policy change needs a test in `supabase/tests/rls/`; CI runs it as the `rls` job.)*

### Diagnostics / ops

*(#52 closed 09-25 — health check live on dev and prod; see §4.)*

### Gig list / detail UX

*(#12 closed 10-01 at Cameron's request: all five PRs merged; see §4.)*

### UI/UX — in design scoping

**[#39](https://github.com/corourke/GigManager/issues/39) — "Too many menu levels".**
10-06: Cameron leaned to Variant 1 without breadcrumbs, and asked for less vertical space, a title that always lands in the same place, Back always in the same place, and a flatter Equipment menu. Round 2 is in the issue (comment 10-06). Next: his pick, then a work plan, then build. Same pattern as #12.

### Refactor

**[#20](https://github.com/corourke/GigManager/issues/20) — Shared data-access layer under `src/services/`.**
Base module + `user.service.ts` pilot **merged (PR #66, 09-22)**. The pattern is now settled — the remaining
~15 services are intentionally left for later, migrated service-by-service, one at a time. 09-30: Cameron asked
for more triage work, so the coordinator released `attachment.service.ts` as the next one (§3c); PR #106 moved it, merged 09-30. `deleteAttachment` keeps its own queries, because it needs the deleted rows to detect a delete that RLS blocked.

### Auth / session

*(#32 closed 09-30 by PR #105; see §4.)*

---

## 3. Decisions and ready work

### 3a. Waiting on Cameron

*Curated by the coordinator session only.* Nothing below can move without a reply. Listed roughly in the
order that unblocks the most work; the coordinator puts these to Cameron one at a time.

1. **Gig financials redesign: done.** #123 and #124 merged; migration `20261005000000` is in prod (verified read-only 10-05: 125 rows converted, 80 in / 45 out).
1. **Financials → Reporting ([#125](https://github.com/corourke/GigManager/issues/125)), 10-05:** plan agreed and kept in the issue (tax-program data export; no tax calculation). Step 0 done: `docs/technical/purchases-assets-expenses.md` (docs PR [#127](https://github.com/corourke/GigManager/pull/127), to merge). It found bugs that must be fixed before the reports can be trusted, now filed as **#128 (urgent: $0 costs on edit), #129, #130, #131**; the revised order of work and the report counting rule are in #125. **Waiting on Cameron:** approve the fixes for #129–#131 (each built test-first; #128 is in PR #132); the expense-category table and 6 open questions in #125 (including how returns refunded as store credit are recorded); each prod data fix F1–F7 needs his approval.
   - **Deploy #128's fix** (PR #132, merged 10-05; frontend only): dev first, then prod. Check: open IDJ Now 2025-01-20 ($131.58); lines show $84.92 and $46.66 and saving leaves them unchanged. Until then, avoid editing CSV-imported purchases.
   - **2025 reconciliation** (10-05): assets match the filed Form 4562 list item for item; expenses match the filed $11,977 once Excellines ($314.30, expensed on the return, made an asset in GigWrangler 06-11) and Reimbursable ($47.16, not deducted) are accounted for. Cameron is answering 10 questions in the private worksheet artifact https://claude.ai/artifact/PSgmQjps6rGT5bFWSw4uNo (answers stored in its db; the coordinator reads them with ArtifactData). Its expense-line split section is not loaded yet (optional).
   - **2025 data fixes: applied to prod 10-05 ~22:24 UTC with Cameron's go.** Covered the Amazon line moves, the 9/20 → 9/20 + 10/26 split, the four returns (date + net refund), a −$83.42 return line for the Gator 1U shelf, and IDJ 2/23 spread over $214.00. Verified read-only: all 13 touched invoices equal their lines. 2025 expense lines are now $11,790.63 and asset lines $42,470.86. Pre-change rows were backed up (coordinator scratchpad `backup/`). Excellines set to expense (asset kept) and 2024 + 2025 locked in `tax_years` 10-06 with Cameron's go. Still open for 2025: categories (#125 F3). The four return/order PDFs are not attached in the app yet (Cameron).
2. **Deploy migration `20260929000000_tighten_membership_and_rpc_authorization.sql`** ([#95](https://github.com/corourke/GigManager/pull/95), merged 09-29): `./deploy_dev.sh`, then `./deploy_prod.sh`. That applies the migration and redeploys the `server` edge function, which also ships #90's and #91's fixes (PRs #96, #97). If you deployed before 04:19 UTC on 09-30, run it once more for those two. Then, as an Admin: add and remove a contact on your own org, add a contact to a venue you created, and invite a Staff member. Urgent.
3. **[#39](https://github.com/corourke/GigManager/issues/39)**: "keep top nav" (09-26) rules out the sidebar (Option B). It follows #12's redesign, since the gig screen is the deepest page and the two need one consistent header.
4. **Deploy Purchases to prod** ([#116](https://github.com/corourke/GigManager/pull/116) merged 10-03; tested on dev by Cameron): `./deploy_prod.sh` applies migration `20261002000000_purchase_scan_queue.sql` and deploys `ai-scan` (scan queue + Sonnet 5.5, #113) and the frontend (#114–#116). Purchases saved during the dev test with OK on the old "Discard?" prompt lost their invoice file; re-attach with Attach Doc if needed.
5. **Deploy #117 (all-day Google Calendar events, PR #121 merged 10-04):** redeploy the `server` edge function and the frontend together, dev first (both sync paths changed). On dev, re-sync a gig that was synced with times and check it becomes all-day with the times and venue at the top of the description. `./deploy_prod.sh` covers prod, together with item 3. **Question:** a gig from 9 PM to 1:30 AM now shows on both days; should a gig that ends in the early morning (say before 6 AM) show only on its start day?
6. **Organization delete by the org's own Admin** (raised by triage while fixing #90). `DELETE /organizations/:id` refuses while the org has members, and the Admin doing the delete counts as one, so an org's own Admin always gets "still has members". In practice only an unclaimed org with no data can be deleted. Should the check ignore the caller's own membership (the org still has to be free of gigs, assets and other data), or is deleting a claimed org meant to stay impossible from the app? Not urgent; a small server change either way.
7. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for the health check's Sentry round-trip. Optional; it reports "not configured" until set.

### 3b. Raised by triage, for the coordinator

*The triage routine adds entries here instead of asking Cameron directly — the question, and what it did in the
meantime. The coordinator resolves each entry (decides it, or moves it into §3a) and deletes it.*

- **Security findings from the 09-29 `security-scheme.md` check, urgent.** Details went to Cameron by private notification on 09-29, not here, because this repo is public. In short, some contact-management RPCs trust caller-supplied input for authorization and can grant org membership, plus several broader read exposures. The fix needs a migration, which is a contract, so it's for the coordinator. Meanwhile triage filed no public issue and held the `security-scheme.md` doc update, since correcting the doc would describe the holes publicly.

### 3c. Ready to build, nothing blocking

*Curated by the coordinator session only.* An item here without a **BLOCKED** marker counts as approved in shape
under AGENTS.md rule 1: the routine posts its plan on the issue and proceeds. Anything not listed here still
needs approval before code changes.

**User-guide audit, full pass (released 10-05, Cameron's request).** The user guide in `website/docs/` must be kept as current as `docs/`. Audit every page in §5's user-docs table, published pages first (they are live on docs.gigwrangler.com): check each statement against the current app code, fix what is wrong, and fill draft stubs where the feature is built. Known stale: `financials/overview.md` predates the 10-05 money-in/money-out redesign (#123, #124) and the Gig Accounting report. Deliver it as docs-only PRs, one per section (getting-started, gigs, financials…), each passing `cd website/docs && npm ci && npm run build`. Follow the user-guide rules in §5. This takes priority over the `docs/` pass until every page has a "Last verified" date.

Released to the triage routine 10-03 (the 09-30 batch, #102, #103, #32 and #20's `attachment.service.ts`, all
shipped; see §4). Each is its own PR, with a failing test first. Open the PR and don't merge it; the coordinator
reviews and merges once CI is green. None needs a migration. Of `supabase/functions/server/routes/`, only
`calendar.ts` is open (#117); `organizations.ts` and `users.ts` stay with the coordinator's next security PR.
Don't restructure the replace-all save logic in the gig services (#92, coordinator).

- **[#109](https://github.com/corourke/GigManager/issues/109) — the gig picker on the inventory reports lists every gig.**
  Give `getGigsForReportPicker` (`src/services/inventoryManagement.service.ts`) a window of 30 days back to 30
  days ahead of today, on `start`, filtered in the query. "Today" is the user's local date; that's what the
  picker is about, so no per-gig time zone. The Packing List and the Location Manifest share the list, and
  both get the window. Add a **Show all gigs** checkbox next to the picker for older or later gigs, and keep
  the gig that's already selected in the list even when it falls outside the window. Tests pin the window
  edges (day −30 and day +30 included, −31 and +31 excluded) and the checkbox. Frontend only.

- **[#111](https://github.com/corourke/GigManager/issues/111) — Google Places lookup when adding an organization from a gig.**
  Move the Places search out of `OrganizationScreen.tsx` (`handleSearchPlaces` and the place-details call)
  into a shared hook or component, use it in `OrganizationScreen` unchanged, and add it to
  `QuickCreateOrganizationDialog.tsx` for every organization type, as an optional "Search Google Places"
  field above the form. Picking a place fills name, address, phone and website; the user can still edit them
  or skip the search. Update the dialog's header comment, which says the lookup was left out on purpose. Uses
  the existing `server/integrations/google-places` endpoints. Tests: picking a place fills the fields; the
  dialog still works with no search. Frontend only.

- **[#117](https://github.com/corourke/GigManager/issues/117) — Google Calendar entries are always all-day.**
  In `supabase/functions/server/routes/calendar.ts`, send every gig as an all-day event. Dates are the gig's
  local dates in `gigs.timezone` (not the UTC date the current all-day branch uses): start date to end date
  inclusive, so Google's exclusive `end.date` is the day after. Put the times and the venue at the top of the
  event description, for example "7:00 PM – 11:30 PM PDT" and "Riverside Amphitheater, 1200 Waterfront Dr,
  Portland", then the gig notes and the GigWrangler link; keep the `location` field too. Events already synced
  with times must become all-day on their next sync: when patching, clear `dateTime` and `timeZone` alongside
  the new `date` (check against Google's API that the patch converts the event). Move the date and description
  building into a pure helper under `server/lib/pure/` and test it with Vitest: a one-day gig, a gig past
  midnight local time, a multi-day gig, a gig whose UTC date differs from its local date, and a gig with no
  venue. Edge function only: after merging, the coordinator adds "redeploy `server`" to §3a.

**Always a contract, never pre-approved:** new migrations or any RLS/policy change (AGENTS.md rule 4 — Cameron
applies migrations), edge-function API shape, anything touching production config or `deploy_prod.sh`.

---

## 4. Recently shipped (context, not open work)

| Work | Shipped in | Notes |
|---|---|---|
| #111 ([Use Google Places lookup on ad hoc org adds](https://github.com/corourke/GigManager/issues/111)): the quick-create organization dialog has an optional Google Places search that fills editable phone, website and address fields; the search moved to `src/hooks/useGooglePlacesSearch.ts` (shared with `OrganizationScreen`); `createOrganization` sends the real columns `phone_number`/`url` | PR #122 (10-04) | Merged 15:24 UTC; #111 closed. Frontend only, ships with the next frontend deploy |
| #117 ([Google Cal Entries make All-Day only](https://github.com/corourke/GigManager/issues/117)): every synced gig is an all-day event in its local dates, times and venue at the top of the description; pure `buildCalendarEvent` (`server/lib/pure/calendarEvent.ts`) shared by the server's `sync-gig-all-users` and the browser's per-user sync | PR #121 (10-04) | Merged 15:23 UTC; #117 closed. Needs a `server` redeploy **and** a frontend deploy together; then check on dev that a previously timed event turns all-day on its next sync (updates are `PUT`) |
| #109 ([The Gig Selector on Packing List showing too many Gigs](https://github.com/corourke/GigManager/issues/109)): both report gig pickers list gigs from 30 days back to 30 days ahead (`reportPickerWindow`, filtered in the query), with a shared **Show all gigs** checkbox; a selected gig stays listed | PR #120 (10-04) | Merged 15:22 UTC; #109 closed. Frontend only, ships with the next frontend deploy |
| Org-ownership / access control | PR #48, PR #49 | Merged |
| Change history (gig audit trail) | PR #57, PR #58 | Merged |
| WebAuthn Sentry safety net + packing list | PR #60 (09-14) | Merged; closed #50 |
| Google Places friendly error | PR #62 (09-14) | Merged; closed #29 |
| `gig_financials` RLS leak fix | PR #63 (09-14) | Merged; #61 stays open for the 4 remaining leaks |
| #52 phase 1 — generic `notifications` table | PR #64 (09-16) | Merged |
| #20 — shared data-access base module + `user.service.ts` pilot | PR #66 (09-22) | Merged; ~15 services remain, one at a time |
| #52 phase 2 — Supabase/Google Places/Sentry health checks + daily cron | PR #65 (09-23) | Merged; Sentry check reports "not configured" until secrets land |
| #61 — staffing, kit assignments, inventory scans and their History made org-private; shared-tenant decision recorded; RLS test suite + CI job | PR #76 (09-25) | Merged; migration applied to dev and prod 09-26. #61 closed |
| #52 fix — health check moved to its own `health-check` function (`verify_jwt = false`) | PR #73 (09-25) | Merged; setup done on dev + prod 09-25, verified by curl. #52 closed |
| Docs refresh: `testing.md` (PR #67), `setup-guide.md` + one line of `deployment.md` (PR #68) | PR #67, PR #68 (09-23) | Merged; docs only, from triage docs passes |
| #71 — non-expense financial records save `category: null`; Add dialog stays open until saved; failed autosave no longer retries in a loop (`useAutoSave.saveNow`) | PR #77 (09-26) | Merged; #71 closed. Frontend only, ships with the next frontend deploy |
| #81 — web packing list groups rows under the kit they're packed in; every assigned kit, a lone container included, gets its own heading | PR #82 (09-27) | Merged, but a lone container then showed twice (heading + row); Cameron reopened #81 on 09-28 |
| #12 ([Reorganize Gig Edit into tabbed sections](https://github.com/corourke/GigManager/issues/12)) — closed 10-01 at Cameron's request | PRs #79, #80, #89, #100, #101 (09-26 to 09-30) | All five PRs merged; rows for PRs 3–5 below |
| #12 PR 3 — one edit mode for the whole gig page: header fields, one save state, Done waits for saves; When & schedule with a dated table in the gig's time zone; the gig widens to cover its schedule | PR #89 (09-29) | Merged. Frontend only; no migration |
| #84 — attachments open the file instead of a blank tab (`window.open` without `noopener`, opener cut by hand); first `AttachmentManager` tests | PR #87 (09-28) | Merged; #84 closed. Deployed to dev + prod 09-29 |
| #81 rework — packing list is an indented list: kits A to Z marked Items/Container, an Items kit's contents indented under it, a lone container one line (approved mockup, board 7) | PR #86 (09-28) | Merged; Cameron confirmed it on the live gig 09-29, #81 closed. Frontend only |
| #74 — gig lists keep a gig in Upcoming until its last calendar day is over in the gig's timezone (`isGigPast` in `src/utils/gigTimeframe.ts`, web and mobile) | PR #85 (09-28) | Merged; #74 closed. Frontend only, ships with the next frontend deploy |
| #69 — participants autosave keeps the database id after the first insert, so later autosaves update the row instead of deleting and re-inserting it (no more repeated added/removed History entries or unlinked schedule acts) | PR #83 (09-28) | Merged; #69 closed. Frontend only, ships with the next frontend deploy. Cameron to check a new participant's History after deploy |
| #90 ([Deleting an organization always fails](https://github.com/corourke/GigManager/issues/90)): dropped the `gig_bids` delete-guard entry; a new test checks the guard against the tables the migrations create | PR #96 (09-30) | Merged; #90 closed. Needs a `server` redeploy |
| #91 ([Dashboard asset and insured values always $0](https://github.com/corourke/GigManager/issues/91)): totals read `item_cost` through `lib/pure/dashboard.ts`, and query errors are returned | PR #97 (09-30) | Merged; #91 closed. The same `server` redeploy covers it |
| #93 ([Some financial record dates use UTC](https://github.com/corourke/GigManager/issues/93)): import payment, completed labor and the purchase fallback are dated in the gig's time zone (`toDateInTimeZone`) | PR #98 (09-30) | Merged; #93 closed. Frontend only |
| #94 ([A failed profile load looks like "no organizations"](https://github.com/corourke/GigManager/issues/94)): `getCompleteUserData` throws; `RequireAuth` shows "We couldn't load your account" with a retry | PR #99 (09-30) | Merged; #94 closed. Frontend only |
| #12 PR 4 — printing: the gig page's Print button makes a gig sheet (venue, schedule, participants, crew contacts, notes, attachment names), and Admins and Managers can add a financials page; the packing list prints with a header (org, gig, date, counts) | PR #100 (09-30) | Merged. Frontend only |
| Follow-up to #107: a new participant was inserted and logged "added" several times because autosaves overlapped; `useAutoSave` now runs one save at a time (all autosaving sections) | PR #108 (09-30) | Merged. Frontend only; Cameron to re-check adding a participant after the next deploy and remove any duplicate rows from earlier testing |
| #12 PR 5 — style guide: record-page, one-edit-mode, Columns picker and print patterns; primary buttons `sky-700`; stale tokens, header height and Tailwind setup corrected | PR #101 (09-30) | Merged. Docs only |
| Purchases scan queue: choose or drop many invoices; they scan in the background two at a time and are reviewed one by one (Save Purchase shows the next); unreviewed invoices persist in `purchase_scan_queue`; `ai-scan` queue mode; scan limit 60/hour | PR #116 (10-03) | Merged after a dev test. Needs the migration and an `ai-scan` deploy on prod |
| Purchases (approved 10-01): report opens on the last 30 days with date presets, Clear all filters, filtered and all-time totals (PR 1); Report / Add manually / Scan invoices tabs, report no longer reloaded on every save (PR 2). Invoice scanning moved to Claude Sonnet 5.5 at `low` effort | PRs #113, #114, #115 (10-02) | Merged. #113 needs an `ai-scan` deploy; #114/#115 frontend only |
| Docs: `server-endpoint-inventory.md` re-pointed at `routes/` and checked row by row (includes #95's route changes); one line each of `docs/README.md` and `tech-stack.md` | PR #88 (09-30) | Merged by the coordinator; docs only |
| #102 ([Duplicate Gig fails when the gig has crew slots](https://github.com/corourke/GigManager/issues/102)): `duplicateGig` sends each slot's role name as `role`, as `create_gig_complex` reads it; copied slots start unstaffed | PR #104 (09-30) | Merged; #102 closed. Frontend only |
| #32 ([Sign Up: no confirm-password field](https://github.com/corourke/GigManager/issues/32)): Confirm password field that must match, plus a Weak/Fair/Strong hint (`getPasswordStrength`) that advises only; minimum stays 6 | PR #105 (09-30) | Merged; #32 closed. Frontend only |
| #20 slice: `attachment.service.ts` table reads/writes on `base/dataAccess.ts`; storage calls and `deleteAttachment`'s queries unchanged | PR #106 (09-30) | Merged; #20 stays open, 14 services remain. Frontend only |
| #103 ([History logged with no organization](https://github.com/corourke/GigManager/issues/103)): participant and schedule History logged against the acting org (passed in `activityCtx`, else the user's Admin/Manager membership on the gig); no more `primary_organization_id` select; lookup errors surface | PR #107 (09-30) | Merged; #103 closed. Frontend only |
| Tightened authorization on membership, contact, invitation and purchase functions; unused `POST /gigs` and `PUT /gigs/:id` removed | PR #95 (09-29) | Merged. Needs migration `20260929000000` and a `server` redeploy on dev and prod (§3a item 1) |
| Docs: user guide `getting-started/` (4 published pages) checked against the app: profile-completion step, email confirmation, Viewer/Staff domain-join buttons, Staff sees the Dashboard, exact labels | PR #139 (10-06) | Merged 16:43 UTC; docs only, from the §3c user-guide audit |
| Docs: `SmartDataTable.md` matches the component (Tab visits every column, no arrow keys, edits wait for the save, widths persist; missing props and column options added) | PR #126 (10-05) | Merged 17:21 UTC; docs only, from a triage docs pass |
| Docs: `deployment.md` lists CI's `rls` job; rebuild steps point to the health-check setup | PR #110 (10-01) | Merged; docs only, from a triage docs pass |
| Docs refresh: `docs/README.md` index (PR #70), `database.md` reconciled with migrations (PR #72) | PR #70, PR #72 (09-25) | Merged; docs only, from triage docs passes |

---

## 5. For the daily triage routine

Read this section first on each run.

**File ownership — what is claimed.** Check live before starting: `git fetch origin && git branch -r
--sort=-committerdate | head -20` plus the open PR list. An open PR claims the files it touches.

| Claimed by | Files | Notes |
|---|---|---|
| #20 remaining services | `src/services/*.service.ts` (all but `user.service.ts` and `attachment.service.ts`) | Parked; `attachment.service.ts` released 09-30 (§3c) |
| #39 (Cameron's session), PR #144 | `AppHeader`, `NavigationMenu`, `layout/PageHeader`/`PageTabs`, `EquipmentHeader`, `Dashboard`, `GigListScreen`, `TeamScreen`, `FinancialsScreen`, `SettingsScreen`, `AssetListScreen`/`KitListScreen` headers, `InventoryTabScreen`, `STYLE_GUIDE.md`; next PRs take the drill-down screens, inventory/, financials/purchases/ and `docs/design/` | PR 1 merged 10-07; PR 2 next |
| Coordinator, #92 | not yet claimed | Not in §3c; triage leaves it alone |
| Stray branch `claude/triage-90-org-delete-references` | none | Duplicate of PR #96's commit, already merged. The proxy refused the delete; it's safe to delete |

**Dependencies.** #39 follows #12's gig-page redesign, now done (#12 closed 10-01), so the header stays consistent with it. #52's health check is live on dev and prod (09-25); its Sentry check additionally needs the Sentry secrets (§3a item 7). The tenant model is decided (hosted, shared DB, 09-25).

**Where things stand.** 09-28: PRs #83 (#69) and #85 (#74) merged ~14:31 UTC; both issues closed.
Urgent bug #84 approved by Cameron and fixed by the coordinator in PR #87 (merged 09-28). #81 reworked in PR #86; Cameron confirmed it 09-29 and it is closed. Nothing in §3c is left unbuilt. #71 and #81 merged earlier (see §4). 09-29: #12 PR 3 merged (#89) and code-review bugs #90–#94 filed by the coordinator; security PR #95 merged (deploy waits on Cameron, §3a). 09-30: the coordinator released #90, #91, #93 and #94 in §3c; triage built all four as PRs #96–#99, merged 04:19 UTC, and merged `main` into docs PR #88 to clear its conflict. #90 and #91 need a `server` redeploy. The coordinator merged docs PR #88 and moved triage's org-delete question to §3a. §3c is empty. Later on 09-30 the coordinator filed #102 and #103 and released them, #32 and `attachment.service.ts` (#20) in §3c. The 09:00 triage run built all four: PRs #104 (#102), #105 (#32), #106 (#20) and #107 (#103), each with a plan comment on its issue, a test written first and a mutation check. Nothing in §3c is left unbuilt. 10-01: Cameron filed #109 (packing-list picker); triage found the cause and raised it in §3b, and ran the docs pass on `deployment.md` (PR #110, merged 15:03 UTC). Cameron closed #12 the same day. 10-02: Cameron filed #111 and #117 (both raised in §3b, nothing built); the docs pass covered `tech-stack.md` (PR #118). 10-03: quiet, with no new issues or replies; the docs pass covered `coding-guide.md` (PR #119). Later that day the coordinator released #109, #111 and #117. 10-04: triage built all three, each with a plan comment on its issue, tests written first and mutation checks: PRs #120 (#109), #121 (#117) and #122 (#111). Nothing in §3c is left unbuilt. No docs pass this run. 10-05: quiet for triage. #125 is new (coordinator, waiting on Cameron) and #124 is green, so there was nothing to build. The docs pass covered `SmartDataTable.md` (PR #126). 10-06: no new issues; #138 green. The §3c user-guide audit began with the getting-started section (PR #139, merged 16:43 UTC).

On 09-23 every item was blocked or parked, so the run moved on to docs. Docs-only PR
[#67](https://github.com/corourke/GigManager/pull/67) refreshed `docs/development/testing.md`: suite size,
the actual Supabase mock pattern, the finished March coverage plan replaced with the gaps that remain, and a CI
section that matches `ci.yml`. A second run the same day opened docs-only PR
[#68](https://github.com/corourke/GigManager/pull/68), which corrected `setup-guide.md`. Both merged 09-23 18:20 UTC. The fixes: Node 20.19+
instead of 18, a supported Supabase CLI install, the full migration set instead of pasting only
`initial_schema.sql`, deploying both edge functions, a seed check that works, and removing the `ai-scan`
`x-diagnostic` test that was dropped in June (also fixed in `deployment.md`).

**Docs covered by triage runs:** `docs/development/testing.md` (09-23), `docs/technical/setup-guide.md`
(09-23; build and dev server tried; `supabase start` not tried because the sandbox has no Docker daemon),
`docs/README.md` (09-24, PR #70: all links resolve; indexed `gig-financials.md`, `purchases-field-mapping.md` and
`server-endpoint-inventory.md`, the last marked historical). `database.md`'s "single initialization file" line turned
out to be a dated 02-09 changelog entry, not stale. `docs/technical/database.md` body (09-25, PR #72: reconciled with every
migration through `20260919000000` — dropped status-history tables, `kit_components` rename, six new tables, new columns).
`docs/technical/server-endpoint-inventory.md` (09-29, PR #88, merged 09-30: re-pointed at `routes/`, every row checked against the
middleware; `DELETE /gigs/:id` is Admin-only; access-request and notification routes added). `docs/technical/security-scheme.md` (09-29: checked against every policy, the RLS tests and the three edge functions; the update is **held** until the §3b security entry is resolved, then document helpers, gig UPDATE/DELETE and participant write rules, the full CORS list, `requireOrgRole` options and the `health-check` gate). `docs/technical/deployment.md` (10-01, PR #110, merged 10-01: checked against both deploy scripts, `ci.yml`, `vite.config.ts`, `config.toml` and every env read; added the `rls` CI job and the health-check step to the rebuild. Scripts only `bash -n`-checked. `deploy_prod.sh` has no `--help` and starts its gates on any run, so don't run it). `docs/technical/tech-stack.md` (10-02, PR #118, merged 10-03: checked against `package.json`, `supabase/functions/`, migrations and `ci.yml`; added `health-check` and `notifications.ts`, corrected storage to the one `attachments` bucket). `docs/development/coding-guide.md` (10-03, PR #119, merged 10-03: schema section aligned with AGENTS.md rule 4 (it said to hand DDL to the SQL Editor), the `dataAccess.ts` base added, `build` added to the gates, lint debt recounted, the done `App.tsx` split retired). `docs/technical/SmartDataTable.md` (10-05, PR #126, merged 10-05: checked against `SmartDataTable.tsx`, `EditableCell.tsx` and `useTableState.ts`. Tab visits every column, there are no arrow keys, edits aren't optimistic, and widths persist. The missing props and column options were added.) Next candidate: `docs/technical/conflict-detection.md` (PR #124, which changed `conflictDetection.service.ts`, has merged).

**User guide (`website/docs/`), rules for triage.** These extend the routine's prompt and win where it says only `docs/`.
- Any PR that changes something a user can see or do also updates the matching page under `website/docs/src/content/docs/`, in the same PR.
- Check every statement against the current app code, not older docs. Use the exact on-screen labels, and call the product "GigWrangler". Outline and priorities: `docs/development/user-documentation-plan.md`; editing rules: `website/docs/README.md`.
- PRs touching `website/docs/` must pass `cd website/docs && npm ci && npm run build`.
- **Publishing is not triage's call.** Fill in and correct drafts but keep `draft: true`; when one is complete and verified, set its row below to "ready to publish". The coordinator publishes with Cameron. On an already-published page, fix errors directly; if one can't be fixed in a single PR, add a `:::caution` note saying what is out of date and record it below.
- On a quiet run, alternate the docs pass: one run on the user guide (next row below that isn't verified, published first), the next on `docs/`.

**User-docs table** (one row per page; triage keeps it current):

| Page (`website/docs/src/content/docs/`) | Status | Last verified | Still wrong |
|---|---|---|---|
| `calendar/google-calendar.md` | published | — | not audited |
| `equipment/overview.md` | published | — | not audited |
| `financials/overview.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/receipts-and-invoices.md` | published (new) | 2026-10-06 (coordinator, PR #136) | — |
| `financials/gig-accounting.md` | published (new) | 2026-10-06 (coordinator, PR #136) | — |
| `financials/tax-treatment.md` | published (PR #137, merged) | 2026-10-06 (coordinator) | — |
| `getting-started/onboarding.md` | published | 2026-10-06 (triage, PR #139) | — |
| `getting-started/organizations.md` | published | 2026-10-06 (triage, PR #139) | — |
| `getting-started/the-dashboard.md` | published | 2026-10-06 (triage, PR #139) | — |
| `getting-started/what-is-gigwrangler.md` | published | 2026-10-06 (triage, PR #139) | — |
| `gigs/change-history.md` | published | — | not audited |
| `gigs/creating-a-gig.md` | published | — | not audited |
| `gigs/overview.md` | published | — | not audited |
| `import/overview.md` | published | — | not audited |
| `index.mdx` | published | — | not audited |
| `organizations/overview.md` | published | — | not audited |
| `reference/roles-and-access.md` | published | — | not audited |
| `calendar/conflict-detection.md` | draft | — | not audited |
| `calendar/overview.md` | draft | — | not audited |
| `equipment/assets.md` | draft | — | not audited |
| `equipment/assigning-to-a-gig.md` | draft | — | not audited |
| `equipment/barcode-scanning.md` | draft | — | not audited |
| `equipment/inventory-reports.md` | draft | — | not audited |
| `equipment/kits.md` | draft | — | not audited |
| `equipment/location-explorer.md` | draft | — | not audited |
| `financials/cost-allocation.md` | published (was draft) | 2026-10-06 (coordinator, PR #136) | — |
| `financials/gig-expenses.md` | published (was draft) | 2026-10-06 (coordinator, PR #136) | — |
| `financials/purchases.md` | published (was draft) | 2026-10-06 (coordinator, PR #136) | — |
| `gigs/documents-and-notes.md` | draft | — | not audited |
| `gigs/participating-organizations.md` | draft | — | not audited |
| `gigs/schedule.md` | draft | — | not audited |
| `gigs/staffing-and-participants.md` | draft | — | not audited |
| `gigs/the-gig-list.md` | draft | — | not audited |
| `import/ai-receipt-scanning.md` | draft | — | not audited |
| `import/csv-asset-import.md` | draft | — | not audited |
| `mobile/biometric-unlock.md` | draft | — | not audited |
| `mobile/field-inventory.md` | draft | — | not audited |
| `mobile/offline-access.md` | draft | — | not audited |
| `mobile/overview.md` | draft | — | not audited |
| `organizations/invitations.md` | draft | — | not audited |
| `organizations/member-profiles.md` | draft | — | not audited |
| `organizations/people-without-logins.md` | draft | — | not audited |
| `organizations/team-and-roles.md` | draft | — | not audited |
| `reference/access-requests-and-moderation.md` | draft | — | not audited |
| `reference/glossary.md` | draft | — | not audited |

**Future considerations (not open work).** Left over from #61 (closed 09-25): gig attachments are invisible
to the other orgs on a gig (needs a sharing flag plus a storage-policy change), and prod has an extra
`fin_category` value `'Production'` that no migration creates. Found while fixing #61 (the first two filed 09-30 as #102 and #103): Staff/Viewers can read
their own org's staff `rate`/`fee`. Tenant model decided 09-25: hosted, shared DB. New private tables need a test
in `supabase/tests/rls/` (CI job `rls`). Found while building #111: `createOrganization`'s parameter type still lists `email` and `place_id`, which aren't `organizations` columns, so sending either would fail the insert. No caller sends them. Found in the 10-06 user-guide audit: after a first Google sign-in the profile-completion screen requires **Set Password** (written for invitations) and doesn't prefill the Google name, because only `first_name`/`last_name` metadata is read.

 Supabase CLI 2.117 warns that `[inbucket]` in
`supabase/config.toml` is deprecated in favour of `[local_smtp]`. This is local-only config, so nothing is
broken yet.

**Financial transaction types (coordinator, 10-04; loop back when read-only DB access exists).** Cameron wants the 25 `fin_type` values radically simplified *before* the Gig Accounting report is reworked; the change also drives how the gig's Financials tab displays. Direction proposed 10-04: five types (Fee agreed, Client payment, Refund to client, Expense, Sub-contract), with paid/due carried by `paid_at` / `due_date`, and three report sections (Needs Attention, Upcoming, Settled), each gig in exactly one. Cameron says many rows lack faithful `paid_at` / `due_date`, so the mapping must come from the raw rows, not counts. Prod is readable with `SUPABASE_ACCESS_TOKEN` (set 10-04; it can write, so read-only unless Cameron approves a change):
`curl -sS -X POST "https://api.supabase.com/v1/projects/hqnnhtxcxedisasvtbqv/database/query/read-only" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"query":"select ... from gig_financials ..."}'`
Never call `/database/query` (the read-write endpoint), `supabase db push`, `functions deploy` or any other write without Cameron's go-ahead for that specific change. Findings 10-04: only 5 types in use (Payment Received 70, Expense Incurred 45, Informal Terms 24, Invoice Issued 4, Bid Accepted 1). Then: read every `gig_financials` row with its gig (title, status, start, end), propose the old-to-new mapping per row pattern to Cameron, then the migration and UI. Triage doesn't touch this.

**Order of checks each run.**

1. Check CI and mergeability on open PRs (list live; #138 and #139 merged 10-06). Fix a red or conflicted triage PR by merging `main` into it, never by rebasing.
2. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
3. §3c — build what is released there that has no PR yet. The user-guide audit is in progress: getting-started done (PR #139, merged 10-06); next section is gigs (published pages first), then the rest of the published pages, then drafts. `financials/` was verified by the coordinator 10-06.
4. Check §3b for unresolved entries the coordinator hasn't cleared yet.

**Don't manufacture activity.** #39 already has exactly one open question on record.
If a run finds everything still quiet, that is a legitimate no-op: do **not** re-post the same "still waiting"
comments — daily repetition is noise. Speak up only when something actually changes (a new reply, CI going
red, a new review comment, a new issue).

**Project rules that bite here.** From [AGENTS.md](./AGENTS.md): never go from requirements → spec → plan →
implementation without approval first (rule 1); write a failing test before fixing a bug (rule 3); never edit
a committed migration, and ask Cameron to apply new ones to the remote Supabase database, then wait for
confirmation (rule 4); enumerate any manual deploy/verification steps after implementing (rule 7); keep
project documents — including this file — updated as work completes (rule 8).

**Maintaining this file.** This file is maintained on `main` — the triage routine reads and writes it there,
so board-only updates should land on `main` promptly rather than sitting on a feature branch, where a run that
starts from `main` will not see them. Update it in place; on a quiet day, commit only if something actually
changed. Keep §1 and §3 accurate first — they are what gets read at a glance. Move finished work into §4
rather than deleting it, so the history of what shipped stays available without digging through closed PRs.
