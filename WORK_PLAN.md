# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage routine ("GitWrangler issue triage", 09:00 UTC) and the
GigWrangler Coordinator session. Edit this file in place; it is not an append-only log.**

**Who writes what.** The triage routine keeps §1, §2, §4 and §5 current and may add entries to
[§3b](#3b-raised-by-triage-for-the-coordinator). Only the coordinator session writes
[§3a](#3a-waiting-on-cameron) and [§3c](#3c-ready-to-build-nothing-blocking), and only the coordinator asks
Cameron questions.

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-09-23 (coordinator: restructured §3 into 3a/3b/3c, added §5 file ownership)
- **State verified:** 2026-09-23 (6 open issues, 1 open PR; PR #65 head `4469a71` `ci` success, mergeable)

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#65](https://github.com/corourke/GigManager/pull/65) | Health checks phase 2 (Supabase, Google Places, Sentry round-trip) | PR | Open, CI green, mergeable | Cameron — review/merge |
| [#61](https://github.com/corourke/GigManager/issues/61) | Cross-org RLS leaks (5 tables) | Bug / security | Partially fixed; 4 leaks deferred | Cameron — scope decision |
| [#52](https://github.com/corourke/GigManager/issues/52) | Health / diagnostic check on APIs | Feature | Phase 1 merged; phase 2 in PR #65 | Cameron — merge + Sentry secrets |
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
Sentry round-trip checks) is implemented in **PR #65**, open and green, awaiting review/merge.
The Sentry round-trip check reports `not configured` until the Sentry secrets land — see
[§3a item 5](#3a-waiting-on-cameron).

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

1. **PR [#65](https://github.com/corourke/GigManager/pull/65)** — open, CI green, mergeable. Review and merge (or send back with comments). (PR #66 merged 09-22.)
2. **[#39](https://github.com/corourke/GigManager/issues/39)** — pick a mockup variant (or a hybrid) from the 09-19 canvas so a work plan can be written.
3. **[#12](https://github.com/corourke/GigManager/issues/12)** — pick top-tabs vs. left-side-tabs from the 09-19 canvas, **and** say whether the cross-section coordination question (e.g. staffing needing gig dates) should be folded into the same design pass.
4. **[#61](https://github.com/corourke/GigManager/issues/61)** — say whether to pull the `gig_staff_slots`/`gig_staff_assignments` leak forward next, or leave all four remaining leaks deferred until the tenant-isolation decision.
5. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for #52's Sentry round-trip check. Not blocking; the check simply reports "not configured" until they exist.

### 3b. Raised by triage, for the coordinator

*The triage routine adds entries here instead of asking Cameron directly — the question, and what it did in the
meantime. The coordinator resolves each entry (decides it, or moves it into §3a) and deletes it.*

- *(none)*

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

---

## 5. For the daily triage routine

Read this section first on each run.

**File ownership — what is claimed.** Check live before starting: `git fetch origin && git branch -r
--sort=-committerdate | head -20` plus the open PR list. An open PR claims the files it touches.

| Claimed by | Files | Notes |
|---|---|---|
| PR #65 (#52 phase 2) | `supabase/functions/` health-check code, health-check UI/tests | Open, green, awaiting Cameron |
| #61 remaining leaks | `supabase/migrations/` for staffing, kits, `inventory_tracking`, `activity_log` RLS | Not started — contract, coordinator only |
| #20 remaining services | `src/services/*.service.ts` (all but `user.service.ts`) | Parked until Cameron asks for the next one |

**Dependencies.** #12 and #39 both reshape navigation/gig-edit UI — do them in sequence, not in parallel, once
each has a direction. #52 phase 2 Sentry check depends on the Sentry secrets (§3a item 5) only for a live
result. The four #61 leaks depend on the tenant-isolation-architecture decision.

**Where things stand.** PR #66 merged 2026-09-22 (mid-day, outside the morning run — caught via the PR-activity
subscription). WORK_PLAN.md itself landed on `main` the same morning, alongside the PR #66 merge commit.
#39, #12 and #61 are still quiet — no new replies since 09-20.

**Order of checks each run.**

1. PR #65 — re-verify CI and mergeability **directly** at the current head SHA, don't assume the last-known
   state. As of 2026-09-23: head `4469a71`, `ci` conclusion `success` (run 35434313509),
   mergeable against `main`.
2. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
3. #12 — same pattern.
4. #61 — check for a reply on the staffing-leak question. If yes, follow the PR #63 pattern (migration +
   before/after access table + PR, no merge without review).
5. #20 — no open question; only act if Cameron asks for the next service to be migrated.

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
