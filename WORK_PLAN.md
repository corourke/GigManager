# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage routine ("GitWrangler issue triage", 09:00 UTC) and the
GigWrangler Coordinator session. Edit this file in place; it is not an append-only log.**

**Who writes what.** The triage routine keeps §1, §2, §4 and §5 current and may add entries to
[§3b](#3b-raised-by-triage-for-the-coordinator). Only the coordinator session writes
[§3a](#3a-waiting-on-cameron) and [§3c](#3c-ready-to-build-nothing-blocking), and only the coordinator asks
Cameron questions.

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-09-23 (triage: docs PRs #67 and #68 merged)
- **State verified:** 2026-09-23 (6 open issues, 0 open PRs — docs PRs #67 and #68 both merged 18:20 UTC)

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#61](https://github.com/corourke/GigManager/issues/61) | Cross-org RLS leaks (5 tables) | Bug / security | Partially fixed; 4 leaks deferred | Cameron — scope decision |
| [#52](https://github.com/corourke/GigManager/issues/52) | Health / diagnostic check on APIs | Feature | Phases 1 and 2 both merged | Sentry secrets (not blocking) |
| [#39](https://github.com/corourke/GigManager/issues/39) | Too many menu levels | UI/UX design | Mockups posted 09-19 | Cameron — pick a variant |
| [#12](https://github.com/corourke/GigManager/issues/12) | Reorganize Gig Edit into tabbed sections | UI/UX design | Mockups posted 09-19 | Cameron — pick a variant |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Refactor | Pilot merged (PR #66); 15 services remain | Nothing — pick up next service when wanted |
| [#32](https://github.com/corourke/GigManager/issues/32) | Sign Up: no confirm-password field | Low priority | Open, not urgent | Nothing — accepted for beta |

---

## 2. Open items in detail

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

**[#52](https://github.com/corourke/GigManager/issues/52) — Health / diagnostic check on APIs.**
Phase 1 (generic `notifications` table) merged in PR #64 on 09-16. Phase 2 (Supabase, Google Places and
Sentry round-trip checks) **merged in PR #65 on 09-23**. The Sentry round-trip check reports `not configured`
until the Sentry secrets land — see [§3a item 5](#3a-waiting-on-cameron) (not blocking; everything else runs).

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

1. **#52 phase 2 deploy (PR #65, merged 09-23)** — the PR added a migration (first `pg_cron`/`pg_net` use) plus one-time
   per-project setup: `HEALTH_CHECK_CRON_SECRET` edge-function secret and the `vault.create_secret` calls in
   `docs/technical/deployment.md`. Per AGENTS.md rule 4, Cameron applies these. Asked 09-23 whether dev is done;
   until confirmed, don't treat the health check as live. Once it's confirmed on dev (and later prod), close #52 —
   the Sentry secrets (item 6) are a valid steady state, not a reason to keep #52 open.
2. **[#39](https://github.com/corourke/GigManager/issues/39)** — pick a mockup variant (or a hybrid) from the 09-19 canvas so a work plan can be written.
3. **[#12](https://github.com/corourke/GigManager/issues/12)** — pick top-tabs vs. left-side-tabs from the 09-19 canvas, **and** say whether the cross-section coordination question (e.g. staffing needing gig dates) should be folded into the same design pass.
4. **[#61](https://github.com/corourke/GigManager/issues/61)** — say whether to pull the `gig_staff_slots`/`gig_staff_assignments` leak forward next, or leave all four remaining leaks deferred until the tenant-isolation decision.
5. **Docs PRs [#67](https://github.com/corourke/GigManager/pull/67) and [#68](https://github.com/corourke/GigManager/pull/68)** — triage-authored, docs only, green. Review/merge when convenient; low stakes.
6. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for #52's Sentry round-trip check. Not blocking; the check simply reports "not configured" until they exist.

### 3b. Raised by triage, for the coordinator

*The triage routine adds entries here instead of asking Cameron directly — the question, and what it did in the
meantime. The coordinator resolves each entry (decides it, or moves it into §3a) and deletes it.*

- **2026-09-23 — PRs #67 and #68 merged.** §3a item 5 ("Docs PRs #67 and #68 — review/merge") is now
  stale. There's no question. This is just so the coordinator can drop the item.

### 3c. Ready to build, nothing blocking

*Curated by the coordinator session only.* An item here without a **BLOCKED** marker counts as approved in shape
under AGENTS.md rule 1: the routine posts its plan on the issue and proceeds. Anything not listed here still
needs approval before code changes.

- *(none at present — every open issue is waiting on a decision in §3a or is deliberately parked; see §1)*

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
| Docs refresh: `testing.md` (PR #67), `setup-guide.md` + one line of `deployment.md` (PR #68) | PR #67, PR #68 (09-23) | Merged; docs only, from triage docs passes |

---

## 5. For the daily triage routine

Read this section first on each run.

**File ownership — what is claimed.** Check live before starting: `git fetch origin && git branch -r
--sort=-committerdate | head -20` plus the open PR list. An open PR claims the files it touches.

| Claimed by | Files | Notes |
|---|---|---|
| #61 remaining leaks | `supabase/migrations/` for staffing, kits, `inventory_tracking`, `activity_log` RLS | Not started — contract, coordinator only |
| #20 remaining services | `src/services/*.service.ts` (all but `user.service.ts`) | Parked until Cameron asks for the next one |
| PR [#67](https://github.com/corourke/GigManager/pull/67) — refresh `testing.md` | `docs/development/testing.md` | Docs only; open, awaiting review |

**Dependencies.** #12 and #39 both reshape navigation/gig-edit UI — do them in sequence, not in parallel, once
each has a direction. #52's Sentry check depends on the Sentry secrets (§3a item 5) only for a live result —
Supabase/Google Places checks and the daily schedule are live regardless. The four #61 leaks depend on the
tenant-isolation-architecture decision.

**Where things stand.** Both PRs from the 09-19 batch are now merged: PR #66 on 09-22, PR #65 on 09-23 (both
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
(09-23; build and dev server tried; `supabase start` not tried because the sandbox has no Docker daemon). Next
candidates: `docs/README.md` (index last updated 09-07) and `docs/technical/database.md` (its 02-09 note
still says the migrations are "consolidated into a single initialization file"; there are now 52).

**Future considerations (not open work).** Supabase CLI 2.117 warns that `[inbucket]` in
`supabase/config.toml` is deprecated in favour of `[local_smtp]`. This is local-only config, so nothing is
broken yet.

**Order of checks each run.**

1. Check CI and mergeability on open PRs (none as of 09-23 evening).
2. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
3. #12 — same pattern.
4. #61 — check for a reply on the staffing-leak question. If yes, follow the PR #63 pattern (migration +
   before/after access table + PR, no merge without review).
5. #20 — no open question; only act if Cameron asks for the next service to be migrated.
6. Check §3b for unresolved entries the coordinator hasn't cleared yet.

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
