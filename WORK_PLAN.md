# Work Plan — Issue Triage Board

**Living reference for the daily issue-triage run. Edit this file in place; it is not an append-only log.**

Migrated from GitHub issue [#41](https://github.com/corourke/GigManager/issues/41) on 2026-09-22. This file now
supersedes that issue as the board of record.

- **Last updated:** 2026-09-22
- **State verified:** 2026-09-22 (open issues, both open PRs, CI conclusions re-checked directly — not assumed)

---

## 1. Status at a glance

| # | Item | Type | State | Waiting on |
|---|---|---|---|---|
| [#65](https://github.com/corourke/GigManager/pull/65) | Health checks phase 2 (Supabase, Google Places, Sentry round-trip) | PR | Open, CI green, mergeable | Cameron — review/merge |
| [#66](https://github.com/corourke/GigManager/pull/66) | Shared data-access base module + `user.service.ts` pilot | PR | Open, CI green, mergeable | Cameron — review/merge |
| [#61](https://github.com/corourke/GigManager/issues/61) | Cross-org RLS leaks (5 tables) | Bug / security | Partially fixed; 4 leaks deferred | Cameron — scope decision |
| [#52](https://github.com/corourke/GigManager/issues/52) | Health / diagnostic check on APIs | Feature | Phase 1 merged; phase 2 in PR #65 | Cameron — merge + Sentry secrets |
| [#39](https://github.com/corourke/GigManager/issues/39) | Too many menu levels | UI/UX design | Mockups posted 09-19 | Cameron — pick a variant |
| [#12](https://github.com/corourke/GigManager/issues/12) | Reorganize Gig Edit into tabbed sections | UI/UX design | Mockups posted 09-19 | Cameron — pick a variant |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Refactor | Pilot in PR #66; 15 services remain | Cameron — merge pilot first |
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
[§3 item 5](#3-blocked-on-cameron).

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
Base module + `user.service.ts` pilot implemented in **PR #66**, open and green. The remaining ~15 services
are intentionally left for later and should be migrated service-by-service, only after the pilot is reviewed
and merged so the pattern is settled.

### Auth / session

**[#32](https://github.com/corourke/GigManager/issues/32) — Sign Up: no confirm-password field or strength indicator.**
Low priority, explicitly acceptable for beta. Open, no action planned.

---

## 3. Blocked on Cameron

Nothing below can move without a reply. Listed roughly in the order that unblocks the most work.

1. **PR [#65](https://github.com/corourke/GigManager/pull/65) and PR [#66](https://github.com/corourke/GigManager/pull/66)** — both open, CI green, mergeable. Review and merge (or send back with comments).
2. **[#39](https://github.com/corourke/GigManager/issues/39)** — pick a mockup variant (or a hybrid) from the 09-19 canvas so a work plan can be written.
3. **[#12](https://github.com/corourke/GigManager/issues/12)** — pick top-tabs vs. left-side-tabs from the 09-19 canvas, **and** say whether the cross-section coordination question (e.g. staffing needing gig dates) should be folded into the same design pass.
4. **[#61](https://github.com/corourke/GigManager/issues/61)** — say whether to pull the `gig_staff_slots`/`gig_staff_assignments` leak forward next, or leave all four remaining leaks deferred until the tenant-isolation decision.
5. **Sentry secrets** — `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` for #52's Sentry round-trip check. Not blocking; the check simply reports "not configured" until they exist.

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

---

## 5. Notes for continuity

Read this section first on each run.

**Where things stand.** 2026-09-21 was the second consecutive quiet day: no new replies on #39, #12 or #61
since 09-20, and no new commits, reviews or non-bot comments on either open PR since 09-19. Re-verified on
2026-09-22 — still true. Everything open is parked on Cameron's input; nothing has been implemented since
PR #66 was opened on 09-19.

**Order of checks each run.**

1. PR #65 and PR #66 — re-verify CI and mergeability **directly** at the current head SHA, don't assume the
   last-known state. As of 2026-09-22: #65 head `4469a71`, #66 head `191c56a`, `ci` conclusion `success` on
   both (runs 35434313509 and 35434701960), both mergeable against `main` at `ee457e8`.
2. #39 — check for a reply. If a variant is picked → work plan → post → wait for approval → implement.
3. #12 — same pattern.
4. #61 — check for a reply on the staffing-leak question. If yes, follow the PR #63 pattern (migration +
   before/after access table + PR, no merge without review).

**Don't manufacture activity.** Each of #39, #12 and #61 already has exactly one open question on record.
If a run finds everything still quiet, that is a legitimate no-op: do **not** re-post the same "still waiting"
comments — daily repetition is noise. Speak up only when something actually changes (a new reply, CI going
red, a new review comment, a new issue).

**Project rules that bite here.** From [AGENTS.md](./AGENTS.md): never go from requirements → spec → plan →
implementation without approval first (rule 1); write a failing test before fixing a bug (rule 3); never edit
a committed migration, and ask Cameron to apply new ones to the remote Supabase database, then wait for
confirmation (rule 4); enumerate any manual deploy/verification steps after implementing (rule 7); keep
project documents — including this file — updated as work completes (rule 8).

**Maintaining this file.** Update it in place as part of the same branch/PR as the day's work, or as a
standalone commit on a quiet day only if something actually changed. Keep §1 and §3 accurate first — they are
what gets read at a glance. Move finished work into §4 rather than deleting it, so the history of what shipped
stays available without digging through closed PRs.
