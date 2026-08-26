# The Reporting Gap

**Date:** 24 Aug 2026
**Stance:** product-manager pass, cross-referencing `docs/product/requirements.md`, `development-plan/01_roadmap.md`, and `development-plan/02_competitive-analysis.md` against a direct read of `src/` and `supabase/`.

**TL;DR:** The financial ledger is solid — single source of truth, real profitability math, receipt scanning that beats every competitor surveyed. The reporting layer built on top of it is one tab that says "Coming Soon." It's also the cheapest real gap to close: no schema changes, the data model already computes the right numbers, and a charting library has been sitting in `package.json` unused. Two other findings surfaced along the way: two status markers in `requirements.md` are simply wrong, and the June 2026 code review's engineering punch-list is now fully closed except for the one item that overlaps with this report's own top recommendation.

---

## 1. Financial reporting — partial

The per-gig ledger is genuinely good. Nothing rolls it up into a report.

**What's actually there**
- Single-ledger data model (`gig_financials`) — every revenue/expense/labor event is one row, already typed by category
- Per-gig profitability cards: Contract, Received, Outstanding, Total Costs, Profit with margin
- `GigAccountingTab` — a searchable, filterable list of gigs grouped Needs Attention / Upcoming / Past & Settled
- A summary bar that totals whatever gigs are currently filtered into view

**What's missing**
- Any report that spans *all* gigs at once — the summary bar only totals the current filter, not the org
- Expenses grouped by category or vendor
- Revenue by month, by act, or by venue
- CSV or PDF export of any financial data
- A P&L / income-statement view

> "Reporting Dashboard Coming Soon — Visual reports on your organization's spending and assets."
> — [src/components/FinancialsScreen.tsx:116](../../src/components/FinancialsScreen.tsx), the entire contents of the "Reporting" tab

**Why this is the cheap, obvious next build.** Nothing here needs new schema. `gig_financials` already carries `type` (Revenue / Expense / Labor), `category` (Labor, Equipment, Transportation, Venue, Production, Insurance, Rebillable, Other), `amount`, and a date — that's a reporting table already shaped like one. The formulas are already written down in `requirements.md`: Revenue is Contract Signed + Bid Accepted, Actual Costs is Expense Incurred + Payment Sent. And `recharts` has been an installed dependency this whole time — the only file that imports it is a generic unused chart wrapper. The tab shell exists. The data is shaped right. The library is on the shelf.

**Proposed MVP scope**

*Expense report*
- Filters: date range, category, gig (optional)
- Grouped totals by category and by month
- Drill-down to the source purchase or staff assignment
- CSV export

*Income report*
- Filters: date range, act/client, venue
- Contract value booked vs. received vs. outstanding, by month
- Break down by act and by venue
- CSV export

**Effort: Medium** (query + aggregation + UI, no migration). **Impact: High** — closes the gap flagged directly, and answers what gig-manager.app is beating GigWrangler on per the competitive analysis.

---

## 2. Two status markers in `requirements.md` are wrong

| Feature | Doc says | Code actually shows |
|---|---|---|
| Mobile inventory / warehouse workflows | 📋 Planned | ✅ **Shipped** — real camera barcode scanning (`react-qr-barcode-scanner`), five working state transitions (Pack-Out→Checked Out, Load Truck→In Transit, Load-In→On Site, Load-Out→In Transit, Unload→In Warehouse), manual-entry fallback when the camera's unavailable |
| Notifications & reminders | 🔄 In Progress | ❌ **Not started** — no email-sending code, no reminder logic, no scheduled job anywhere in the edge functions. Only ephemeral toast messages exist, which aren't the same thing |

One is better than documented, one is worse. Worth a five-minute pass to fix both markers — the status key only earns trust if it's kept accurate as fast as the code moves.

---

## 3. Sprint 3 is exactly as unbuilt as the roadmap says

| Roadmap: Sprint 3 checklist | Status |
|---|---|
| Quoting / proposal generation (line items, PDF export) | Not started |
| Settlement view for flat gigs | Not started |
| Act-specific settlement screen | Not started |
| Push notifications (Web Push API) | Not started |
| `fin-improvements-913f` user testing | **Done** — merged & deployed to prod 24 Aug 2026 |

