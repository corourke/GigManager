# Work Plan

**What is current, and nothing else.** The board of record for open issues, decisions waiting on Cameron, work released to build, and the rules the agents follow. When something ships or is settled, take it out of here and add a line to [WORK_LOG.md](./WORK_LOG.md). Keep this file short.

**Who writes what.**
- The triage routine keeps §1 current and may add entries to §3b.
- Only the coordinator writes §2 and §3c, and only the coordinator asks Cameron questions, one at a time.
- The Docs Lead writes §3d and the user-docs table in §4.

This file lives on `main`. Land updates there promptly: a run that starts from `main` won't see edits parked on a feature branch.

- **Last updated:** 2026-10-08 (coordinator: #179–#186 added; #179 and #180 are the coordinator's, #181–#186 the Equipment Lead's)

---

## 1. Open issues

| # | Item | State | Next / owner |
|---|---|---|---|
| [#125](https://github.com/corourke/GigManager/issues/125) | Financials → Reporting: tax-program data export | Part 1 merged (PR #167): recovery period on equipment, and Income / Expenses / Assets reports with CSV | In dev and prod 10-08 (2024–25 set to 7-year per the filed returns). Next, coordinator: mileage rates (F1); Schedule C summary, Needs attention and Grey zone if wanted |
| [#162](https://github.com/corourke/GigManager/issues/162) | Equipment items and units (serials, tags, quantities, kits); parent of #179–#186 | Mockups approved and merged 10-08 (PR #165, `docs/design/mockups/equipment-units/`); split into sub-issues | See the rows below |
| [#181](https://github.com/corourke/GigManager/issues/181) | Data grouping review for Cameron | #180 is in prod (158 items); regrouping is now a data change. Coordinator supplies prod data | Equipment Lead |
| [#182](https://github.com/corourke/GigManager/issues/182)–[#186](https://github.com/corourke/GigManager/issues/186) | Items screens: (a) Items tab, item page, unit/lot form, dashboard total (closes #157); (b) purchases, CSV import; (c) kit editor, overlap; (d) packing list, gig equipment, scanning; (e) locations, override, maintenance (closes #160) | (a) can start (#180 on dev 10-08); b and c after a; d after c; e after d | Equipment Lead |
| [#135](https://github.com/corourke/GigManager/issues/135) | Audit and fix 2026 purchase data | Unblocked once the reports are on dev; they show what needs fixing | Coordinator with Cameron; each prod data fix needs his go |
| [#92](https://github.com/corourke/GigManager/issues/92) | Replace-all autosave can delete rows another user or tab added | Confirmed by reading the code (09-29 review) | Coordinator, not started |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Released in §3c (7 batches) | Triage, batch 1 next |
| [#175](https://github.com/corourke/GigManager/issues/175) | Delete gig offered to Managers, but Admin-only | Cameron 10-07: another participating org's Admin must never delete; direction "cancel only when other orgs participate" | Needs a design pass (coordinator) |
| [#174](https://github.com/corourke/GigManager/issues/174) | Team roles and invitations: UI offers what the server refuses | Cameron 10-07: a Manager must never be able to make anyone an Admin, by any path | Coordinator; the server side is the private finding in §2 |
| [#178](https://github.com/corourke/GigManager/issues/178) | Duplicate check misses full names; org search is a plain substring | Taken back from triage 10-08 (Cameron): fixed together with a private person-search privacy issue (Docs Lead report, 10-08) | **Coordinator** |
| [#157](https://github.com/corourke/GigManager/issues/157) | Dashboard Equipment total should be replacement value × quantity | Rule decided by Cameron 10-07 | Done in #182 |
| [#158](https://github.com/corourke/GigManager/issues/158), [#168](https://github.com/corourke/GigManager/issues/168) | Staff/Viewers see $0 money cards (dashboard) and money columns (gig list) | Filed by the Docs Lead 10-07 | Released to triage (§3c) |
| [#159](https://github.com/corourke/GigManager/issues/159), [#169](https://github.com/corourke/GigManager/issues/169), [#170](https://github.com/corourke/GigManager/issues/170), [#171](https://github.com/corourke/GigManager/issues/171), [#173](https://github.com/corourke/GigManager/issues/173), [#176](https://github.com/corourke/GigManager/issues/176) | Small UI bugs: © year, Markdown notes, conflict banner, staff slot delete/rates, member details page, org settings path | Filed by the Docs Lead 10-07 | Released to triage (§3c) |

## 2. Waiting on Cameron

1. **Dev mail catcher** (Cameron, 10-08: Mailtrap): create a free Mailtrap Email Testing inbox and send its SMTP host, port, user and password. The coordinator then points dev's Supabase Auth at it and checks the invitation, sign-up confirmation and password-reset flows with the demo `.test` logins.
2. **Sentry secrets** (optional): `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG`; the health check reports "not configured" until set.

**Decided 10-08, recorded here until done:**
- The Docs Lead's corrected membership report (private; reported to Cameron directly): no path lets a Manager make anyone an Admin. The remaining backstop gaps are **parked** (Cameron: later). Partner organizations on a shared gig may keep adding, editing and removing each other's no-login contacts (intended). Person-search privacy is fixed with #178 (coordinator).
- An organization's own Admin still can't delete a claimed organization from the app (kept as is; no change).
- Overnight gigs: released to triage (§3c).

## 3. Ready work and agent lanes

### 3a. Pull requests

- **Open a PR only when the work is ready to merge.** Work under review (mockups, drafts awaiting a decision) is shown through an artifact or issue comments, or kept as a **draft** PR, and marked ready only when Cameron has approved it. A PR's CI and review should be the last step, not the review channel.
- The coordinator reviews and merges once CI is green and Cameron has OK'd it.
- Every PR body ends with **"User-visible changes"**: what a user now sees or does differently, with exact labels, or "None".

### 3b. Raised by triage, for the coordinator

*Triage adds entries here instead of asking Cameron. The coordinator resolves each one and deletes it.*

(none)

### 3c. Ready to build, nothing blocking

*Coordinator only.* An item here counts as approved in shape (AGENTS.md rule 1): post the plan on the issue, then build. Anything not here needs approval first.

**[#20](https://github.com/corourke/GigManager/issues/20): move the remaining services onto `src/services/base/dataAccess.ts`** (released 10-07, Cameron: "do it now"). Follow the pilots (`user.service.ts`, `attachment.service.ts`): small helpers, no domain logic, RLS stays the security boundary, no behaviour change. One PR per batch, the next only after the previous merges:
1. `notification`, `taxYear`, `accessRequest`, `purchaseScanQueue`, `purchaseCategory` (also update the services section of `docs/technical/` once)
2. `activityLog`, `gigKit`, `gigParticipant`, `gigParticipantContacts`, `gigSchedule`
3. `gigStaff`, `asset`, `kit` (one shared `computeFieldChanges` path)
4. `organization`, `conflictDetection`, `googleCalendar`
5. `inventoryManagement`, `gigFinancial`, `taxReport`
6. `gig`: **hold until #92 is settled**
7. `purchase`

Pure refactor: no migrations, no edge-function or UI changes. Tests, typecheck, lint and build pass per PR.

**Small bugs from the Docs Lead** (released 10-08 by Cameron). One PR per issue, a failing test first, frontend only. The issue describes the fix; if one turns out to need a migration, a server change or a design decision, stop and add a §3b entry instead.
- [#158](https://github.com/corourke/GigManager/issues/158): the Staff dashboard shows $0 Equipment and Revenue cards. Hide the money cards from roles that can't see the figures.
- [#168](https://github.com/corourke/GigManager/issues/168): the gig list offers Revenue, Expenses and Profit columns to Staff and Viewers. Hide them, same rule as #158.
- [#159](https://github.com/corourke/GigManager/issues/159): the Sign Up footer shows a hard-coded © 2025. Use the current year.
- [#169](https://github.com/corourke/GigManager/issues/169): gig notes show as raw text. Render them as Markdown, the way other notes are rendered.
- [#170](https://github.com/corourke/GigManager/issues/170): the conflict banner on the gig list and calendar shows an empty equipment detail, labels an Act conflict as a venue conflict, and its View button sets the wrong Back link.
- [#171](https://github.com/corourke/GigManager/issues/171): deleting a staff slot doesn't ask for confirmation, and rates always show "/ hr".
- [#173](https://github.com/corourke/GigManager/issues/173): a member's details page. Edit goes nowhere, the default role isn't shown, and timezone edits are dropped.
- [#176](https://github.com/corourke/GigManager/issues/176): there's no direct path to your own organization's settings, and the Contacts card clips its actions.

Not released, staying with the coordinator: #174, #175 (needs a design pass) and #178 (fixed with a private search issue).

**Overnight gigs on Google Calendar** (released 10-08, Cameron). A gig that ends before 6 AM on the day after it starts shows on its start day only; its real times stay at the top of the event description. The dates come from `buildCalendarEvent` in `supabase/functions/server/lib/pure/calendarEvent.ts`, shared by the server and the browser sync, so change it there with tests: a 9 PM–1:30 AM gig is one day, a gig ending at 6:00 or later shows both days, multi-day gigs are unchanged, and the cutoff is in the gig's time zone. Needs a `server` redeploy and a frontend deploy; list both in the PR.

**Never pre-approved:** migrations or any RLS/policy change (Cameron applies migrations), edge-function API shape, production config or `deploy_prod.sh`.

### 3d. Raised by the Docs Lead, for the coordinator

*The Docs Lead adds app problems and decisions it needs; it files app bugs as issues itself and links them here. The coordinator settles each entry and deletes it.*

(none open: the 10-07 entries are filed as #157–#160, #168–#171, #173–#176 and #178, and their decisions are in §1 and §2)

- **From the Docs Lead (10-08, Financials → Reporting, PR #191): #194**, a year with only disposals isn't offered in Tax year, and the needs-category hint can't always be followed. Small, UI only.
- **From the Docs Lead (10-08, Settings, PR #189): #188**, Google Calendar shows "System-Wide Bulk Re-sync (Repair)", with developer copy, to every user, and the category type-rules box says "will offer". Small, UI only.
- **Dev schema is ahead of main (Docs Lead, 10-08).** Dev has migration `20261014000000` from #180 (equipment units) applied, and its rule (tagged equipment must have quantity 1) broke the demo seed. PR #189 fixes the seed. The seed's equipment will need a fuller rework when #180 merges, and the Equipment pages wait for that too.

- **Correction to the private membership finding (§2 item 3), Docs Lead, 10-08.** Tested on dev as the demo Manager, the escalation I reported on 10-07 is **not exploitable**: the `guard_organization_membership` trigger (`20260929000000`) blocks it on every path tried. What remains are low-severity defence-in-depth gaps. The full write-up (paths, test results, suggested fixes) went to Cameron privately on 10-08 to pass on. No migration is urgent; fold the fixes into the next membership or security migration.
- **Second private security finding (Docs Lead, 10-07): privacy, in the person search behind the duplicate check (#178).** Details went to Cameron directly, as the repo is public. Cameron (10-08) asked for it to go on the private security list with the membership-RPC finding (§2 item 3). It touches the same search #178 changes, so plan the two together.

## 4. Agents and documentation

**Equipment Lead** (`session_013gAYYf2hpcECG9QpxFz5Vo`, Supabase Dev environment, no prod access) owns #181–#186, the grouping review and the items screens, and reviews #180 from the screens side. The coordinator owns #179 and #180 and supplies prod data the Lead can't reach. It reports on #162 and each sub-issue.

**Docs Lead** ("GigWrangler Docs Lead", Supabase Dev environment, no prod access) owns the user guide (`website/docs/`) and its screenshots, from the demo organization in dev. It may create GitHub issues. Its decisions so far: visual style A (app match); the demo data and seed (`scripts/seed-demo.sql`, logins in `scripts/README.md`; dev holds only demo data since 10-07); screenshots from `scripts/screenshots/` at a pinned date, refreshed at each production release.

**Triage routine** (daily, ~09:00 UTC). Each run:
1. Check CI and mergeability on its own open PRs; fix a red or conflicted one by merging `main` in, never by rebasing.
2. Build what §3c releases that has no PR yet: plan comment on the issue, failing test first.
3. On a quiet run, do one `docs/` pass (technical and development docs; next candidate: `docs/technical/conflict-detection.md`). Leave `website/docs/` to the Docs Lead.
4. Don't manufacture activity: if nothing changed, commit nothing and post nothing.

**Who updates which docs** (Cameron, 10-07):
- Code PRs keep the technical docs in `docs/` in step with the code, in the same PR.
- Code PRs don't touch the user guide or screenshots; they end with "User-visible changes" (§3a).
- The Docs Lead reads that section on merged PRs and updates the guide in its own PRs.
- Publishing: drafts keep `draft: true` until complete and verified; the coordinator publishes with Cameron.
- PRs touching `website/docs/` must pass `cd website/docs && npm ci && npm run build`.

**User-docs table** (the Docs Lead keeps it current):

| Page (`website/docs/src/content/docs/`) | Status | Last verified | Still wrong / next |
|---|---|---|---|
| `equipment/assets.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/assigning-to-a-gig.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/barcode-scanning.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/csv-asset-import.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/inventory-reports.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/kits.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/location-explorer.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/overview.md` | published | — | held: equipment rework (#162/#180) |
| `financials/cost-allocation.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/gig-accounting.md` | published | 2026-10-06 (coordinator, PR #136) | held: #125 money-type rework |
| `financials/gig-expenses.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/overview.md` | published | 2026-10-08 (Docs Lead, PR #191) | Tax time note updated; live when #191 merges |
| `financials/purchases.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/reporting.md` | draft, written (PR #191) | 2026-10-08 (Docs Lead) | new page; ready to publish once #191 merges, then link it from overview and tax treatment |
| `financials/receipts-and-invoices.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/tax-treatment.md` | published | 2026-10-08 (Docs Lead, PR #191) | recovery periods documented; live when #191 merges |
| `getting-started/onboarding.md` | published | 2026-10-06 (triage, PR #139); screenshots PR #163 | — |
| `getting-started/organizations.md` | published | 2026-10-08 (Docs Lead, PR #191) | fixes and screenshots go live when #191 merges |
| `getting-started/the-dashboard.md` | published | 2026-10-06 (triage, PR #139); screenshot PR #163 | dashboard shot held for #157 |
| `getting-started/what-is-gigwrangler.md` | published | 2026-10-07 (Docs Lead, PR #164) | — |
| `gigs/calendar-view.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/change-history.md` | published | 2026-10-07 (triage, PR #151); screenshots PR #166 | — |
| `gigs/conflict-detection.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/creating-a-gig.md` | published | 2026-10-07 (triage, PR #151); screenshots PR #166 | — |
| `gigs/documents-and-notes.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/overview.md` | published | 2026-10-07 (Docs Lead, PR #166/#177) | Delete is Admin-only fix lands with #177 |
| `gigs/participating-organizations.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/schedule.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/staffing-and-participants.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/the-gig-list.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `index.mdx` | published | 2026-10-08 (Docs Lead, PR #191) | fixes go live when #191 merges |
| `mobile/biometric-unlock.md` | draft | — | held |
| `mobile/field-inventory.md` | draft | — | held: equipment rework (#162/#180) |
| `mobile/offline-access.md` | draft | — | held |
| `mobile/overview.md` | draft | — | held |
| `reference/access-requests-and-moderation.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead); screenshots PR #191 | ready to publish |
| `reference/glossary.md` | draft, written (PR #177) | 2026-10-07 (Docs Lead) | publish after the pages it links to |
| `reference/roles-and-access.md` | published | 2026-10-07 (Docs Lead, PR #177, merged) | — |
| `settings/categories.md` | published | 2026-10-08 (Docs Lead, PR #189) | corrections go live when #189 merges |
| `settings/google-calendar.md` | published | 2026-10-08 (Docs Lead, PR #189) | rewritten in #189; connected-state shot needs a Google account |
| `settings/overview.md` | published | 2026-10-08 (Docs Lead, PR #189) | corrections go live when #189 merges |
| `team/invitations.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `team/member-profiles.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `team/overview.md` | published | 2026-10-07 (Docs Lead, PR #177, merged) | — |
| `team/people-without-logins.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `team/team-and-roles.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead) | ready to publish |

**Project rules that bite** ([AGENTS.md](./AGENTS.md)): approval before going from plan to code (rule 1); a failing test before a bug fix (rule 3); never edit a committed migration, and Cameron applies new ones (rule 4); list manual deploy and verification steps (rule 7). Prod is read-only for agents unless Cameron approves a specific change.

## 5. Future considerations (not open work)

- Gig attachments are invisible to the other organizations on a gig (needs a sharing flag and a storage-policy change).
- Prod has a `fin_category` value `'Production'` that no migration creates.
- Staff and Viewers can read their own org's staff `rate` / `fee`.
- `createOrganization`'s parameter type lists `email` and `place_id`, which aren't columns; no caller sends them.
- After a first Google sign-in, profile completion requires **Set Password** and doesn't prefill the Google name.
- Supabase CLI warns that `[inbucket]` in `supabase/config.toml` is deprecated in favour of `[local_smtp]` (local config only).
- The main JS bundle is about 30 KB under the 2 MiB PWA precache limit; split more routes before it trips `npm run build` again.
- Stray branches `claude/triage-90-org-delete-references` and `claude/triage-userguide-gigs` duplicate merged work and are safe to delete.
