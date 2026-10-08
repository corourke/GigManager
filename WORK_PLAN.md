# Work Plan

**What is current, and nothing else.** The board of record for open issues, decisions waiting on Cameron, work released to build, and the rules the agents follow. When something ships or is settled, take it out of here and add a line to [WORK_LOG.md](./WORK_LOG.md). Keep this file short.

**Who writes what.**
- The triage routine keeps §1 current and may add entries to §3b.
- Only the coordinator writes §2 and §3c, and only the coordinator asks Cameron questions, one at a time.
- The Docs Lead writes §3d and the user-docs table in §4.

This file lives on `main`. Land updates there promptly: a run that starts from `main` won't see edits parked on a feature branch.

- **Last updated:** 2026-10-08 (prod deploy held until the equipment refactor is done; main on dev)

---

## 1. Open issues

| # | Item | State | Next / owner |
|---|---|---|---|
| [#125](https://github.com/corourke/GigManager/issues/125) | Financials → Reporting: tax-program data export | Part 1 merged (PR #167): recovery period on equipment, and Income / Expenses / Assets reports with CSV | In dev and prod 10-08 (2024–25 set to 7-year per the filed returns). Grey zone merged (PR #201); date-ranged mileage rates merged (PR #202); F1 run on prod 10-08. Next if wanted: Schedule C summary, Needs attention |
| [#162](https://github.com/corourke/GigManager/issues/162) | Equipment items and units (serials, tags, quantities, kits); parent of #179–#186 | Mockups approved and merged 10-08 (PR #165, `docs/design/mockups/equipment-units/`); split into sub-issues | See the rows below |
| [#181](https://github.com/corourke/GigManager/issues/181) | Data grouping review for Cameron | #180 is in prod (158 items); regrouping is now a data change. Coordinator supplies prod data | Equipment Lead |
| [#182](https://github.com/corourke/GigManager/issues/182)–[#186](https://github.com/corourke/GigManager/issues/186) | Items screens: (a) Items tab, item page, unit/lot form, dashboard total (closes #157); (b) purchases, CSV import; (c) kit editor, overlap; (d) packing list, gig equipment, scanning; (e) locations, override, maintenance (closes #160) | (a) can start (#180 on dev 10-08); b and c after a; d after c; e after d | Equipment Lead |
| [#135](https://github.com/corourke/GigManager/issues/135) | Audit and fix 2026 purchase data | Unblocked once the reports are on dev; they show what needs fixing | Coordinator with Cameron; each prod data fix needs his go |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Released in §3c (7 batches) | Batch 1 merged (PR #203, 10-08). Batch 2 merged (PR #204, coordinator, 10-08). **Triage: batch 3 next** |
| [#175](https://github.com/corourke/GigManager/issues/175) | Delete gig offered to Managers, but Admin-only | Cameron 10-07: another participating org's Admin must never delete; direction "cancel only when other orgs participate" | Cameron 10-08 chose an explicit owner organization per gig (delete only when no other claimed org participates; otherwise cancel; other orgs can leave). Coordinator writing the detailed plan for approval |
| [#174](https://github.com/corourke/GigManager/issues/174) | Team roles and invitations: UI offers what the server refuses | Cameron 10-07: a Manager must never be able to make anyone an Admin, by any path | Coordinator; the server side is the private finding in §2 |

## 2. Waiting on Cameron

1. **Dev email flows:** custom SMTP (Mailtrap) is set on dev. Check that an invitation, a sign-up confirmation and a password reset arrive in the Mailtrap inbox (only Cameron can see it), then the Docs Lead can take its held screenshots.
2. **Prod deploy held (Cameron, 10-08)** until the equipment refactor (#183–#186) is complete. Main is on dev (PR #205 deployed to dev 10-08; dev migrated to `20261016000000` 10-08). The held deploy carries migration `20261016000000_staff_rate_unit.sql` (#171) and everything merged after PR #204; run it with `deploy_prod.sh` (migration before frontend).
3. **Sentry:** (a) add `VITE_SENTRY_DSN` (React project DSN) to `.env.production.local` before the held prod deploy; the live web app has none baked in (see `docs/technical/deployment.md`, PR #208). (b) Optional: `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` on prod for the health check's Sentry check (reports "not configured" until set). Edge-function `SENTRY_DSN` / `SENTRY_ENVIRONMENT` are set on both projects.

**Decided 10-08, recorded here until done:**
- The Docs Lead's corrected membership report (private; reported to Cameron directly): no path lets a Manager make anyone an Admin. The remaining backstop gaps are **parked** (Cameron: later). Partner organizations on a shared gig may keep adding, editing and removing each other's no-login contacts (intended). Person-search privacy is fixed by #178 (in prod 10-08).
- An organization's own Admin still can't delete a claimed organization from the app (kept as is; no change).

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
2. ~~`activityLog`, `gigKit`, `gigParticipant`, `gigParticipantContacts`, `gigSchedule`~~ done (PR #204)
3. `gigStaff`, `asset`, `kit` (one shared `computeFieldChanges` path)
4. `organization`, `conflictDetection`, `googleCalendar`
5. `inventoryManagement`, `gigFinancial`, `taxReport`
6. `gig` (#92 is fixed, PR #200)
7. `purchase`

Pure refactor: no migrations, no edge-function or UI changes. Tests, typecheck, lint and build pass per PR.

Not released: #175 (needs a design pass). #174's UI half shipped in PR #199; its remaining item (the already-active error names the tab "Add Existing User") is in a database function and waits for the next membership migration.

**Never pre-approved:** migrations or any RLS/policy change (Cameron applies migrations), edge-function API shape, production config or `deploy_prod.sh`.

### 3d. Raised by the Docs Lead, for the coordinator

*The Docs Lead adds app problems and decisions it needs; it files app bugs as issues itself and links them here. The coordinator settles each entry and deletes it.*

(none open: the 10-07 entries are filed as #157–#160, #168–#171, #173–#176 and #178, and their decisions are in §1 and §2)

- **Docs Lead queue, status 10-08 evening.**
  - Items 1–2 are in PR #207. All pages checked; six wording fixes; dashboard, conflict-banner and Grey zone screenshots taken.
  - Item 3 is in PR #209, stacked on #207. It links Reporting from Overview and Tax treatment. **Flip `draft: true` to `false` on `financials/reporting.md` before merging, or the new links 404.**
  - Item 4 is in PR #210: the seed with items, units, lots, "N × any" kit lines and per-line tax treatment, as Cameron chose 10-08. Dev is reseeded.
- **Dev email flows run, 2026-10-08 (Docs Lead, for the coordinator; Cameron to check the Mailtrap inbox against this list).** All three ran from the app against dev, in a browser at `http://localhost:3000`.
  1. **Invitation**
     - Sent 18:52:10 UTC to `docs-invite-1008@example.com`, Staff. Sender: demo Admin Alicia Hale, from Demo Sound & Lighting.
     - The request was `POST /functions/v1/server/organizations/<org>/invitations`, which answered 200. The invitation expires 10-15.
     - The screen showed "Invitation sent! An email has been sent to docs-invite-1008@example.com with a link to join the organization. The user can now be assigned to gigs." That is the success toast; when `email_sent` is false the app shows a warning instead.
  2. **Sign-up confirmation: no email is sent on dev.**
     - Signed up `docs-signup-1008@example.com` at 18:52:16 UTC. `POST /auth/v1/signup` answered 200 with an access token, and the app went straight to "Select Organization" ("No organizations yet").
     - The cause: dev Auth has `mailer_autoconfirm: true` ("Confirm email" off), so Supabase confirms the address immediately and sends nothing.
     - To test the email, Cameron turns on Authentication → Sign In / Providers → Email → **Confirm email** on dev; then I'll re-run this flow.
     - Worth checking prod's setting too: the guide (team/invitations) says an invitee joins once they confirm their email.
  3. **Password reset**
     - Requested at 18:52:25 UTC for `demo-viewer@gigwrangler.test`. `POST /auth/v1/recover` answered 200.
     - The screen showed "If an account exists for demo-viewer@gigwrangler.test, a password reset link has been sent. Check your email."
  - **Dev Auth settings (read 18:55 UTC):**
    - SMTP host `sandbox.smtp.mailtrap.io`, sender "GigWrangler" <no-reply@gigwrangler.test>.
    - `site_url` and the redirect allow list are `http://localhost:3000` only, so the links in the emails point at localhost.
  - **Auth logs:** not confirmed. The Management API's `logs.all` endpoint is gone, and I couldn't find the auth source name for the new `/analytics/endpoints/logs` endpoint. The dashboard's Auth logs show the sends.
  - **Landing-page screenshots** (accept invitation, set new password, confirmed sign-up) need a real link, which I can't make: `auth.admin.generateLink` needs the service-role key, which I don't use. Either:
    - Cameron opens a link from the Mailtrap email, copies it and passes it on, and I take the shot before it expires (reset links last one hour by default); or
    - Cameron allows a server-side `generateLink` run with the dev service key held as an environment secret.
  - **Cleanup:** the two test users (`docs-invite-1008@`, `docs-signup-1008@example.com`) stay on dev until Cameron has checked the inbox. Re-seeding removes the invitee's demo-org membership but not the users.
- **Member page Edit has no Organization Role (#206, Docs Lead, 10-08).** The details page doesn't pass `currentUserRole` to `EditMemberDialog`. A one-line fix; the guide points role changes at Team → Edit Permissions until then.
- **Units from one multi-quantity depreciated purchase line (Docs Lead, 10-08; for #183).**
  - The database finds a unit's depreciated line by `purchases.asset_id`, so only one unit per line counts as depreciated or can hold a recovery period. Its siblings (same `purchase_line_id`) count as not depreciated.
  - Seen in the demo seed: 4 moving heads on one line.
  - Worth settling when #183 moves the purchase screens to `purchase_line_id`.
- **"N × any" kit lines before #184–#185 (Docs Lead, 10-08).** These are expected gaps; they're listed so the Equipment Lead sees them in the demo data:
  - The kit page shows them as "Unknown Kit × N" and leaves them out of its totals.
  - The packing list omits them.
  - Conflict detection doesn't count two overlapping gigs that each need any 4 of the 4 PA tops.

- **Correction to the private membership finding (§2 item 3), Docs Lead, 10-08.** Tested on dev as the demo Manager, the escalation I reported on 10-07 is **not exploitable**: the `guard_organization_membership` trigger (`20260929000000`) blocks it on every path tried. What remains are low-severity defence-in-depth gaps. The full write-up (paths, test results, suggested fixes) went to Cameron privately on 10-08 to pass on. No migration is urgent; fold the fixes into the next membership or security migration.

## 4. Agents and documentation

**Secrets and access tokens (setup notes for Cameron; checked 10-08).**
- **Where:** in a session's title bar, open the cloud environment menu → **Edit**. Secrets go in as **environment variables** or **Network secrets** (shown as *API credentials* in older app versions). Never paste a token into a chat.
- **When they apply:** only to sessions started **after** you save. A running session (and its sub-agents) keeps the environment it started with; start a new session to pick up a change.
- **What works today (keep it this way):** one Supabase personal access token per project, each as an environment variable:
  - `SUPABASE_DEV_ACCESS_TOKEN`: a token whose account can reach **only the dev project** (`qcrzwsazasaojqoqxwnr`). Agents use it for dev deploys and migrations: `SUPABASE_ACCESS_TOKEN=$SUPABASE_DEV_ACCESS_TOKEN ./deploy_dev.sh`.
  - `SUPABASE_ACCESS_TOKEN`: reaches **only prod** (`hqnnhtxcxedisasvtbqv`). Agents use it read-only (queries), never to write or deploy; prod deploys stay with you.
  - To check a new or rotated token without exposing it, ask the coordinator for a read-only access test in a fresh session (GET requests only, status codes only).
- **Network secrets (optional, not needed now):** the proxy attaches a network secret only to requests whose host **and path prefix** match. The 10-08 one was set for `/api/v1/qcrzwsazasaojqoqxwnr`, which matches nothing, because the Management API paths are `/v1/projects/<ref>/…`. If you use one for dev, set host `api.supabase.com`, path prefix `/v1/projects/qcrzwsazasaojqoqxwnr`, header `Authorization: Bearer <dev token>`. Don't add one for prod, and don't use a host-wide prefix: it would attach to every Supabase call, including prod's. Otherwise delete the unused one.
- **Rotating:** create the new token in the Supabase dashboard (Account → Access Tokens), replace the variable's value, start a new session, run the access test, then revoke the old token.
- Dev Auth sends email through a Mailtrap sandbox (custom SMTP set by Cameron 10-08). The SMTP password lives only in the Supabase dashboard, not in the environment or the repo.

**Pace through 10-17 (Cameron, 10-08):** keep triage and the leads busy. Cameron (10-08 evening): sub-agents do the coordinator's builds; the coordinator reviews, merges and may deploy to **dev** with `./deploy_dev.sh` (never prod). The coordinator checks in at least every 4 hours (Routine `trig_013iEPNzrK1NR8j2Qih9jzJy`, bound to coordinator session `session_01XTmXKhviMSkyy5PqcRAfUn` in the Supabase Prod environment; it disables itself after 10-17) to queue work, review ready PRs and ask Cameron about blockers.

**Equipment Lead** (next: #183; PR #192 (#182) merged 10-08) (`session_013gAYYf2hpcECG9QpxFz5Vo`, Supabase Dev environment, no prod access) owns #181–#186, the grouping review and the items screens, and reviews #180 from the screens side. The coordinator owns #179 and #180 and supplies prod data the Lead can't reach. It reports on #162 and each sub-issue.

**Docs Lead** ("GigWrangler Docs Lead", Supabase Dev environment, no prod access) owns the user guide (`website/docs/`) and its screenshots, from the demo organization in dev. It may create GitHub issues. Its decisions so far: visual style A (app match); the demo data and seed (`scripts/seed-demo.sql`, logins in `scripts/README.md`; dev holds only demo data since 10-07); screenshots from `scripts/screenshots/` at a pinned date, refreshed at each production release.

*Docs Lead, next (queued by the coordinator, 10-08 evening):*
1. **Check the pages tonight's PRs edited** (#197–#201; their sub-agents wrote the sentences, so verify each against dev and fix the wording): `financials/gig-accounting.md` (Booked; Owed to you only on Completed gigs), `getting-started/the-dashboard.md` (Staff see Owned only), `gigs/documents-and-notes.md` (Markdown notes), `gigs/conflict-detection.md`, `gigs/staffing-and-participants.md` (delete confirmation), `gigs/the-gig-list.md`, `team/member-profiles.md` (Edit, Timezone), `team/invitations.md`, `team/team-and-roles.md`, `reference/roles-and-access.md`, `settings/overview.md` (Edit Organization button), `settings/google-calendar.md` (overnight gigs), `financials/reporting.md` (Grey zone, disposal-only years).
2. **Screenshots now unblocked:** the dashboard cards (#157 is fixed), `team/member-profiles` (the Contacts card no longer clips, #176), the conflict banner, and the Reporting tab's Grey zone.
3. **Publish `financials/reporting.md`** and link it from the Financials overview and Tax treatment pages.
4. The demo seed's equipment rework for equipment items (§3d): #192 has merged, so this can start.

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
| `financials/gig-accounting.md` | published | 2026-10-08 (Docs Lead, PR #207) | Owed to you: Completed or Settled; held: #125 money-type rework |
| `financials/gig-expenses.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/overview.md` | published | 2026-10-08 (Docs Lead, PR #209) | links Reporting (merge with its publish) |
| `financials/purchases.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/reporting.md` | draft, ready (PR #209) | 2026-10-08 (Docs Lead, PRs #207/#209) | Grey zone checked and shot; publish with PR #209 |
| `financials/receipts-and-invoices.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/tax-treatment.md` | published | 2026-10-08 (Docs Lead, PR #209) | links Grey zone and Assets reports |
| `getting-started/onboarding.md` | published | 2026-10-06 (triage, PR #139); screenshots PR #163 | — |
| `getting-started/organizations.md` | published | 2026-10-08 (Docs Lead, PR #191, merged) | fixes and screenshots in |
| `getting-started/the-dashboard.md` | published | 2026-10-08 (Docs Lead, PR #207) | dashboard and Staff cards shots in |
| `getting-started/what-is-gigwrangler.md` | published | 2026-10-07 (Docs Lead, PR #164) | — |
| `gigs/calendar-view.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/change-history.md` | published | 2026-10-07 (triage, PR #151); screenshots PR #166 | — |
| `gigs/conflict-detection.md` | draft, written (PR #172, merged) | 2026-10-08 (Docs Lead, PR #207) | ready to publish; banner shot added |
| `gigs/creating-a-gig.md` | published | 2026-10-07 (triage, PR #151); screenshots PR #166 | — |
| `gigs/documents-and-notes.md` | draft, written (PR #172, merged) | 2026-10-08 (Docs Lead) | ready to publish |
| `gigs/overview.md` | published | 2026-10-07 (Docs Lead, PR #166/#177) | Delete is Admin-only fix lands with #177 |
| `gigs/participating-organizations.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/schedule.md` | draft, written (PR #172, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `gigs/staffing-and-participants.md` | draft, written (PR #172, merged) | 2026-10-08 (Docs Lead; rate units #171 checked) | ready to publish |
| `gigs/the-gig-list.md` | draft, written (PR #172, merged) | 2026-10-08 (Docs Lead) | ready to publish |
| `index.mdx` | published | 2026-10-08 (Docs Lead, PR #191, merged) | fixes in |
| `mobile/biometric-unlock.md` | draft | — | held |
| `mobile/field-inventory.md` | draft | — | held: equipment rework (#162/#180) |
| `mobile/offline-access.md` | draft | — | held |
| `mobile/overview.md` | draft | — | held |
| `reference/access-requests-and-moderation.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead); screenshots PR #191 | ready to publish |
| `reference/glossary.md` | draft, written (PR #177) | 2026-10-07 (Docs Lead) | publish after the pages it links to |
| `reference/roles-and-access.md` | published | 2026-10-08 (Docs Lead, PR #207) | Add Item, not Add Asset |
| `settings/categories.md` | published | 2026-10-08 (Docs Lead, PR #189, merged) | corrections in |
| `settings/google-calendar.md` | published | 2026-10-08 (Docs Lead, overnight rule checked) | connected-state shot needs a Google account |
| `settings/overview.md` | published | 2026-10-08 (Docs Lead, Edit Organization button checked) | — |
| `team/invitations.md` | draft, written (PR #177, merged) | 2026-10-08 (Docs Lead, PR #207) | ready to publish |
| `team/member-profiles.md` | draft, written (PR #177, merged) | 2026-10-08 (Docs Lead, PR #207) | ready to publish; role edit via Team until #206 |
| `team/overview.md` | published | 2026-10-07 (Docs Lead, PR #177, merged) | — |
| `team/people-without-logins.md` | draft, written (PR #177, merged) | 2026-10-07 (Docs Lead) | ready to publish |
| `team/team-and-roles.md` | draft, written (PR #177, merged) | 2026-10-08 (Docs Lead) | ready to publish |

**Project rules that bite** ([AGENTS.md](./AGENTS.md)): approval before going from plan to code (rule 1); a failing test before a bug fix (rule 3); never edit a committed migration, and Cameron applies new ones (rule 4); list manual deploy and verification steps (rule 7). Prod is read-only for agents unless Cameron approves a specific change.

## 5. Future considerations (not open work)

- *Noticed by tonight's sub-agents (10-08), not built:*
  - The Vitest suite runs close to the 5 s per-test timeout; under load (several runs in parallel) purchases, scan-review and staff tests time out. CI is fine today; a higher global `testTimeout` or faster tests would make it robust.
  - `src/components/CalendarScreen.tsx` looks unused (the calendar is `GigListScreen` in calendar mode).
  - `GigListScreen` still fetches the money aggregates for Staff and Viewers, though nothing shows them now (#168).
  - With the money cards hidden, the Staff dashboard's card row leaves empty slots on wide screens.
  - `TeamScreen` has an outdated invitations-migration banner (mentions `APPLY_INVITATIONS_TABLE.md`).
  - The asset page's Notes render Markdown without the shared `MarkdownContent` styling (#169).
  - Editing an existing mileage row's miles or date doesn't re-price it; only **Record Mileage** prices.
  - Mobile Settings has no **Edit Organization** entry (#176 added it on desktop Settings).
  - The already-active error names the tab "Add Existing User" (#174); it lives in a database function, so fix it in the next membership migration.
- Gig attachments are invisible to the other organizations on a gig (needs a sharing flag and a storage-policy change).
- Prod has a `fin_category` value `'Production'` that no migration creates.
- Staff and Viewers can read their own org's staff `rate` / `fee`.
- `createOrganization`'s parameter type lists `email` and `place_id`, which aren't columns; no caller sends them.
- After a first Google sign-in, profile completion requires **Set Password** and doesn't prefill the Google name.
- Supabase CLI warns that `[inbucket]` in `supabase/config.toml` is deprecated in favour of `[local_smtp]` (local config only).
- The main JS bundle is about 30 KB under the 2 MiB PWA precache limit; split more routes before it trips `npm run build` again.
- Stray branches `claude/triage-90-org-delete-references` and `claude/triage-userguide-gigs` duplicate merged work and are safe to delete.