The competitive analysis independently names its own three "critical gaps to close before public launch": **quoting/invoicing**, **push notifications**, and **settlement/reconciliation**. Same list, arrived at from a different direction. This is real, well-justified next work — it just isn't *more* justified than §1, which currently isn't on the roadmap at all.

---

## 4. Hierarchical gigs: columns exist, nothing else does

Correctly deferred to Sprint 4 — but "the schema is ready" undersells how much is left.

- `parent_gig_id` and `hierarchy_depth` columns, an index, and a cascading FK exist in the initial schema migration
- The gig-creation API accepts and stores both fields — but with no cycle check and no depth-limit validation, it's a blind pass-through
- The recursive CTE functions (`get_gig_hierarchy`, `get_effective_participants`, `get_effective_kits`) are specified in the hierarchy-foundations doc but there's no evidence they're actually deployed
- Zero UI: no parent-gig picker, no tree view, nothing referencing hierarchy anywhere in `src/components/`

The competitive analysis ranks this #1 by impact ("no competitor has this") but also rates it XL effort — and `requirements.md`'s own prioritization note says flat gigs need to fully work first. That sequencing is right. Just don't mistake two columns and a foreign key for a feature that's most of the way there — the UI and the inheritance logic are the actual work, and neither has started.

---

## 5. Smaller, already self-documented

- **CSV export** — import exists (`papaparse`), export doesn't. Already listed as a Future Enhancement in `requirements.md`.
- **Bulk edit** on the data tables — same: already on the doc's own future-enhancements list, not built.
- **`KitDetailScreen.tsx:318`** has a literal `{/* TODO: Gig Assignments Section */}` sitting in the component.
- **Dashboard** is four stat cards, an upcoming-gigs table, and an activity feed — no charts or trends anywhere, the same unused-`recharts` story as §1.

---

## 6. Follow-up: June 2026 code review status check

While preparing this report, cross-checked [code-and-product-review-202606.md](./code-and-product-review-202606.md) (a senior-engineer + PM pass from June) against the current code. Its engineering punch-list is essentially closed:

| # | June review item | Status now |
|---|---|---|
| 1 | 🔴 Cross-tenant attachment leak | ✅ Fixed — `supabase/migrations/20260612000000_scope_attachment_storage_policies.sql` |
| 2 | 🔴 Unauthenticated `ai-scan` diagnostic bypass | ✅ Removed — no `x-diagnostic` handling remains |
| 3 | Broken typecheck/lint gates | ✅ Both enforce real errors now |
| 4 | No CI | ✅ `.github/workflows/ci.yml` — typecheck → lint → test → build on every push/PR |
| 5 | No error monitoring | ✅ Sentry wired in both the web app (`src/main.tsx`) and the edge functions (`server/index.ts`, `_shared/sentry.ts`, `ai-scan/index.ts`) |
| 6 | Hand-rolled edge function routing | ✅ Refactored onto Hono |
| 7 | No router / server-state layer | ✅ react-router + TanStack Query adopted |
| 8 | Repo hygiene (`dev-dist/`, debug files, `stage-plot-app/`) | ✅ Gone or properly gitignored |
| 9 | Build quoting/invoicing/settlement before broad launch | ❌ Still open — same gap as §3 above |

Two focused months closed eight of nine items from that review. The one still open is the same product gap this report and the competitive analysis both point at independently.

---

## Recommended sequencing

1. **Fix the two status markers.** Mobile inventory → shipped. Notifications → not started. Fifteen minutes, and the doc stops misrepresenting the product.
2. **Build the expense & income reports.** Not currently on the roadmap at all — it should be. No schema work, existing formulas, an unused chart library already installed. Highest impact-per-effort item in this review.
3. **Proceed with Sprint 3 as planned.** Quoting, settlement views, push notifications. Well-justified by the competitive analysis independently arriving at the same three gaps, and now the last open item from the June review too.
4. **Keep Sprint 4 (hierarchy) deferred.** Correct call as sequenced. Budget for it as XL effort when it comes up — the schema head start is smaller than it looks.
5. **Backlog: CSV export, bulk edit, the Kit TODO.** Low urgency, already self-documented. No new information here, just confirmed still open.
