# Work Plan

**What is current, and nothing else.** The board of record for open issues, decisions waiting on Cameron, work released to build, and the rules the agents follow. When something ships or is settled, take it out of here and add a line to [WORK_LOG.md](./WORK_LOG.md). Keep this file short.

**Who writes what.**
- The triage routine keeps §1 current and may add entries to §3b.
- Only the coordinator writes §2 and §3c, and only the coordinator asks Cameron questions, one at a time.
- The Docs Lead writes §3d and the user-docs table in §4.

This file lives on `main`. Land updates there promptly: a run that starts from `main` won't see edits parked on a feature branch.

- **Last updated:** 2026-10-09 04:15 UTC (coordinator check-in: #225, #228 merged; prod verified through #221)

---

## 1. Open issues

| # | Item | State | Next / owner |
|---|---|---|---|
| [#162](https://github.com/corourke/GigManager/issues/162) | Equipment items and units (serials, tags, quantities, kits); parent of #179–#186 | Mockups approved and merged 10-08 (PR #165, `docs/design/mockups/equipment-units/`); split into sub-issues | See the rows below |
| [#181](https://github.com/corourke/GigManager/issues/181) | Data grouping review for Cameron | #180 is in prod (158 items); regrouping is now a data change. Coordinator supplies prod data | Equipment Lead |
| [#183](https://github.com/corourke/GigManager/issues/183)–[#186](https://github.com/corourke/GigManager/issues/186) | Items screens: (b) purchases, CSV import; (c) kit editor, overlap; (d) packing list, gig equipment, scanning; (e) locations, override, maintenance (closes #160) | #182 done; #183 A, B, C merged (PRs #216, #221) and **in prod 10-09**; #183 D (CSV import) off the critical path; follow-ups in [#226](https://github.com/corourke/GigManager/issues/226). #184 PR 1 (#225) and PR 2 (per-item overlap check, #230) merged 10-09: #230 follow-ups merged (#236). **#184 done** apart from a small PR: the same-unit conflict lists only tracked units (Cameron, 10-09). Shared location rule merged (#231): lot count = sum of newest row per (gig, kit, lot); `quantity` = how many are there now. **#185 plan v2 approved by Cameron 10-09** (see #185): write-off = disposal with $0 proceeds; Missing out of owned/available/insured, listed with a badge; only Admins/Managers write off or undo; undo any time unless the year is filed; un-check deletes; swap = back home; several lots = picked automatically (most at home first). PR 1 split: #239 (migration 20261018000000, write-offs, Not returned list; **migration on dev 10-09 20:15 UTC**; dev check passed; **merged 10-09**; its migration goes to prod with the next deploy) and #240 (web packing list; rebase on #239 with packed counts from `bucketsAt`). #238 (same-unit lists units; containers count as one unit) merged 10-09. PR 2 (phone) **adds ad-hoc pack-out (Cameron, 10-09)**, in Pack-Out and Load Truck only: scan or search any kit, item or lot the org owns and add it to the gig; a kit added becomes a real assignment marked "added at pack-out"; anyone scanning (Staff included) can add (narrow RLS change); loose extras count in overlap checks. Plan consolidated on #185 (10-10 02:36) and **OK'd by the coordinator 10-10 04:40** (one addition: Staff may remove a pack-out kit they added themselves); new migration 20261019000000_pack_out_additions (also Viewers can't change equipment status). Building. ~~Status and Location columns on the gig's Equipment card~~ **done, PR #244**; was (Cameron 10-09: summary with counts, e.g. "Checked Out 9 of 15"; location or "Mixed" with breakdown) | Equipment Lead: **partial lot returns (Cameron, 10-09): ask at scan time**, leave the rest at the gig (shown "not returned") or mark them missing (write-off; designed in #185's plan). **#186 split (Cameron, 10-09)**: a Locations PR first (shared "N from a lot" scan helper with tests, back-home statuses from workflow config, moves per unit/lot), with #185 built alongside on that helper; override and maintenance stay in a later #186 PR. D by a coordinator sub-agent when the Lead says it's clear |
| [#135](https://github.com/corourke/GigManager/issues/135) | Audit and fix 2026 purchase data | Unblocked once the reports are on dev; they show what needs fixing | Coordinator with Cameron; each prod data fix needs his go |
| [#20](https://github.com/corourke/GigManager/issues/20) | Shared data-access layer under `src/services/` | Batches 1–2 merged (PRs #203, #204). **Paused (Cameron, 10-08) until #186 merges**: batches 3–7 touch the services the equipment refactor and #175 rewrite | Triage resumes at batch 3 once #186 is merged |
| [#175](https://github.com/corourke/GigManager/issues/175) | Delete gig offered to Managers, but Admin-only | Cameron 10-07: another participating org's Admin must never delete; direction "cancel only when other orgs participate" | Plan approved by Cameron 10-08; **sequenced after the equipment refactor (#183–#186)**. Coordinator builds it in 3 PRs (§3c) |
| [#174](https://github.com/corourke/GigManager/issues/174) | Team roles and invitations: UI offers what the server refuses | Cameron 10-07: a Manager must never be able to make anyone an Admin, by any path | Coordinator; the server side is the private finding in §2 |

## 2. Waiting on Cameron

1. *(none blocking; bundle size is being handled in §3c)*
2. **Sentry (optional):** `VITE_SENTRY_DSN` is live in the prod web app (10-09). Still optional: `SENTRY_API_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` on prod for the health check's Sentry check.

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

**[#226](https://github.com/corourke/GigManager/issues/226) items 3, 5, 6 and 8: released to triage (Cameron, 10-09).** One PR per item, one per run, in this order; failing test first; no migrations. Post a short plan comment on #226 before each. Leave #226 open (other items stay parked). Avoid `src/services/conflictDetection*` and the kit files (the Equipment Lead is working there).
1. ~~**Item 8, URL guards.**~~ **Done: PR #233, merged 10-09.** Staff and Viewer opening `/assets/new`, `/assets/:id/edit` or `/financials` by URL are redirected to their landing page (same rule the menus use, `src/utils/permissions.ts`), with no flash of the form. Route-level, in `src/routes/` (guards or a small role-gate wrapper). Tests: each route × role.
2. ~~**Item 3, clearing a money field on the unit edit page saves.**~~ **Done: PR #237, merged 10-09.** In `AssetScreen.tsx` edit mode, clearing item price, item cost, replacement value or sale proceeds must save `null`, not drop the field as `undefined`. Test: clear each field, save, assert the update payload has `null`.
3. **Item 5, $0 invoice total.** In the purchase review (`ReviewScannedDataDialog.tsx`), when the invoice total is $0 (or empty) and the lines add up to more than $0, Save is blocked with "Enter the invoice total, or set it to match the lines ($X)." and a one-click "Use $X" fix. A total that matches its lines, including all-$0, still saves. Test both.
4. **Item 6, tracked expensed line needs a category.** A purchase line that is tracked as equipment and expensed can't be saved without an expense category: the line shows "Choose an expense category" and Save is blocked until it has one. Untracked lines keep today's rule. Test both.


**PAUSED (Cameron, 10-08): don't start any #20 batch until #186 merges.** Batches 3–7 collide with #183–#186 and #175. Triage: skip #20 and do a `docs/` pass instead.

**[#20](https://github.com/corourke/GigManager/issues/20): move the remaining services onto `src/services/base/dataAccess.ts`** (released 10-07, Cameron: "do it now"). Follow the pilots (`user.service.ts`, `attachment.service.ts`): small helpers, no domain logic, RLS stays the security boundary, no behaviour change. One PR per batch, the next only after the previous merges:
1. `notification`, `taxYear`, `accessRequest`, `purchaseScanQueue`, `purchaseCategory` (also update the services section of `docs/technical/` once)
2. ~~`activityLog`, `gigKit`, `gigParticipant`, `gigParticipantContacts`, `gigSchedule`~~ done (PR #204)
3. `gigStaff`, `asset`, `kit` (one shared `computeFieldChanges` path)
4. `organization`, `conflictDetection`, `googleCalendar`
5. `inventoryManagement`, `gigFinancial`, `taxReport`
6. `gig` (#92 is fixed, PR #200)
7. `purchase`

Pure refactor: no migrations, no edge-function or UI changes. Tests, typecheck, lint and build pass per PR.

**Code-splitting (approved by Cameron 10-09; coordinator, by sub-agents).** Prod main chunk 2,043,982 B vs the 2,097,152 B PWA precache limit. (1) **PR 1, merged (PR #228, 10-09):** lazy-load the remaining screens in `src/routes/screens.tsx`, a reload boundary for chunk-load failures, landing-screen prefetch, and `scripts/check-bundle-size.mjs` + CI step (entry chunk ≤ 1.2 MB, CI builds with a dummy Sentry DSN). Measured: main ~0.84 MB prod-shaped. (2) **PR 2, later:** lazy calendar view, Markdown, `ReviewScannedDataDialog` at its other import sites, and CSV export; touches files in the Equipment Lead's area, so schedule it between their merges. Skipped: lazy Sentry. Future considerations: `pdf.worker.min.mjs` isn't precached (offline PDF preview); `CalendarScreen.tsx` looks unused.

**[#175](https://github.com/corourke/GigManager/issues/175): gig owner organization; delete, cancel, leave and Inactive** (approved by Cameron 10-08; start only after #186 merges). Coordinator only, by sub-agents, 3 PRs in order: (1) migration `gigs.owner_organization_id` + `gig_participants.inactive`, delete/status/participant rules, RLS test 62 (migration to dev by the coordinator; prod rides the next prod deploy); (2) services: calendar cleanup after a successful delete (test first), duplicate uses the owner, remove/inactivate calls, Inactive left out of conflict checks and calendar sync, unused `DELETE /gigs/:id` removed; (3) UI: Delete Gig / Cancel Gig / Leave Gig / Mark Inactive, participant Remove / Mark Inactive / Reactivate, Inactive banner, status read-only for non-owners. The detailed plan is with the coordinator.

Not released: #174's UI half shipped in PR #199; its remaining item (the already-active error names the tab "Add Existing User") is in a database function and waits for the next membership migration.

**Never pre-approved:** migrations or any RLS/policy change (Cameron applies migrations), edge-function API shape, production config or `deploy_prod.sh`.

### 3d. Raised by the Docs Lead, for the coordinator

*The Docs Lead adds app problems and decisions it needs; it files app bugs as issues itself and links them here. The coordinator settles each entry and deletes it.*

(none open: the 10-07 entries are filed as #157–#160, #168–#171, #173–#176 and #178, and their decisions are in §1 and §2)

- **Docs Lead status, 10-09 20:45 UTC.**
  - **Post-release screenshot check (prod 10-09):** I retook all 41 shots from main. None needs replacing: #235 had already retaken the changed screens, and 3 of the 4 diffs are invisible anti-aliasing.
  - **Known gap: the team members table's Last Login** shows the screenshot runs' real sign-in times (Oct 8–9), later than the pinned date (Oct 7), and they change each run. Signing in is what updates it.
    - Fix options: the screenshot script resets last sign-in after it signs in (it needs dev SQL access, which the script doesn't have); or the shot leaves out that column.
    - Low priority; I'll take it up at the next full refresh unless Cameron prefers otherwise.
  - **#239 (merged 10-09, not in prod):**
    - The how-to is drafted in the held Equipment pages (`claude/docs-kits-draft`).
    - Published-page changes are in **PR #243, to merge after the deploy that carries #239** (stacked on #241).
    - App follow-ups are filed as **#242**: raw event names in History, Write off has no confirmation, a Missing record's Retired On is still editable, the locked-year message, Undo is reachable only from the gig, and kits after a partial write-off.
  - **PR #241 (merge now):** two pages already wrong for prod. The Equipment overview still said Assets instead of Items, units and lots, and the gig Equipment tab didn't list Equipment needed.
  - **Ready for the next deploy (10-10):**
    - PR #243 now covers History's **Equipment Written Off** and **Write-off Undone** too.
    - The held Equipment drafts match #244: the write-off confirmation, the locked fields, the filed-year message and #242 items 5–7 as the app works now. They also cover the packing list (#240) and the gig Equipment table's **Status** and **Location** columns.
    - Packing-list app problems are filed as **#245**: partly packed lots show no count; a unit's status can disagree with the packed count; print ignores the Columns choice; the print header's counts; container contents aren't indented.
    - The demo seed has no counted "any" line (every "any" item is tagged), so that case can't be screenshotted yet.
  - **Still to draft, once it merges:** #185 PR 2 (ad-hoc pack-out; scan or search to add kits and items, in Pack-Out and Load Truck only).
- **Equipment conflicts, two questions from checking #230 on dev (Docs Lead, 10-09):**
  1. **The shared-unit message also lists lots.** On the Oct 17 gigs it reads "Equipment conflict with kits: Main PA … (Speaker Stand, Tripod, Speakon Speaker Cable, 50 ft, Voltline PD-20 … (#DSL-0211))". The stands and cables are lots, already counted in the per-item shortage, and a lot in two kits isn't "the same unit booked twice". So a lot with plenty spare would still be flagged.
  2. **The card's "This gig: 4 (Full Band Sound Package × 4)"** reads as four packages. It means 4 speakers from that kit. Wording like "4 via Full Band Sound Package" would be clearer.
- **Kit editor and kit page notes for #184/#185 (Docs Lead, 10-09, from drafting the Kits page; can follow):**
  - **Duplicate:** on the kit page it returns to the list rather than the copy (`KitDetailScreen.tsx:182`), and it drops the Tag Number.
  - **"Items" means three different things:** the Equipment tab, Tracking Type **Items**, and the kit page's "Total Items" vs "Inventory Items". The kit page also still says **Total Assets**, **Assets in Kit** and "Asset".
  - **"N units owned"** is shown for lots too (`KitScreen.tsx:630`).
  - **Kit Structure doesn't identify which specific unit a line is:** there's no tag.
  - **Old "assets or kits" wording remains:** "No assets or kits found", "At least one asset or sub-kit".
  - **Icon-only buttons have no labels:** add tag (+) and remove line (X).
  - **Tracking Type descriptions promise packing and scanning behaviour** from #185/#186.
  - **A kit can hold both "4 × any HX-12P" and a specific HX-12P,** which totals 5. Intended?

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

**Equipment Lead** (next: #186 Locations and #185 in parallel, after #230) (`session_013gAYYf2hpcECG9QpxFz5Vo`, Supabase Dev environment, no prod access) owns #181–#186, the grouping review and the items screens, and reviews #180 from the screens side. The coordinator owns #179 and #180 and supplies prod data the Lead can't reach. It reports on #162 and each sub-issue.

**Docs Lead** ("GigWrangler Docs Lead", Supabase Dev environment, no prod access) owns the user guide (`website/docs/`) and its screenshots, from the demo organization in dev. It may create GitHub issues. Its decisions so far: visual style A (app match); the demo data and seed (`scripts/seed-demo.sql`, logins in `scripts/README.md`; dev holds only demo data since 10-07); screenshots from `scripts/screenshots/` at a pinned date, refreshed at each production release.

*Docs Lead, next (queued by the coordinator, 10-09 05:40 UTC; PR #229 merged):*
1. `gigs/conflict-detection.md` for PR #230 (per-item counts, peak demand, new wording, Equipment needed table; back-to-back gigs overlap).
2. `financials/reporting.md` for PR #232 (Schedule C and Needs attention tabs, with screenshots).
3. `reference/roles-and-access.md` for PR #233 (manage-only URLs redirect Staff and Viewer).
4. Draft only: `equipment/kits.md` "N × any" lines (#225), ready for when #185/#186 land.
All three merges are on main, not in prod yet; time the PR per STYLE.md.

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
| `equipment/kits.md` | draft, written (branch `claude/docs-kits-draft`) | 2026-10-09 (Docs Lead) | held until #185/#186; N × any lines, kit editor, kit page |
| `equipment/location-explorer.md` | draft | — | held: equipment rework (#162/#180) |
| `equipment/overview.md` | published | — | held: equipment rework (#162/#180) |
| `financials/cost-allocation.md` | published | 2026-10-06 (coordinator, PR #136) | — |
| `financials/gig-accounting.md` | published | 2026-10-08 (Docs Lead, PR #207) | Owed to you: Completed or Settled; held: money-type rework (was #125) |
| `financials/gig-expenses.md` | published | 2026-10-08 (Docs Lead, PR #220) | projected staff estimate documented |
| `financials/overview.md` | published | 2026-10-09 (Docs Lead, PR #227) | Upload Invoice is on the Items tab |
| `financials/purchases.md` | published | 2026-10-09 (Docs Lead, PR #227) | Track as equipment makes a lot |
| `financials/reporting.md` | published | 2026-10-09 (Docs Lead, PR #235; matches prod 10-09) | Schedule C and Needs attention documented |
| `financials/receipts-and-invoices.md` | published | 2026-10-09 (Docs Lead, PR #227) | purchase form updated for #216/#221 (units/lots, Equipment details, quantity changes) |
| `financials/tax-treatment.md` | published | 2026-10-09 (Docs Lead, PR #227) | equipment records and filed-year wording updated for #221 |
| `getting-started/onboarding.md` | published | 2026-10-06 (triage, PR #139); screenshots PR #163 | — |
| `getting-started/organizations.md` | published | 2026-10-08 (Docs Lead, PR #191, merged) | fixes and screenshots in |
| `getting-started/the-dashboard.md` | published | 2026-10-08 (Docs Lead, PR #207) | dashboard and Staff cards shots in |
| `getting-started/what-is-gigwrangler.md` | published | 2026-10-07 (Docs Lead, PR #164) | — |
| `gigs/calendar-view.md` | published (PR #222) | 2026-10-07 (Docs Lead) | — |
| `gigs/change-history.md` | published | 2026-10-07 (triage, PR #151); screenshots PR #166 | — |
| `gigs/conflict-detection.md` | published | 2026-10-09 (Docs Lead, PR #235; matches prod 10-09) | per-item conflicts, Equipment needed table, same-unit rule after #238 |
| `gigs/creating-a-gig.md` | published | 2026-10-07 (triage, PR #151); screenshots PR #166 | — |
| `gigs/documents-and-notes.md` | published (PR #222) | 2026-10-08 (Docs Lead) | — |
| `gigs/overview.md` | published | 2026-10-07 (Docs Lead, PR #166/#177) | Delete is Admin-only fix lands with #177 |
| `gigs/participating-organizations.md` | published (PR #222) | 2026-10-07 (Docs Lead) | — |
| `gigs/schedule.md` | published (PR #222) | 2026-10-07 (Docs Lead) | — |
| `gigs/staffing-and-participants.md` | published (PR #222) | 2026-10-09 (Docs Lead, PR #224) | — |
| `gigs/the-gig-list.md` | published (PR #222) | 2026-10-08 (Docs Lead) | — |
| `index.mdx` | published | 2026-10-08 (Docs Lead, PR #191, merged) | fixes in |
| `mobile/biometric-unlock.md` | draft | — | held |
| `mobile/field-inventory.md` | draft | — | held: equipment rework (#162/#180) |
| `mobile/offline-access.md` | draft | — | held |
| `mobile/overview.md` | draft | — | held |
| `reference/access-requests-and-moderation.md` | published (PR #222) | 2026-10-07 (Docs Lead); screenshots PR #191 | — |
| `reference/glossary.md` | published (PR #222) | 2026-10-07 (Docs Lead) | equipment terms (Asset, Kit, Container, Packing list) to revise with the Equipment pages |
| `reference/roles-and-access.md` | published | 2026-10-09 (Docs Lead, PR #235; matches prod 10-09) | manager-only addresses redirect (#233) |
| `settings/categories.md` | published | 2026-10-08 (Docs Lead, PR #189, merged) | corrections in |
| `settings/google-calendar.md` | published | 2026-10-08 (Docs Lead, overnight rule checked) | connected-state shot needs a Google account |
| `settings/overview.md` | published | 2026-10-08 (Docs Lead, Edit Organization button checked) | — |
| `team/invitations.md` | published (PR #222) | 2026-10-08 (Docs Lead, PR #207) | — |
| `team/member-profiles.md` | published (PR #222) | 2026-10-08 (Docs Lead, PR #217) | #206 workaround removed |
| `team/overview.md` | published | 2026-10-07 (Docs Lead, PR #177, merged) | — |
| `team/people-without-logins.md` | published (PR #222) | 2026-10-07 (Docs Lead) | — |
| `team/team-and-roles.md` | published (PR #222) | 2026-10-08 (Docs Lead, PR #217) | — |

**Project rules that bite** ([AGENTS.md](./AGENTS.md)): approval before going from plan to code (rule 1); a failing test before a bug fix (rule 3); never edit a committed migration, and Cameron applies new ones (rule 4); list manual deploy and verification steps (rule 7). Prod is read-only for agents unless Cameron approves a specific change.

## 5. Future considerations (not open work)

- **`deploy_prod.sh` env preflight** (Cameron 10-08: track here; not released, since `deploy_prod.sh` is never pre-approved). The prod bundle's `VITE_*` values come only from the deploying machine's git-ignored `.env.production.local`, and nothing checks them. Before `npm run build`, fail if that file is missing, if `VITE_SUPABASE_URL` doesn't contain `$PROD_REF`, or if `VITE_SUPABASE_ANON_KEY` / `VITE_GOOGLE_CLIENT_ID` is empty.
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
