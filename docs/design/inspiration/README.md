# Inspiration and ideas — not implemented

Nothing in this folder describes the app as it is. These are design explorations from 2026-06 (static HTML mockups made by an AI designer from `STYLE_GUIDE_PROMPT.md` and `brief.md`), kept for the ideas in them. For how the app actually looks and how to lay out a page, use [`../STYLE_GUIDE.md`](../STYLE_GUIDE.md) and the [component sheet](../component-sheet/index.html).

Two things in the mockups are **out of date by decision**, not just unbuilt:

- **The left sidebar.** Every web mockup uses a 220 px sidebar. The app keeps a top bar (#39, 09-26) with the section menu in it.
- **Their colours.** The mockups use `sky-500` (`#0ea5e9`) accents and their own CSS variables. The app's tokens are in `src/styles/globals.css` and primary buttons are `sky-700`.

## What's here

| File | What it shows | In the app today (10-07) |
|---|---|---|
| `web-screens/dashboard.html` | Pipeline, projected revenue, staff utilisation, open roles, equipment status, low-stock alert, recent activity, upcoming gigs | Partly: revenue, upcoming gigs and recent activity |
| `web-screens/gig-list.html` | Gig table with status, date filter and tags | Largely built (Gigs) |
| `web-screens/gig-detail.html` | Hierarchy tree, breadcrumbs, Overview / Staffing / Equipment / Financials / Settlement tabs, override/revert, Mark as Settled | Partly: the gig page has Overview / Equipment / Financials / History |
| `web-screens/calendar.html` | Month/week, Quick Add Gig popover, Recent Changes panel | Partly: Month and Week views (Gigs → Calendar) |
| `web-screens/equipment.html` | Assets / Kits / Inventory / Tracking / Reports tabs, asset table | Reorganised by #39 into Assets · Kits · Out on gigs · Locations · Maintenance |
| `web-screens/financials.html` | Per-gig settlement ledger (revenue, expenses, labour, net) | Partly: a gig's money in / money out, and Gig Accounting |
| `web-screens/csv-import.html` | Upload → Map Columns → Review → Import with progress | Partly: no column-mapping step |
| `web-screens/settings-calendar.html` | Google two-way sync, Apple iCal feed, sync frequency, display preferences | Partly: Google sync only |
| `web-screens/team.html` | Members, roles, pending invitations | Built (Team) |
| `mobile-screens/mobile-screens.html` | Gig list, gig detail, Scanning, Settings | Roughly the structure of the PWA; styling differs |
| `brief.md`, `STYLE_GUIDE_PROMPT.md` | The prompts that produced the above | Historical; their file paths predate this folder |

## Ideas worth keeping

None of these is planned or approved; each would need its own issue and design.

- **Gig hierarchy tree** (`gig-detail.html`): the data model already has `parent_gig_id` and `hierarchy_depth`; there's no UI for parent and child gigs.
- **Inherit / override with Revert** (`gig-detail.html`, component sheet of the time): a child gig shows "Inherited" values from its parent and can override them, with a Revert action.
- **Settlement tab with "Mark as Settled"** (`gig-detail.html`, `financials.html`): one place to close a gig's money.
- **Dashboard pipeline and staff utilisation** (`dashboard.html`): gigs by status as a pipeline, and open roles / crew utilisation.
- **Low-stock and maintenance alert on the dashboard** (`dashboard.html`).
- **Calendar quick-add and a recent-changes panel** (`calendar.html`).
- **CSV import column mapping** (`csv-import.html`): match a spreadsheet's columns to fields before review.
- **iCal subscription feed** (`settings-calendar.html`).
- **`tabular-nums` for money, hours and times** (`brief.md`), so columns of figures line up.
- **Page transitions** (from the old style guide): a short fade on web; slide in/out on mobile.
- **One empty-state pattern** (from the old style guide): a dashed panel with icon, title, one line and a call to action. Today empty content is mostly a short italic line ("No notes"), with a few one-off panels.
