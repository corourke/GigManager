# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage routine ("GitWrangler issue triage", 09:00 UTC) and the
GigWrangler Coordinator session. Edit this file in place; it is not an append-only log.**

**Who writes what.** The triage routine keeps §1, §2, §4 and §5 current and may add entries to
[§3b](#3b-raised-by-triage-for-the-coordinator). Only the coordinator session writes
[§3a](#3a-waiting-on-cameron) and [§3c](#3c-ready-to-build-nothing-blocking), and only the coordinator asks
Cameron questions.

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-09-28 (coordinator: #81 reopened, reworked as an indented list in PR #86, awaiting Cameron's check; #12 PRs 3–5 in progress; migration awaiting apply)
- **State verified:** 2026-09-28 14:35 UTC (PRs #83 and #85 merged ~14:31 UTC, closing #69 and #74; no open PRs)

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#84](https://github.com/corourke/GigManager/issues/84) | Saved attachments are coming up blank | Bug (urgent) | Diagnosed 09-28 (frontend only) | Coordinator — §3b |
| [#81](https://github.com/corourke/GigManager/issues/81) | Packing list not following container structure | Bug | Reopened 09-28; indented list per Cameron's list and mockup merged in [#86](https://github.com/corourke/GigManager/pull/86) | Cameron — check the #81 gig's packing list after the next frontend deploy (§3a item 1) |
| [#39](https://github.com/corourke/GigManager/issues/39) | Too many menu levels | UI/UX design | Direction set 09-26: keep the top nav (no sidebar) | Follows #12's redesign; then Cameron (§3a item 1) |
| [#12](https://github.com/corourke/GigManager/issues/12) | Reorganize Gig Edit into tabbed sections | UI/UX design | Plan approved 09-26; PRs 1–2 merged ([#79](https://github.com/corourke/GigManager/pull/79), [#80](https://github.com/corourke/GigManager/pull/80)) | Coordinator — PRs 3–5 |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Refactor | Pilot merged (PR #66); 15 services remain | Nothing — pick up next service when wanted |
| [#32](https://github.com/corourke/GigManager/issues/32) | Sign Up: no confirm-password field | Low priority | Open, not urgent | Nothing — accepted for beta |

---

## 2. Open items in detail

### Bugs

**[#84](https://github.com/corourke/GigManager/issues/84) — Saved attachments are coming up blank.**
Filed 09-28 by Cameron (labels `bug`, `urgent`). Diagnosis posted on the issue 09-28. `AttachmentManager.handleDownload`
opens `window.open('about:blank', '_blank', 'noopener,noreferrer')`, which returns `null` when `noopener` is set. The tab
stays blank, and the anchor-click fallback after the `await` gets blocked as a second popup. Proposed fix: open without
the feature string, then `opener = null` and `location.replace(url)`. Frontend only. Not in §3c, so not started (see §3b).

### Financials UX

*(#75, one edit mode for the whole gig on web, was folded into #12 on 09-26.)*

### Security

*(#61 closed 09-25: every leak fixed in PR #76; the migration was applied to dev and prod on 09-26. Any new org-private
table or policy change needs a test in `supabase/tests/rls/`; CI runs it as the `rls` job.)*

### Diagnostics / ops

*(#52 closed 09-25 — health check live on dev and prod; see §4.)*

### Gig list / detail UX

**[#12](https://github.com/corourke/GigManager/issues/12) — Reorganize Gig Edit into tabbed sections.**
Design and 5-PR plan approved 09-26 (mockups: https://claude.ai/artifact/DgFeir8bWRGLAQEERLyzSt); the
coordinator builds and merges. PR 1 (schedule item free text, [#79](https://github.com/corourke/GigManager/pull/79))
and PR 2 (one gig page, view mode, roles, Columns picker, [#80](https://github.com/corourke/GigManager/pull/80))
merged 09-26. Next: PR 3 one edit mode (When & schedule, one save indicator, Done waits for saves), PR 4
printing, PR 5 style guide.

### UI/UX — in design scoping

**[#39](https://github.com/corourke/GigManager/issues/39) — "Too many menu levels".**
Two mockups of Option A posted 09-19. Blocked on a direction pick (either variant, or a hybrid). Same
work-plan-then-approval pattern as #12.

### Refactor

**[#20](https://github.com/corourke/GigManager/issues/20) — Shared data-access layer under `src/services/`.**
Base module + `user.service.ts` pilot **merged (PR #66, 09-22)**. The pattern is now settled — the remaining
~15 services are intentionally left for later, migrated service-by-service, one at a time, only when Cameron
wants the next one picked up.

### Auth / session

**[#32](https://github.com/corourke/GigManager/issues/32) — Sign Up: no confirm-password field or strength indicator.**
Low priority, explicitly acceptable for beta. Open, no action planned.

---

## 3. Decisions and ready work

### 3a. Waiting on Cameron

*Curated by the coordinator session only.* Nothing below can move without a reply. Listed roughly in the
order that unblocks the most work; the coordinator puts these to Cameron one at a time.

1. **[#81](https://github.com/corourke/GigManager/issues/81)**: after the next frontend deploy, open the packing list for the #81 gig and compare it with the list on the issue (kits A to Z, contents indented, each container once). Close #81 if it matches.
2. **[#39](https://github.com/corourke/GigManager/issues/39)**: "keep top nav" (09-26) rules out the sidebar (Option B). It follows #12's redesign, since the gig screen is the deepest page and the two need one consistent header.
3. **Apply migration `20260926000000_schedule_item_free_text.sql`** (#12 PR 1, [#79](https://github.com/corourke/GigManager/pull/79), merged 09-26):
   `./deploy_dev.sh`, then `./deploy_prod.sh`. Until it's applied, saving schedule items named Act Arrival, Doors or
   Return fails. The rest of #12 (plan approved 09-26, Cameron authorized the coordinator to merge) is being built by
   the coordinator: PR 2 merged ([#80](https://github.com/corourke/GigManager/pull/80)), PRs 3–5 to come. Primary button colour decided: `sky-700` (#0369a1), as in the mockups.
4. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for the health check's Sentry round-trip. Optional; it reports "not configured" until set.

### 3b. Raised by triage, for the coordinator

*The triage routine adds entries here instead of asking Cameron directly — the question, and what it did in the
meantime. The coordinator resolves each entry (decides it, or moves it into §3a) and deletes it.*

- **[#84](https://github.com/corourke/GigManager/issues/84) — attachments open to `about:blank` (urgent).** Diagnosed 09-28
  on the issue; the fix is a two-line frontend change in `AttachmentManager.tsx` plus a test. It isn't in §3c, so triage
  didn't build it. Question: approve it into §3c, or build it in the coordinator session? Nothing claims `AttachmentManager.tsx`.

### 3c. Ready to build, nothing blocking

*Curated by the coordinator session only.* An item here without a **BLOCKED** marker counts as approved in shape
under AGENTS.md rule 1: the routine posts its plan on the issue and proceeds. Anything not listed here still
needs approval before code changes.

- **[#69](https://github.com/corourke/GigManager/issues/69) — adding a participant logs added/removed several times; each autosave re-creates the row.**
  Approved 09-25, the fix posted on the issue: failing test first; `updateGigParticipants` returns the inserted
  ids and `GigParticipantsSection` writes them back after the save, so later autosaves update in place.
  Separate PR from #71.

- **[#74](https://github.com/corourke/GigManager/issues/74) — gigs move to Past as soon as they start.**
  Approved 09-26 as posted on the issue: a failing test first; then a shared `isGigPast(gig, now)` helper, where a gig
  is past only after the end of its last calendar day (`end`, else `start`) in the gig's `timezone`. Used by
  `GigListScreen.tsx` and `MobileGigList.tsx`. Frontend only. Separate PR from #69.

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
| #81 rework — packing list is an indented list: kits A to Z marked Items/Container, an Items kit's contents indented under it, a lone container one line (approved mockup, board 7) | PR #86 (09-28) | Merged; #81 stays open for Cameron's check (§3a). Frontend only |
| #74 — gig lists keep a gig in Upcoming until its last calendar day is over in the gig's timezone (`isGigPast` in `src/utils/gigTimeframe.ts`, web and mobile) | PR #85 (09-28) | Merged; #74 closed. Frontend only, ships with the next frontend deploy |
| #69 — participants autosave keeps the database id after the first insert, so later autosaves update the row instead of deleting and re-inserting it (no more repeated added/removed History entries or unlinked schedule acts) | PR #83 (09-28) | Merged; #69 closed. Frontend only, ships with the next frontend deploy. Cameron to check a new participant's History after deploy |
| Docs refresh: `docs/README.md` index (PR #70), `database.md` reconciled with migrations (PR #72) | PR #70, PR #72 (09-25) | Merged; docs only, from triage docs passes |

---

## 5. For the daily triage routine

Read this section first on each run.

**File ownership — what is claimed.** Check live before starting: `git fetch origin && git branch -r
--sort=-committerdate | head -20` plus the open PR list. An open PR claims the files it touches.

| Claimed by | Files | Notes |
|---|---|---|
| #20 remaining services | `src/services/*.service.ts` (all but `user.service.ts`) | Parked until Cameron asks for the next one |
| Coordinator, #12 PR 3 (WIP branch `claude/epic-ramanujan-i9khnc`, no PR yet) | `GigScreen.tsx`, `gig/GigBasicInfoSection.tsx`, `gig/GigHeader.tsx`, `gig/GigScheduleEditor.tsx`, `gig/basicInfo/*`, `routes/screens.tsx`, `utils/hooks/editSession*`, `useAutoSave.ts`, `utils/scheduleWindow.ts` | Live as of 09-27 00:31 UTC |

**Dependencies.** #12 and #39 both reshape navigation/gig-edit UI — do them in sequence, not in parallel, once
each has a direction. #52's health check is live on dev and prod (09-25); its Sentry check additionally needs the Sentry secrets (§3a item 3). The tenant model is decided (hosted, shared DB, 09-25).

**Where things stand.** 09-28: PRs #83 (#69) and #85 (#74) merged ~14:31 UTC; both issues closed.
New urgent bug #84 diagnosed and raised in §3b. Nothing in §3c is left unbuilt. #71 and #81 merged earlier (see §4).

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
Next candidate: `docs/technical/server-endpoint-inventory.md`
(still cites the pre-refactor 3,322-line `index.ts`; retire it or re-point it at `routes/`).

**Future considerations (not open work).** Left over from #61 (closed 09-25): gig attachments are invisible
to the other orgs on a gig (needs a sharing flag plus a storage-policy change), and prod has an extra
`fin_category` value `'Production'` that no migration creates. Found while fixing #61: `duplicateGig` sends
`staff_role_id` but `create_gig_complex` reads `role`, so duplicating a gig with staff slots probably fails;
`gigParticipant`/`gigSchedule` services read a nonexistent `gigs.primary_organization_id`; Staff/Viewers can read
their own org's staff `rate`/`fee`. Tenant model decided 09-25: hosted, shared DB. New private tables need a test
in `supabase/tests/rls/` (CI job `rls`).

 Supabase CLI 2.117 warns that `[inbucket]` in
`supabase/config.toml` is deprecated in favour of `[local_smtp]`. This is local-only config, so nothing is
broken yet.

**Order of checks each run.**

1. Check CI and mergeability on open PRs (none open as of 09-28 14:35 UTC; list live).
2. #84: if the coordinator has moved it into §3c, build it (plan and fix are on the issue; failing test first).
3. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
4. #12 — same pattern.
5. #20 — no open question; only act if Cameron asks for the next service to be migrated.
6. Check §3b for unresolved entries the coordinator hasn't cleared yet.

**Don't manufacture activity.** #39 and #12 each already have exactly one open question on record.
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
