# GigWrangler User Documentation Plan

**Last Updated**: 2026-09-08
**Status**: No user-facing docs written yet — but the core new-user path is now coherent
end to end (see "Status & Next Steps"). Docs will be authored as **Markdown** and published
from `website/` via a static-site generator (**Astro + Starlight** recommended; not yet
stood up). The 2026-09-06 dry run
([`dry-run-findings-2026-09-06.md`](dry-run-findings-2026-09-06.md)) drove issues #22–#33;
most are now fixed.

> The product was renamed **GigManager → GigWrangler** (gigwrangler.com) in May 2026.
> The git repository is still named `GigManager`. Use "GigWrangler" in all user-facing copy.

## Overview
This plan outlines the structure and content for comprehensive user-facing documentation for the GigWrangler application. The goal is to provide clear, actionable guidance for all user roles (Admins, Project Managers, and Field Staff).

---

## Status & Next Steps

**Ready to draft.** As of 2026-09-08 the *register → create/claim org → gig → staffing →
expense → calendar* path works without the blockers the 2026-09-06 dry run found.

- ✅ **Fixed since the dry run:** deep links (#26), logout (#18), post-registration URL
  (#17), gig-edit rows rendering without a reload (#16, #28), expense date off-by-one
  (#25), Google Calendar sync (#9), mobile all-day gigs (#10), and the org-ownership
  dead-end — now a full **claim / access-request** flow (#33 → PR #48).
- ⛔ **One doc-blocker remains — #22:** Google Places business/venue search is down on the
  backend (expired API key; needs a manual renewal). Manual address entry works, so docs
  can proceed and mark venue search "temporarily unavailable".
- 〰️ **Cosmetic, won't block docs:** #23 (tag entry needs Enter), #27 (list row opens via
  the ⋮ menu only), #29 (search-error copy), #31 (toast dismissal), #32 (signup password).

**Next actions:**
1. This refresh. *(done)*
2. Stand up the `website/` docs site (Astro + Starlight): port `index.html`, wire the
   sidebar to the section structure below, deploy to Cloudflare Pages.
3. **Second walkthrough pass** covering what the first one missed — schedule entries,
   calendar, change history, equipment/kits — plus the two newest, least-tested flows:
   **org claiming (#48)** and **participant → contact (PR #14)**.
4. Write **"Getting Started"** (§1–§3) against the now-working flow.

---

## Recently Shipped — Documentation Backlog

Features that have landed since this plan was first written (2026-03) and are not yet
reflected in the structure below. Grouped by the documentation section they belong in.
References: `commit`, GitHub PR `#n`, GitHub issue `#n` (repo `corourke/GigManager`).

### Latest sprint (2026-09-07 → 2026-09-08): onboarding de-block + org claiming

| Area | What shipped | Doc task | Refs |
|---|---|---|---|
| §1 / §11 | **Organization claiming & access requests** — browse organizations, then **Claim** an unclaimed org or **Request access** to a claimed one; a **platform moderator** approves/rejects from a queue; the requester gets an email (Resend) + an in-app notification-bell update. `organizations.claimed` gates who may edit/delete an org. | New §11 "Organization Access & Claiming" — the claim vs. request vs. invite paths, what a moderator does, what approval grants. | PR #48; issues #33 #42 #43 #44 #45 #46 #47; checklist `access-request-system-manual-test-checklist.md` |
| §1 Onboarding | **Deep links, logout, and the post-registration URL are fixed** — gig/detail URLs are now shareable and bookmarkable; `/logout` works; new users land on a valid page. | Safe to document shareable URLs and sign-out. | PR #38; issues #17 #18 #26 |
| §3 Gig Management | **New gig-edit rows render immediately** (staff slots, participants) — no reload needed to see the assignment / contact controls. | Drop the "reload first" caveat from the §3 staffing/participants drafts. | PR #35; issues #16 #28 |
| §5 Financials | **Expense / mileage dates fixed** (were a day early); mileage-rate year off-by-one fixed. | — | PR #34; issue #25 |
| §7 Calendar | **Google Calendar sync** connect/permission failures diagnosed & fixed; the picker only offers calendars you can write to and warns when write access is later lost. | §7 text is updated below — verify against the shipped UI in the next walkthrough. | PR #19; issue #9 |
| §8 Mobile | **Single-day all-day gigs** save correctly after an edit. | — | PR #21; issue #10 |

### Earlier sprint (2026-08-24 → 2026-09-06)

| Area | What shipped | Doc task | Refs |
|---|---|---|---|
| §3 Gig Management | **Gig Participants now models Organizations, Contacts, and Client tracking** — participating orgs (venue, vendor, act) are first-class, with their own contact rosters. | Rewrite §3 "Staffing & Participants" to cover participating organizations, the client flag, and how participant orgs differ from your own org. | `Add Organizations, Contacts, and Client tracking to Gig Participants` |
| §3 / §2 | **Per-gig participant contacts, decoupled from org membership** — a contact can be attached to a gig's participating org without being an `organization_members` row. | Explain per-gig contacts vs. permanent org members; when to use which. | commit `66b38b4`, PR #14 |
| §2 Team Management | **Quick-add staff/contacts without an invite**, with live duplicate detection (search name/email/phone, then pick an existing person or create new). Three entry points: Add Team Member ("Add Without an Account" tab), the gig staffing picker ("+ Add new person"), and Add Organization Contact. Email/phone are now optional on contacts. | New "Add someone who doesn't need a login" topic; document the duplicate-match picker; note that quick-added staff get a real role, not Viewer-only. | PR #14, issues #5 #13, commits `97159b8` `b28b294` `ad2892f` |
| §2 Team Management | **Organization Contacts section now lists all org members**, grouped by login status (has account / invited / no account). | Update §2 "Member Profiles" / "Inviting Members" to describe the grouped roster view. | commit `084ea1f` |
| §3 Gig Management | **Web gig list split into Upcoming / Past tabs** (matches mobile), with live counts and timeframe-aware empty states. Defaults to Upcoming. | Update §1 "The Dashboard" and any gig-list screenshot; note export/Columns operate on the visible tab. | PR #15, issue #7, commit `29deb8b` |
| §3 / SmartDataTable | **Active-filter (funnel) icon now has a filled badge state** so on/off reads at a glance. | Minor: update SmartDataTable filtering screenshots/description in §4 and §5. | PR #15, issue #6 |
| §5 Financials | **Gig View now refreshes after editing a financial record** (was a stale-cache bug, not a save failure). | No new doc, but remove any workaround note if one gets written. | PR #11, issue #8 |
| §5 Financials | **Sub-contractor costs now count as gig expenses** in profitability math. | Update §5 "Gig-Specific Expenses" and the profitability explanation. | commit `5888673` |
| §5 / §3 | **Gig CSV export with configurable financial columns** — choose which financial fields are included in the export. | New topic under §3 "Gig Detail View" or §5: exporting gig data, picking columns. | commit `c1537cf` |
| §5 Financials | **Expense → gig linking fixes**: scanned/imported expenses now post the burdened cost to the ledger (was $0); the "Assign Gig" picker is date-windowed and fast; retroactive gig association is now reversible. | Document the "Assign Gig" flow on a purchase/expense, the ±21-day gig window, and that changing a line's gig moves its P&L. | PR #4, commits `a42a791` `acb1e7d` `52cc662` |
| §5 Financials | **Attach receipts/documents directly to a gig expense**; "Simple Expense" gained an "Already paid" toggle + inline receipt upload; attachments open in a new tab. | Expand §3 "Gig Documents & Notes" and §5 to cover expense-level receipts and the paid toggle. | commits `7090f2b` `cdb6502` `d037142` |
| §4 Equipment | **Hierarchical / container kits**: kits can contain other kits (many-to-many, no hard depth cap), unified asset+kit component picker, cycle prevention, write-time flattened-contents cache. Packing lists and conflict detection resolve through the full nested forest to real assets. | Substantially rewrite §4 "Creating Kits" — nested kits, container vs. logical, how packing lists flatten, dedupe across levels. | merge `2b50210`, commits 2026-08-25→27, `.archive/hierarchical-kits-follow-ups.md` |
| §4 Equipment | **Kit detail screen**: combined component tree + flattened view, container-aware item counts, web Tracking page. **Location Explorer** rebuilt as an editable hierarchy. Mobile scan screen has a true nested tree. | New §4 topics: reading the kit tree, the Tracking page, Location Explorer. | commits 2026-08-26 batch |
| §4 Equipment | **Inventory reports**: manifest (dedupes assets across kit levels, interactive checkboxes), packing list (nested kits), maintenance queue. | New §4 subsection "Inventory Reports". | commits `Inventory reports` (2026-05-31), 2026-08-26 fixes |
| §8 Mobile | **Biometric unlock trap fixed** (WebAuthn), `@simplewebauthn/server` v13. | Update §8 mobile auth notes once biometric unlock is documented. | commit `Fix mobile biometric unlock trap` (2026-08-13) |
| §2 Team Management | **Default staff roles are seeded** for new orgs. | Note the starting role list in §2 "Team Roles". | commit `Seed default staff roles` |

### Bigger changes since the plan was written (2026-03 → 2026-08), not yet in the structure

| Area | What shipped | Doc task |
|---|---|---|
| New §9 | **Change history / audit trail** for gigs, assets, and kits, with actor snapshotting and an in-context history UI. | Add a new top-level section (see §9 below). |
| §7 Calendar | **Google Calendar one-way sync** + **conflict detection** (staff, equipment, venue) across month/week views. Connect/permission failures fixed in PR #19 (#9). | Flesh out §7 with the real connect/sync flow, the writable-calendar picker, and conflict-warning behavior. |
| §3 Gig Management | **Multi-act scheduling + schedule editor**: schedule entries (load-in, soundcheck, sets…) within a gig, compact rows, optional end time, native date/time pickers, date grouping. | Add §3 "Schedule / Run of Day" topic. |
| §8 Mobile | **Staff mobile dashboard**: upcoming assigned gigs with venue/contact quick links; gigs are editable in the mobile UI. | Expand §8 "Mobile Dashboard". |
| §2 / all | **Role-based UI gating**: `canManage` hides create/edit/delete affordances from Staff/Viewer. Financials reads and gig creation restricted to Admin/Manager. Multi-org membership with per-org roles. | Update §2 "Team Roles" with the real capability matrix per role. |
| §2 Auth | **Password reset flow** + invite-acceptance hardening. | Add to §1 "Onboarding". |
| §5 Financials | **Financials Improvements** (`fin-improvements-913f`, in testing): dedicated Purchases tab, purchase detail panel, edit purchases via the import-dialog UI, per-line gig assignment, inline document/asset panels. | Hold until merged; then fold into §5. |
| Platform | **June 2026 engineering remediation**: Hono edge-function middleware, react-router v7 (deep-linkable URLs — now verified working, #26), TanStack Query, CI, Sentry, org-scoped attachment storage, RLS hardening. Mostly invisible to users, but shareable URLs are worth a mention. | Minor: note shareable/bookmarkable URLs where relevant. |

### Known open issues that affect documentation (as of 2026-09-08)

- **#22 — Google Places business/venue search is down** (expired backend API key; manual
  address entry still works). Document manual venue/address entry; hold any screenshot of
  the search dropdown until the key is renewed.
- **#27 — a gig opens only from the list's row ⋮ menu** (clicking the row edits a cell).
  Tell readers "use the row ⋮ menu → View / Edit" until this changes.
- **#12 — Gig Edit may be reorganized into tabs** (deferred, no owner). The §3 "anatomy of
  a gig" layout could still shift; keep that section lightly structured.
- Minor, safe to ignore for now: #23, #29, #31, #32.

Resolved since the last revision — no longer blockers: **#9, #10, #16, #17, #18, #25, #26, #28**.

---

## Proposed Documentation Structure

### 1. Getting Started
- **What is GigWrangler?**: High-level overview of the platform's purpose.
- **Onboarding**: Sign up, set up your profile, sign in and out, password reset. *(shipped)*
- **Getting into an organization**: create your own (you become its Admin), **claim** an
  unclaimed org, **request access** to an existing one, or accept an **invitation** — full
  detail in §11. *(shipped — PR #48)*
- **The Dashboard**: Understanding the main navigation and your upcoming schedule.

### 2. Organization & Team Management
- **Organization Settings**: Managing organization-wide defaults (branding, timezones); the `claimed` state (see §11).
- **Team Roles**: Capability matrix for Admin / Manager / Staff / Viewer (see §10); seeded default staff roles; a person can hold a different role in each org they belong to. *(shipped)*
- **Inviting Members**: How to add your team and manage invitations (Admin/Manager pick the invitee's role).
- **Adding people without a login**: quick-add staff/contacts, the duplicate-detection picker (see §3 and Prompt 6). *(shipped — issue #5)*
- **Member Profiles**: Managing skills, contact info, and availability; the Organization Contacts roster grouped by login status (has account / invited / no account). *(shipped)*

### 3. Gig Management
- **Creating a Gig**: Basic info, start/end date-time, timezone, status, tags. Venue/location and everything else is added afterward from the gig's detail page. *(venue search unavailable — #22)*
- **The Gig List**: Upcoming / Past tabs (web + mobile), status/type/member filters that persist, CSV export with configurable financial columns. Open a gig from the row **⋮ menu → View / Edit** (#27). *(shipped)*
- **Gig Detail View**: Centralized hub for all gig-related data.
- **Schedule / Run of Day**: Multi-act schedule entries (load-in, soundcheck, sets…), optional end times, date grouping. *(shipped)*
- **Staffing & Participants**:
    - Managing Staff Slots (Roles, Quantities).
    - Assigning Team Members and tracking status (Invited → Confirmed/Declined).
    - **Participating Organizations**: venues, vendors, and acts as first-class participants, each with the client flag and its own contact roster. *(shipped)*
    - **Per-gig participant contacts**: attach a contact to a participating org for this gig without making them a permanent member; pick an existing person (duplicate-checked) or create a new one. *(shipped — issues #5, #13, #28)*
    - Quick-add staff without an invite (no login required). *(shipped — issue #5)*
- **Gig Documents & Notes**: Using the Markdown editor for show notes and attachments; receipts can be attached at the gig-expense level. *(shipped)*
- **Change History**: per-gig audit trail (see §9). *(shipped)*

### 4. Equipment & Inventory
- **Assets vs. Kits**: Understanding trackable individual items vs. grouped equipment sets.
- **The Asset Library**: Searching, filtering, and managing your equipment database.
- **Creating Kits**: Building standardized equipment packages (e.g., "Camera Op Kit").
    - **Hierarchical / container kits**: kits can contain other kits (many-to-many, no hard depth cap); logical vs. container kits; how packing lists flatten the nested forest to real assets and dedupe across levels. *(shipped — see `hierarchical-kits-manual-test-checklist.md`)*
    - **Kit detail screen**: combined component tree + flattened view, container-aware item counts. *(shipped)*
- **Location Explorer**: editable location hierarchy for where gear lives. *(shipped)*
- **Inventory Reports**: manifest (with interactive checkboxes), packing list (nested kits), maintenance queue. *(shipped)*
- **Barcode & QR Scanning**:
    - Generating and printing asset tags.
    - Using the mobile scanner for inventory checks; nested-tree scan view. *(shipped)*
- **Kit Assignments**: How to assign specific gear to a Gig; the Tracking page (web + mobile). *(shipped)*

### 5. Financials & Purchases
- **The Financials Tab**: Centralized view of all organization-wide transactions.
- **Purchase Management**:
    - **What is a Purchase?**: Header vs. item relationship (Invoice details vs. line items).
    - **Source Types**: 0-Invoice (Header), 1-Asset (Trackable), 2-Expense (Consumables/Fees).
- **Cost Allocation**: How the system scales item prices to match the total "Burdened Cost" (including tax/shipping).
- **Gig-Specific Expenses**: Tracking purchases and expenses against specific projects.
    - **Assign Gig** flow on a purchase line / expense: date-windowed gig picker (±21 days), reversible retroactive association, burdened cost posts to the gig ledger. *(shipped — PR #4)*
    - Sub-contractor costs count as gig expenses in profitability. *(shipped)*
    - **Simple Expense**: "Already paid" toggle + inline receipt upload; receipts attach directly to the gig expense; dates save correctly (#25). *(shipped)*
- **Purchases Tab** *(in testing — `fin-improvements-913f`)*: dedicated tab, detail panel, edit purchases via the import-dialog UI, per-line gig assignment, inline document/asset panels.

### 6. Data Import & AI Scanning
- **CSV Asset Import**:
    - **A-Z Template**: Detailed guide to the 26-column import format.
    - **Bulk Processing**: Best practices for importing large equipment lists.
- **AI Receipt & Invoice Scanning**:
    - **Uploading Documents**: Supported formats and upload locations.
    - **The Review Dialog**: Verifying and correcting AI-extracted data.
    - **Classification Rules**: The $50/$100 rule for Assets vs. Expenses.
    - **Reconciliation**: Ensuring line items match the invoice total.

### 7. Calendar & Integrations
- **The Calendar View**: Month/week views; filtering by Gig status, type, and member. *(shipped)*
- **Google Calendar Integration**:
    - Connecting your account.
    - Syncing Gigs to your personal or organization-wide calendar.
    - **Choosing a calendar you can actually write to**: only calendars you own or have "Make changes to
      events" access on are shown in the picker — if you want to sync to a shared/team calendar you don't
      own, its owner needs to grant that access first, or connect using the owner's Google account instead.
      A calendar that loses write access after being selected shows a warning here and blocks "Sync All
      Gigs" until it's resolved (fixed in PR #19 / issue #9).
    - One-way sync of Gigs to your personal or organization-wide calendar.
- **Conflict Detection**: How the system warns about overlapping schedules for staff, equipment, and venue. *(shipped)*

### 8. Mobile App & Field Operations
- **Mobile Dashboard**: Staff view of upcoming assigned gigs with venue/contact quick links; gigs editable in mobile UI. *(shipped)*
- **Biometric Unlock**: WebAuthn unlock for returning users. *(shipped)*
- **Clocking In/Out**: (If applicable/future feature) - Tracking on-site time.
- **Field Inventory**: Using Mobile Inventory Mode to check gear in/out; nested-tree scan view. *(shipped)*
- **Offline Access**: Understanding what data is available without a connection. *(offline sync still in progress — roadmap Sprint 5)*

### 9. Change History & Audit Trail *(NEW — shipped 2026-06; scope note added 2026-09-09, issue #55)*
- **What's tracked**: create/edit/delete events for gigs, assets, and kits, plus **additions**
  of a gig's participants, staff slots, financial records, and schedule entries (who added
  it, and when). This is intentionally **add-only**, not full field-level auditing: editing
  or removing an existing participant/staff slot/financial record/schedule entry does not
  currently produce a history entry (participant *removal* is the one exception — it's
  already logged). We are not a banking app — the goal is visibility into "something
  changed, by whom, and when," not a complete ledger of every field on every sub-record.
- **Reading history**: the in-context history panel on a record.
- **Actor snapshotting**: why a past entry keeps the name/role the actor had at the time.
- **Revert**: (if exposed in UI) restoring a prior state and its conflict checks.

### 10. Roles & Access *(NEW — expand from §2)*
- **Capability matrix**: what Admin / Manager / Staff / Viewer can each see and do (Financials reads and gig creation are Admin/Manager only; `canManage` hides create/edit/delete affordances from Staff/Viewer).
- **Multi-org membership**: belonging to more than one organization with a different role in each.
- **Claimed vs. unclaimed organizations**: `organizations.claimed` gates who may edit/delete an org, and determines whether newcomers *claim* or *request access* (see §11).
- **Platform moderators**: the `platform_moderator` flag and what it grants (the access-request queue).
- **Sharing a gig across organizations**: what participating-org members can see (RLS covers all org members, not just named contacts). *(shipped — commit `495cf35`)*

### 11. Organization Access & Claiming *(NEW — shipped 2026-09, PR #48)*
- **Four ways into an org**: create a new one (you become Admin) · **claim** an org that
  has no Admin yet · **request access** to a claimed org (a platform moderator approves) ·
  accept an **invitation** from an Admin/Manager (they choose your role).
- **The request / approve flow**: where the "Claim" / "Request access" buttons appear, what
  the requester sees while a request is pending, and the email + notification-bell update
  when it's approved or rejected.
- **Platform moderators**: the `platform_moderator` role and the moderator queue screen —
  who has it, how they approve/reject, and what approval grants the requester.
- **`organizations.claimed`**: what "claimed" means (ties to §10). Once an org is claimed,
  only its Admin/Manager can edit or delete it.

---

## Expert Prompts for Documentation Generation

### Prompt 1: Comprehensive Platform Overview
> "Act as a technical writer for GigWrangler, a professional AV production and labor management software. Write a 'User Welcome Guide' that explains the core philosophy: connecting People (Team), Projects (Gigs), and Gear (Equipment) with integrated Financials. Focus on how the platform reduces 'spreadsheet fatigue' for production managers."

### Prompt 2: Advanced Equipment Management (Assets & Kits)
> "Write a detailed guide on 'Mastering Your Inventory'. Explain the relationship between individual Assets (each with a unique serial number) and Kits (logical groupings). Describe the workflow for a Project Manager: from creating a new Asset, assigning it to a Kit, and finally scheduling that Kit for a Gig. Include a section on the benefits of QR code scanning for field operations."

### Prompt 3: Financials & Burdened Cost (Purchases)
> "Write a 'Financial Best Practices' guide for production accountants using GigWrangler. Explain the 'Purchase' model: how one invoice (Purchase) can contain multiple Assets and Expenses. Detail the 'Cost Allocation' logic—why an item with a $100 price tag might show a $112 'True Cost' after pro-rata tax and shipping are applied. Highlight how this provides more accurate equipment valuation."

### Prompt 4: The Gig Workflow
> "Create a step-by-step 'Gig Life Cycle' guide. Start from initial creation (Lead/Draft), through Staffing and Equipment Assignment, to 'Show Ready' status, and finally 'Completed'. Explain how each stage updates the Calendar and Dashboard for the rest of the team."

### Prompt 5: AI-Powered Data Entry
> "Write a 'Quick Start' guide for the AI Scanning feature. Describe the workflow from 'Upload Receipt' to the 'Review Dialog'. Explain how the system suggests whether an item should be an 'Asset' (trackable gear >= $50) or an 'Expense' (consumables or cheap gear). Include tips for ensuring high-quality scans for better AI accuracy."

### Prompt 6: People, Participants & Contacts
> "Write a 'Working with People' guide for GigWrangler. Distinguish four things: team members with a login, invited members who haven't accepted yet, quick-added staff who don't need an account, and per-gig contacts on a participating organization (a venue or vendor). Walk through adding someone in each case, and explain the duplicate-detection picker that searches existing people by name, email, or phone before creating a new record. Note that adding a contact to a Participating Organization now offers that org's existing members first."

### Prompt 7: Hierarchical Kits & Inventory Reports
> "Write a 'Building Nested Kits' guide. Explain logical kits vs. container kits, that a kit can contain other kits (reused across many parents, no hard depth limit), and how the packing list and manifest flatten the whole nested structure down to individual assets while deduplicating anything reachable by more than one path. Then cover the three inventory reports — manifest, packing list, maintenance queue — and when a field tech would use each."

### Prompt 8: Change History
> "Write a short 'Change History' reference for GigWrangler. Explain that gigs, assets, and kits keep an audit trail of who changed what and when, that the recorded actor name/role is a snapshot from the moment of the change, and how to open the in-context history panel on a record."

### Prompt 9: Getting Into an Organization
> "Write a 'Joining an Organization' guide for GigWrangler. Cover the four paths: creating your own organization, claiming an organization that has no administrator yet, requesting access to an organization that's already claimed (and what a platform moderator does with that request), and accepting an emailed invitation. Explain what the requester sees while a request is pending and how they're notified of the decision (email and the in-app notification bell)."
