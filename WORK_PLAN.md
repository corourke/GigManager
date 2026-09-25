# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage routine ("GitWrangler issue triage", 09:00 UTC) and the
GigWrangler Coordinator session. Edit this file in place; it is not an append-only log.**

**Who writes what.** The triage routine keeps §1, §2, §4 and §5 current and may add entries to
[§3b](#3b-raised-by-triage-for-the-coordinator). Only the coordinator session writes
[§3a](#3a-waiting-on-cameron) and [§3c](#3c-ready-to-build-nothing-blocking), and only the coordinator asks
Cameron questions.

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-09-25 (coordinator: #69 and #71 approved into §3c)
- **State verified:** 2026-09-25 (8 open issues; docs-only PRs #70 and #72 both merged 09-25 — check live for any others)

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#71](https://github.com/corourke/GigManager/issues/71) | Adding an *Invoice Issued* financial record fails with a repeating `fin_category` enum error | Bug | Diagnosed 09-25 (frontend/service only) | Triage — approved, in §3c |
| [#69](https://github.com/corourke/GigManager/issues/69) | Adding a gig participant logs added/removed several times in History | Bug | Diagnosed 09-24 (frontend only) | Triage — approved, in §3c |
| [#61](https://github.com/corourke/GigManager/issues/61) | Cross-org RLS leaks (5 tables) | Bug / security | Partially fixed; 4 leaks deferred | Cameron — scope decision |
| [#39](https://github.com/corourke/GigManager/issues/39) | Too many menu levels | UI/UX design | Mockups posted 09-19 | Cameron — pick a variant |
| [#12](https://github.com/corourke/GigManager/issues/12) | Reorganize Gig Edit into tabbed sections | UI/UX design | Mockups posted 09-19 | Cameron — pick a variant |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Refactor | Pilot merged (PR #66); 15 services remain | Nothing — pick up next service when wanted |
| [#32](https://github.com/corourke/GigManager/issues/32) | Sign Up: no confirm-password field | Low priority | Open, not urgent | Nothing — accepted for beta |

---

## 2. Open items in detail

### Bugs

**[#69](https://github.com/corourke/GigManager/issues/69) — When adding participant to Gig, history records it 3 times.**
Filed 09-23 by Cameron. Diagnosis posted on the issue 09-24. `GigParticipantsSection` keeps the client-side
`temp-…` id in the form after an autosave inserts the row. Each later autosave (org, role, notes, client flag)
sends `id: undefined`, so `updateGigParticipants` deletes the row and inserts it again, logging
`participant.removed` and then `participant.added`. It also silently unlinks `gig_schedule_entries.act_participant_id`
(`ON DELETE SET NULL`). The fix is frontend only: return the inserted ids and write them back into the form.
No migration, no RLS change and no API-shape change. Not started, because it isn't in §3c.

**[#71](https://github.com/corourke/GigManager/issues/71) — When adding an invoice financial record error.**
Filed 09-25 by Cameron. Diagnosis posted on the issue 09-25. `handleSaveModal` in `GigFinancialsSection` appends a
new row with `category: modalData.category ?? ''`. Non-expense types never set a category, so the save sends `''`,
and `updateGigFinancials` (which strips empty UUID and date fields but not `category`) makes Postgres reject it:
`invalid input value for enum fin_category: ""`. The failed save leaves the form dirty, so the `watch()` effect
retries it on every re-render, which is why the toast repeats. The dialog closes before the save runs, so the row
is never written and a reload loses it. The fix is frontend/service only: send `null`, normalize `''` in the
service, stop retrying an identical failed payload, and keep the dialog open until the save succeeds. That last
part is a UX change. No migration, no RLS change and no API-shape change. Not started, because it isn't in §3c.

### Security

**[#61](https://github.com/corourke/GigManager/issues/61) — Cross-org RLS leaks.**
The `gig_financials` piece is **fixed and merged** (PR #63, 09-14). The remaining four leaks —
`gig_staff_slots`/`gig_staff_assignments` (staffing), kit assignments, `inventory_tracking`, and `activity_log` —
are deferred pending the tenant-isolation-architecture decision (see
[docs/technical/tenant-isolation-architecture.md](./docs/technical/tenant-isolation-architecture.md)).
A comment posted 09-20 proposing to pull the staffing leak forward next is still unanswered.

When a leak is approved for work, follow the `gig_financials` pattern from PR #63: new migration + a
before/after access table in the PR body + PR. **No merge without review** — this is live production
access-control data.

### Diagnostics / ops

*(#52 closed 09-25 — health check live on dev and prod; see §4.)*

### Gig list / detail UX

**[#12](https://github.com/corourke/GigManager/issues/12) — Reorganize Gig Edit into tabbed sections.**
Mockup canvas posted 09-19 (top tabs vs. left-side tabs). Blocked on a direction pick. Once a variant is
chosen, write a full work plan (approach / test strategy / review criteria), post it, and **wait for approval
before implementing** (AGENTS.md rule 1).

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

1. **[#39](https://github.com/corourke/GigManager/issues/39)** — pick a mockup variant (or a hybrid) from the 09-19 canvas so a work plan can be written.
2. **[#12](https://github.com/corourke/GigManager/issues/12)** — pick top-tabs vs. left-side-tabs from the 09-19 canvas, **and** say whether the cross-section coordination question (e.g. staffing needing gig dates) should be folded into the same design pass.
3. **[#61](https://github.com/corourke/GigManager/issues/61)** — say whether to pull the staffing leak (`gig_staff_slots`/`gig_staff_assignments`) forward next, or leave all four remaining leaks deferred until the tenant-isolation decision. **Also covers** the always-true WITH CHECK on "Staff can update their own assignments" (`20260319213000_gig_financials_workflow.sql`; staff can set their own completion/units/ledger link), found 09-25 — same table, needs a migration, so it's a contract; best fixed together with the staffing leak.
4. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for the health check's Sentry round-trip. Optional; it reports "not configured" until set.

### 3b. Raised by triage, for the coordinator

*The triage routine adds entries here instead of asking Cameron directly — the question, and what it did in the
meantime. The coordinator resolves each entry (decides it, or moves it into §3a) and deletes it.*

- *(none)*

### 3c. Ready to build, nothing blocking

*Curated by the coordinator session only.* An item here without a **BLOCKED** marker counts as approved in shape
under AGENTS.md rule 1: the routine posts its plan on the issue and proceeds. Anything not listed here still
needs approval before code changes.

- **[#71](https://github.com/corourke/GigManager/issues/71) — *Invoice Issued* (and every non-expense type) fails with a repeating `fin_category` enum error.**
  Approved 09-25, all four items of the fix posted on the issue: failing test first; send `category: null`, not `''`;
  normalize `''` in `updateGigFinancials`; don't retry an identical failed payload; **and keep the modal open until
  the save succeeds** (Cameron approved the UX change). Files: `GigFinancialsSection.tsx`, `gigFinancial.service.ts`.
- **[#69](https://github.com/corourke/GigManager/issues/69) — adding a participant logs added/removed several times; each autosave re-creates the row.**
  Approved 09-25, the fix posted on the issue: failing test first; `updateGigParticipants` returns the inserted
  ids and `GigParticipantsSection` writes them back after the save, so later autosaves update in place.
  Separate PR from #71.

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
| #52 fix — health check moved to its own `health-check` function (`verify_jwt = false`) | PR #73 (09-25) | Merged; setup done on dev + prod 09-25, verified by curl. #52 closed |
| Docs refresh: `testing.md` (PR #67), `setup-guide.md` + one line of `deployment.md` (PR #68) | PR #67, PR #68 (09-23) | Merged; docs only, from triage docs passes |
| Docs refresh: `docs/README.md` index (PR #70), `database.md` reconciled with migrations (PR #72) | PR #70, PR #72 (09-25) | Merged; docs only, from triage docs passes |

---

## 5. For the daily triage routine

Read this section first on each run.

**File ownership — what is claimed.** Check live before starting: `git fetch origin && git branch -r
--sort=-committerdate | head -20` plus the open PR list. An open PR claims the files it touches.

| Claimed by | Files | Notes |
|---|---|---|
| #61 remaining leaks | `supabase/migrations/` for staffing, kits, `inventory_tracking`, `activity_log` RLS | Not started — contract, coordinator only |
| #20 remaining services | `src/services/*.service.ts` (all but `user.service.ts`) | Parked until Cameron asks for the next one |

**Dependencies.** #12 and #39 both reshape navigation/gig-edit UI — do them in sequence, not in parallel, once
each has a direction. #52's health check is live on dev and prod (09-25); its Sentry check additionally needs the Sentry secrets (§3a item 4). The four #61 leaks depend on the
tenant-isolation-architecture decision.

**Where things stand.** New bug #71 (adding an *Invoice Issued* financial record fails with a repeating enum error) was filed 09-25; that
run diagnosed it and raised it in §3b. Bug #69 (participant add logged several times in History) was filed 09-23. The 09-24
run diagnosed it and raised it in §3b; it is buildable as soon as the coordinator lists it in §3c. Both PRs from the 09-19 batch are now merged: PR #66 on 09-22, PR #65 on 09-23 (both
caught via the PR-activity subscription, outside the morning run). #39, #12 and #61 are still quiet, with no new replies since 09-20.

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

**Future considerations (not open work).** Supabase CLI 2.117 warns that `[inbucket]` in
`supabase/config.toml` is deprecated in favour of `[local_smtp]`. This is local-only config, so nothing is
broken yet.

**Order of checks each run.**

1. Check CI and mergeability on open PRs (docs-only #70 and #72 both merged 09-25; list live for anything newer).
2. #69 and #71 — if either is now in §3c, post the plan, write the failing test first (#69: repeated autosave must not delete and reinsert the row; #71: adding an *Invoice Issued* record must send `category: null`), then fix.
3. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
4. #12 — same pattern.
5. #61 — check for a reply on the staffing-leak question. If yes, follow the PR #63 pattern (migration +
   before/after access table + PR, no merge without review).
6. #20 — no open question; only act if Cameron asks for the next service to be migrated.
7. Check §3b for unresolved entries the coordinator hasn't cleared yet.

**Don't manufacture activity.** Each of #39, #12 and #61 already has exactly one open question on record.
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
