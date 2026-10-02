# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage routine ("GitWrangler issue triage", 09:00 UTC) and the
GigWrangler Coordinator session. Edit this file in place; it is not an append-only log.**

**Who writes what.** The triage routine keeps §1, §2, §4 and §5 current and may add entries to
[§3b](#3b-raised-by-triage-for-the-coordinator). Only the coordinator session writes
[§3a](#3a-waiting-on-cameron) and [§3c](#3c-ready-to-build-nothing-blocking), and only the coordinator asks
Cameron questions.

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-10-02 (coordinator: Purchases PRs 1–2 merged (#114, #115); PR 3, the scan queue, open as #116 and waiting on its migration)
- **State verified:** 2026-10-02 09:10 UTC by triage (6 open issues: #20, #39, #92, #109, #111, #117; open PRs: #116 (coordinator, CI green, mergeable at `b744cda`) and docs PR #118 (triage))

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#39](https://github.com/corourke/GigManager/issues/39) | Too many menu levels | UI/UX design | Direction set 09-26: keep the top nav (no sidebar) | Cameron (§3a item 2); #12's redesign is done |
| [#92](https://github.com/corourke/GigManager/issues/92) | Replace-all autosave can delete rows another user or tab added | Bug | From the 09-29 code review, confirmed by reading the code | Coordinator — not started |
| [#109](https://github.com/corourke/GigManager/issues/109) | The Gig Selector on Packing List showing too many Gigs | Bug | Filed by Cameron 09-30; cause found (no date window in the picker query) | Coordinator — not in §3c (§3b) |
| [#111](https://github.com/corourke/GigManager/issues/111) | Use Google Places lookup on ad hoc org adds | Feature | Filed by Cameron 10-01; Places search exists only in `OrganizationScreen` create mode | Coordinator — not in §3c (§3b) |
| [#117](https://github.com/corourke/GigManager/issues/117) | Google Cal Entries make All-Day only | Feature | Filed by Cameron 10-02; event times are built in `server/routes/calendar.ts` (edge function) | Coordinator — not in §3c (§3b) |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Refactor | Pilot merged (PR #66); `attachment.service.ts` merged 09-30 (PR [#106](https://github.com/corourke/GigManager/pull/106)); 14 services remain | Nothing — next service when released |

---

## 2. Open items in detail

### Bugs

#102 and #103 were fixed by PRs #104 and #107, merged 09-30 (see §4). #107 put the shared lookup in `resolveGigActivityCtx` (`gigService.shared.ts`); `GigScheduleEditor` and `updateGig` still rely on the membership fallback.

**[#109](https://github.com/corourke/GigManager/issues/109) — The Gig Selector on Packing List showing too many Gigs.**
Cameron wants the picker to show gigs from 30 days back to 30 days ahead. `getGigsForReportPicker` (`src/services/inventoryManagement.service.ts`) returns every gig the org takes part in, newest first, with no date filter. The same list feeds the Location Manifest's "Gig (optional)" filter (`InventoryReports.tsx`). Not released in §3c yet; see §3b.

### Features

**[#111](https://github.com/corourke/GigManager/issues/111) — Use Google Places lookup on ad hoc org adds.**
Cameron wants the onboarding Places lookup when adding a venue to a gig. The lookup lives in `OrganizationScreen.tsx` (`handleSearchPlaces`, create mode only, calling `server/integrations/google-places/search` and `/:place_id`). Adding an org from a gig goes through `OrganizationSelector` → `QuickCreateOrganizationDialog.tsx`, whose header comment says Places lookup is deliberately left to the full edit screen. The endpoints exist, so it's frontend only. Not in §3c; see §3b.

**[#117](https://github.com/corourke/GigManager/issues/117) — Google Cal Entries make All-Day only.**
Cameron wants every synced gig to be an all-day event, with the times and location in the notes. The event body is built in `supabase/functions/server/routes/calendar.ts` (~line 157): today only a noon-UTC start is treated as all-day, and other gigs get `dateTime` start/end in the gig's time zone; the all-day date comes from the UTC date. An edge-function change in `server/routes/`, which §3c keeps for the coordinator. Not in §3c; see §3b.

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
Two mockups of Option A posted 09-19. Blocked on a direction pick (either variant, or a hybrid). Same
work-plan-then-approval pattern as #12.

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

1. **Deploy migration `20260929000000_tighten_membership_and_rpc_authorization.sql`** ([#95](https://github.com/corourke/GigManager/pull/95), merged 09-29): `./deploy_dev.sh`, then `./deploy_prod.sh`. That applies the migration and redeploys the `server` edge function, which also ships #90's and #91's fixes (PRs #96, #97). If you deployed before 04:19 UTC on 09-30, run it once more for those two. Then, as an Admin: add and remove a contact on your own org, add a contact to a venue you created, and invite a Staff member. Urgent.
2. **[#39](https://github.com/corourke/GigManager/issues/39)**: "keep top nav" (09-26) rules out the sidebar (Option B). It follows #12's redesign, since the gig screen is the deepest page and the two need one consistent header.
3. **Purchases scan queue: apply migration `20261002000000_purchase_scan_queue.sql` and deploy `ai-scan`** ([#116](https://github.com/corourke/GigManager/pull/116), open; the coordinator merges it once dev has the migration). On dev: `supabase db push`, `supabase functions deploy ai-scan`, then with `npm run dev` scan three or four invoices at once, review them in turn, reload part-way through (unreviewed ones stay), discard one. The same `ai-scan` deploy ships Sonnet 5.5 (#113). Then prod via `./deploy_prod.sh`. Reports and tabs (#114, #115) are frontend only.
4. **Organization delete by the org's own Admin** (raised by triage while fixing #90). `DELETE /organizations/:id` refuses while the org has members, and the Admin doing the delete counts as one, so an org's own Admin always gets "still has members". In practice only an unclaimed org with no data can be deleted. Should the check ignore the caller's own membership (the org still has to be free of gigs, assets and other data), or is deleting a claimed org meant to stay impossible from the app? Not urgent; a small server change either way.
5. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for the health check's Sentry round-trip. Optional; it reports "not configured" until set.

### 3b. Raised by triage, for the coordinator

*The triage routine adds entries here instead of asking Cameron directly — the question, and what it did in the
meantime. The coordinator resolves each entry (decides it, or moves it into §3a) and deletes it.*

- **Security findings from the 09-29 `security-scheme.md` check, urgent.** Details went to Cameron by private notification on 09-29, not here, because this repo is public. In short, some contact-management RPCs trust caller-supplied input for authorization and can grant org membership, plus several broader read exposures. The fix needs a migration, which is a contract, so it's for the coordinator. Meanwhile triage filed no public issue and held the `security-scheme.md` doc update, since correcting the doc would describe the holes publicly.
- **[#117](https://github.com/corourke/GigManager/issues/117) (all-day calendar events) is an edge-function change.** It edits `server/routes/calendar.ts`, which §3c reserves for the coordinator, and needs a `server` redeploy. Points to settle: the date for the all-day event should be the gig's local date in `gigs.timezone` (the current all-day branch uses the UTC date); a multi-day gig spans start to end date inclusive; already-synced events change type on their next sync (Google accepts a `date` patch over `dateTime`, but worth checking). Triage built nothing.
- **[#111](https://github.com/corourke/GigManager/issues/111) (Places lookup when adding a venue from a gig) ready to release?** Frontend only: lift the search from `OrganizationScreen` into a shared component or hook and use it in `QuickCreateOrganizationDialog`, which fills name, address, phone and website from the picked place. Open point: the dialog's header says it is deliberately minimal, so offer the lookup only for type Venue, or for every type? Triage built nothing; the files are unclaimed.
- **[#109](https://github.com/corourke/GigManager/issues/109) ready to release?** Cause: `getGigsForReportPicker` has no date filter. A likely fix: a ±30-day window on `start`, done in the query, plus a test that pins the window. Two points to settle before releasing it in §3c: (1) should the Location Manifest's gig filter, which uses the same function, get the window too, or keep every gig? (2) should the window run from today in local time or in each gig's time zone, as `isGigPast` does? Triage built nothing, because it isn't in §3c. The file is unclaimed.

### 3c. Ready to build, nothing blocking

*Curated by the coordinator session only.* An item here without a **BLOCKED** marker counts as approved in shape
under AGENTS.md rule 1: the routine posts its plan on the issue and proceeds. Anything not listed here still
needs approval before code changes.

Released to the triage routine 09-30, at Cameron's request for more triage work. Each is its own PR, with a
failing test first. Open the PR and don't merge it; the coordinator reviews and merges once CI is green. None
needs a migration or an edge-function change. Stay out of `supabase/functions/server/routes/` (the coordinator's
next security PR edits it) and don't restructure the replace-all save logic in the gig services (#92, coordinator).

- **[#102](https://github.com/corourke/GigManager/issues/102) — Duplicate Gig fails when the gig has crew slots.**
  In `duplicateGig` (`src/services/gig.service.ts`), send each slot's role name as `role` (plus
  `organization_id`, `required_count`, `notes`), as `create_gig_complex` reads it, and stop sending
  `assignments` (the RPC ignores them; a copy on a new date starts unstaffed). Test that pins the slot shape
  to the keys the RPC reads. Frontend only.

- **[#103](https://github.com/corourke/GigManager/issues/103) — participant and schedule History logged with no organization.**
  In `gigParticipant.service.ts` and `gigSchedule.service.ts`, stop selecting the nonexistent
  `gigs.primary_organization_id`. Log against the acting org: pass it in `activityCtx` from the callers that
  know it, and fall back to the user's Admin/Manager membership among the gig's participants (as
  `gigStaff.service.ts` does). Don't ignore the query error. Tests assert the logged `organization_id` and
  `gig_title`. Touch only the activity-log lookup in those files. Frontend only.

- **[#32](https://github.com/corourke/GigManager/issues/32) — Sign Up: confirm password and strength feedback.**
  On the Sign Up form, add a Confirm password field that must match (inline error, blocks submit), and a
  simple strength hint under the password (weak / fair / strong from length and character variety, no new
  dependency). Keep the minimum at 6, which is what Supabase Auth enforces; the hint advises, it doesn't block.
  Follow `docs/design/STYLE_GUIDE.md` (inline error style). Tests for mismatch and the hint. Frontend only.

- **[#20](https://github.com/corourke/GigManager/issues/20) — next service: `attachment.service.ts`.**
  Move its table reads and writes onto `src/services/base/dataAccess.ts`, as `user.service.ts` did (PR #66).
  Storage calls stay as they are. No change to exported function names or return shapes; existing callers
  and tests must pass unchanged, and add tests for the moved functions. Only this one service; the rest
  stay parked.

**Always a contract, never pre-approved:** new migrations or any RLS/policy change (AGENTS.md rule 4 — Cameron
applies migrations), edge-function API shape, anything touching production config or `deploy_prod.sh`.

---

## 4. Recently shipped (context, not open work)

| Work | Shipped in | Notes |
|---|---|---|
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
| Purchases (approved 10-01): report opens on the last 30 days with date presets, Clear all filters, filtered and all-time totals (PR 1); Report / Add manually / Scan invoices tabs, report no longer reloaded on every save (PR 2). Invoice scanning moved to Claude Sonnet 5.5 at `low` effort | PRs #113, #114, #115 (10-02) | Merged. #113 needs an `ai-scan` deploy; #114/#115 frontend only |
| Docs: `server-endpoint-inventory.md` re-pointed at `routes/` and checked row by row (includes #95's route changes); one line each of `docs/README.md` and `tech-stack.md` | PR #88 (09-30) | Merged by the coordinator; docs only |
| #102 ([Duplicate Gig fails when the gig has crew slots](https://github.com/corourke/GigManager/issues/102)): `duplicateGig` sends each slot's role name as `role`, as `create_gig_complex` reads it; copied slots start unstaffed | PR #104 (09-30) | Merged; #102 closed. Frontend only |
| #32 ([Sign Up: no confirm-password field](https://github.com/corourke/GigManager/issues/32)): Confirm password field that must match, plus a Weak/Fair/Strong hint (`getPasswordStrength`) that advises only; minimum stays 6 | PR #105 (09-30) | Merged; #32 closed. Frontend only |
| #20 slice: `attachment.service.ts` table reads/writes on `base/dataAccess.ts`; storage calls and `deleteAttachment`'s queries unchanged | PR #106 (09-30) | Merged; #20 stays open, 14 services remain. Frontend only |
| #103 ([History logged with no organization](https://github.com/corourke/GigManager/issues/103)): participant and schedule History logged against the acting org (passed in `activityCtx`, else the user's Admin/Manager membership on the gig); no more `primary_organization_id` select; lookup errors surface | PR #107 (09-30) | Merged; #103 closed. Frontend only |
| Tightened authorization on membership, contact, invitation and purchase functions; unused `POST /gigs` and `PUT /gigs/:id` removed | PR #95 (09-29) | Merged. Needs migration `20260929000000` and a `server` redeploy on dev and prod (§3a item 1) |
| Docs: `deployment.md` lists CI's `rls` job; rebuild steps point to the health-check setup | PR #110 (10-01) | Merged; docs only, from a triage docs pass |
| Docs refresh: `docs/README.md` index (PR #70), `database.md` reconciled with migrations (PR #72) | PR #70, PR #72 (09-25) | Merged; docs only, from triage docs passes |

---

## 5. For the daily triage routine

Read this section first on each run.

**File ownership — what is claimed.** Check live before starting: `git fetch origin && git branch -r
--sort=-committerdate | head -20` plus the open PR list. An open PR claims the files it touches.

| Claimed by | Files | Notes |
|---|---|---|
| Coordinator, Purchases scan queue (approved 10-01; PR 3 [#116](https://github.com/corourke/GigManager/pull/116), `claude/epic-ramanujan-i9khnc`; PRs 1–2 #114/#115 merged) | `src/components/financials/purchases/`, `FinancialsScreen.tsx`, `ReviewScannedDataDialog.tsx`, `supabase/functions/ai-scan/`, a new `purchase_scan_queue` migration | 3 PRs: report, sub-tabs, scan queue. Triage leaves these files alone |
| #20 remaining services | `src/services/*.service.ts` (all but `user.service.ts` and `attachment.service.ts`) | Parked; `attachment.service.ts` released 09-30 (§3c) |
| Coordinator, #92 | not yet claimed | Not in §3c; triage leaves it alone |
| Stray branch `claude/triage-90-org-delete-references` | none | Duplicate of PR #96's commit, already merged. The proxy refused the delete; it's safe to delete |

**Dependencies.** #39 follows #12's gig-page redesign, now done (#12 closed 10-01), so the header stays consistent with it. #52's health check is live on dev and prod (09-25); its Sentry check additionally needs the Sentry secrets (§3a item 5). The tenant model is decided (hosted, shared DB, 09-25).

**Where things stand.** 09-28: PRs #83 (#69) and #85 (#74) merged ~14:31 UTC; both issues closed.
Urgent bug #84 approved by Cameron and fixed by the coordinator in PR #87 (merged 09-28). #81 reworked in PR #86; Cameron confirmed it 09-29 and it is closed. Nothing in §3c is left unbuilt. #71 and #81 merged earlier (see §4). 09-29: #12 PR 3 merged (#89) and code-review bugs #90–#94 filed by the coordinator; security PR #95 merged (deploy waits on Cameron, §3a). 09-30: the coordinator released #90, #91, #93 and #94 in §3c; triage built all four as PRs #96–#99, merged 04:19 UTC, and merged `main` into docs PR #88 to clear its conflict. #90 and #91 need a `server` redeploy. The coordinator merged docs PR #88 and moved triage's org-delete question to §3a. §3c is empty. Later on 09-30 the coordinator filed #102 and #103 and released them, #32 and `attachment.service.ts` (#20) in §3c. The 09:00 triage run built all four: PRs #104 (#102), #105 (#32), #106 (#20) and #107 (#103), each with a plan comment on its issue, a test written first and a mutation check. Nothing in §3c is left unbuilt. 10-01: Cameron filed #109 (packing-list picker); triage found the cause and raised it in §3b, and ran the docs pass on `deployment.md` (PR #110, merged 15:03 UTC). Cameron closed #12 the same day. 10-02: Cameron filed #111 and #117 (both raised in §3b, nothing built); the docs pass covered `tech-stack.md` (PR #118).

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
middleware; `DELETE /gigs/:id` is Admin-only; access-request and notification routes added). `docs/technical/security-scheme.md` (09-29: checked against every policy, the RLS tests and the three edge functions; the update is **held** until the §3b security entry is resolved, then document helpers, gig UPDATE/DELETE and participant write rules, the full CORS list, `requireOrgRole` options and the `health-check` gate). `docs/technical/deployment.md` (10-01, PR #110, merged 10-01: checked against both deploy scripts, `ci.yml`, `vite.config.ts`, `config.toml` and every env read; added the `rls` CI job and the health-check step to the rebuild. Scripts only `bash -n`-checked. `deploy_prod.sh` has no `--help` and starts its gates on any run, so don't run it). `docs/technical/tech-stack.md` (10-02, PR #118: checked against `package.json`, `supabase/functions/`, migrations and `ci.yml`; added `health-check` and `notifications.ts`, corrected storage to the one `attachments` bucket). Next candidate: `docs/development/coding-guide.md`.

**Future considerations (not open work).** Left over from #61 (closed 09-25): gig attachments are invisible
to the other orgs on a gig (needs a sharing flag plus a storage-policy change), and prod has an extra
`fin_category` value `'Production'` that no migration creates. Found while fixing #61 (the first two filed 09-30 as #102 and #103): Staff/Viewers can read
their own org's staff `rate`/`fee`. Tenant model decided 09-25: hosted, shared DB. New private tables need a test
in `supabase/tests/rls/` (CI job `rls`).

 Supabase CLI 2.117 warns that `[inbucket]` in
`supabase/config.toml` is deprecated in favour of `[local_smtp]`. This is local-only config, so nothing is
broken yet.

**Order of checks each run.**

1. Check CI and mergeability on open PRs (#116 coordinator and #118 triage docs as of 10-02 09:10 UTC; list live). Fix a red or conflicted triage PR by merging `main` into it, never by rebasing.
2. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
3. §3c — build what is released there that has no PR yet (all four 09-30 items shipped in #104–#107; the coordinator clears §3c). For #20, only the service §3c names.
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
