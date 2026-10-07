# GigWrangler Style Guide

The reference for how GigWrangler looks and how to lay out a page, web and mobile. Everything here describes the app as built (checked against the code on 2026-10-07); where the code and this guide disagree, fix one of them.

- **Component sheet:** [`component-sheet/index.html`](./component-sheet/index.html) shows the real tokens and components (top bar, page header variants, tabs, buttons, badges, cards, table cells). Open it in a browser.
- **Not in the app:** older mockups and the ideas in them are in [`inspiration/`](./inspiration/README.md). Don't build from them without an issue.

## Design Principles
1.  **Professional & Clean**: High contrast, crisp edges, and ample whitespace.
2.  **Information Density**: High density for Web (admin/dashboard), optimized for legibility and tap targets for Mobile.
3.  **Accent-Driven**: Use `sky` (blue) for primary actions and the active state. Primary buttons are `sky-700` (`#0369a1`), decided 09-26 with the #12 gig page design.
4.  **Semantic Hierarchy**: Use bold uppercase labels for metadata and specific font weights for primary data.

---

## Design Tokens (CSS Variables)

Tokens are defined in `./src/styles/globals.css`: plain CSS variables on `:root` (light) and `.dark`, exposed to Tailwind v4 as colours by the `@theme inline` block (`--color-primary: var(--primary)` and so on). There is no `tailwind.config.js`; Tailwind is compiled by `@tailwindcss/vite`.

### Colors (light)
| Token | Value | Tailwind | Description |
| :--- | :--- | :--- | :--- |
| `--background` | `#ffffff` | `bg-background` | Page and card background |
| `--foreground` | `oklch(0.145 0 0)` | `text-foreground` | Primary text |
| `--primary` | `#0284c7` (sky-600) | `bg-primary`, `text-primary` | The shadcn `Button` default variant and `link` variant. Not yet the decided primary colour; see [Buttons](#buttons) |
| `--primary-foreground` | `#ffffff` | `text-primary-foreground` | Text on primary |
| `--muted` | `#ececf0` | `bg-muted` | Secondary backgrounds, skeletons |
| `--muted-foreground` | `#717182` | `text-muted-foreground` | Secondary and metadata text |
| `--accent` | `#e9ebef` | `bg-accent` | Hover background for outline and ghost buttons |
| `--secondary` | `oklch(0.95 0.0058 264.53)` | `bg-secondary` | `Button`/`Badge` `secondary` variant |
| `--card` | `#ffffff` | `bg-card` | `Card` background |
| `--destructive` | `#d4183d` | `bg-destructive`, `text-destructive` | Delete actions, errors |
| `--border` | `rgba(0, 0, 0, 0.1)` | `border-border` | Standard border |
| `--input-background` | `#f3f3f5` | `bg-input-background` | Input fill |
| `--ring` | `oklch(0.708 0 0)` | `ring-ring` | Focus ring on shadcn/ui components |
| `--radius` | `0.625rem` | `rounded-md`, `rounded-lg` … | Corner radius base |

`.dark` redefines the same tokens; the web app doesn't switch to dark mode today. The chart and `--sidebar-*` tokens come with shadcn/ui and aren't used by any screen.

There is no `--accent-sky` token. Where a pattern needs sky it uses Tailwind's palette directly (`sky-50`, `sky-700`, `sky-800`).

### Buttons
| Use | Classes |
| :--- | :--- |
| Primary (Edit, Done, Create, Save) | `<Button className="bg-sky-700 hover:bg-sky-800 text-white">`. White on `sky-700` passes WCAG AA contrast |
| Secondary (Print, Cancel) | `<Button variant="outline">` |
| Low-emphasis in a card header (Columns) | `<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">` |
| Destructive | `<Button variant="destructive">`, or a menu item with `text-red-600 focus:text-red-600` |
| Text link | `text-sky-700 hover:underline` |

Older screens still use `bg-sky-500 hover:bg-sky-600` or the plain default variant (`--primary`, sky-600). New and reworked screens use `sky-700`; the rest are brought in line as they are touched.

---

## Typography & Labels

### Metadata Labels
A small uppercase label above or beside data: the gig page's "Editing" label, "Show columns" in the Columns picker, print kickers.
-   **CSS**: `text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground` (or a semantic colour, e.g. `text-sky-800` for Editing).
-   Most field labels are the plain shadcn `Label` (`text-sm font-medium`); use the metadata label only where a quiet category is wanted.

### Primary Data
-   **Web**: `text-sm font-medium text-foreground`
-   **Mobile**: `text-[14px] font-semibold text-foreground`

### Interaction States
- **Hover**: a background shift: `hover:bg-accent` on outline and ghost buttons, `hover:bg-sky-800` on a primary button, `hover:bg-white/60` on the section menu.
- **Focus**: the shadcn/ui components' own ring (`focus-visible:ring-ring/50 focus-visible:ring-[3px]`); don't remove it. Custom controls (the section menu, the page header's Back, page tabs) use `focus-visible:ring-2 focus-visible:ring-sky-600`.
- **Disabled**: `disabled:opacity-50 disabled:pointer-events-none` (from `ui/button.tsx`).

---

## UI Patterns: Web

### 1. Page layout (#39): the same frame on every web screen

Every web screen stacks the same bands, in this order. Nothing goes above the title.

| Band | Component | Height | What's in it |
|---|---|---|---|
| Top bar | `src/components/AppHeader.tsx` | 56 px (`h-14`) | Org icon, name and role badge · the section menu · notifications and the account menu, on **one row** |
| Title row | `src/components/layout/PageHeader.tsx` | 64 px (`min-h-16`) | **Slot** · title (`h1`, 22 px bold) · optional badge · optional one line of facts (`meta`) · actions on the right |
| Page tabs | `PageHeader`'s `tabs` slot, `src/components/layout/PageTabs.tsx` | 40 px | Optional. **At most one row**, always below the title, aligned with it |
| Content | the screen | — | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4` on `bg-gray-50` |

-   **Section menu** (`NavigationMenu.tsx`): a segmented control centred in the top bar. Grey track (`bg-gray-100 border-gray-200`); the current section is a raised white pill (`text-sky-700 font-semibold shadow-sm`) with `aria-current="page"`. Below `lg` the labels hide; each button keeps its name through `aria-label` and a tooltip. Which sections a role sees: Viewers have no Dashboard, only Admins and Managers have Financials.
-   **The slot** is a 32 px square left of the title, always rendered, so the title starts at the same place on every page. On a top-level page it shows the section icon (`icon`, tinted with `iconClassName`, default `bg-sky-50 text-sky-700`). On a page you drill into it shows **Back** (`back={{ label: 'Back to Assets', onClick }}`): an outlined icon button whose `aria-label` and tooltip name where it goes. Back always goes here, never above the title or in the actions.
-   **Title**: a name, not a sentence. No description lines under it ("Manage your equipment inventory" is gone); `meta` is only for data, such as a gig's date and venue.
-   **Actions** go on the right of the title row. A "do something" choice (Add, Scan, Import) is a button there, not a tab.
-   **Tabs** use `PageTabsList` / `PageTabsTrigger` (underlined; active `border-sky-700 text-sky-700`), inside the page's `Tabs` root from `ui/tabs`, wrapping both the header and the content. When each tab is a route, set `activationMode="manual"`: with automatic activation a click fires `onValueChange` twice (mousedown and focus) and pushes the route twice. A choice inside a tab is a dropdown or filter, never a second row of tabs. The boxed `ui/tabs` `TabsList` is for in-content toggles only (Upcoming/Past, Month/Week).
-   **Section headers that span several routes** share one component so the title stays put: `EquipmentHeader.tsx` titles all five Equipment tabs (Assets, Kits, Out on gigs, Locations, Maintenance) "Equipment".
-   **No second level of tabs.** When a page used to need one, the choices became title-row actions (Equipment › Locations' **Print manifest**, Out on gigs' **Track a gig**, Financials › Purchases' **Scan invoices** and **Add purchase**, which open their own screens with **Back to Purchases**) or moved to where they're used (a gig's packing list is on the gig page). A view that prints swaps in place (Print manifest / Close manifest) rather than opening in a modal, so it prints cleanly.
-   **Editable titles**: `heading` replaces the title, badge and meta with custom content in the same place (the gig page's edit mode).
-   **Narrow content** (editors, Import, org screens): keep the header full width and left-align the narrower content with the title, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 *:max-w-4xl`, rather than centring it.
-   **Back labels** name the destination ("Back to Assets", "Back to Select Organization"). Use a bare "Back" only when Back is history-based and the destination isn't known (Starter categories, editing an organization). Import is opened from Gigs or Assets and its Back returns there (`/import?from=assets`).
-   **Every web screen uses the frame**, and no page has more than one row of tabs. The mobile PWA has its own layout.

### 2. Badges
`ui/badge.tsx` (`rounded-md border px-2 py-0.5 text-xs font-medium`), coloured from the config maps in `src/utils/supabase/constants.ts`. Use the map, never a hand-picked colour, so a status looks the same everywhere.

| Map | Values and classes |
|---|---|
| `GIG_STATUS_CONFIG` | Date Hold `bg-gray-100 text-gray-800`, Proposed `bg-blue-100 text-blue-800`, Booked `bg-green-100 text-green-800`, Completed `bg-purple-100 text-purple-800`, Cancelled `bg-gray-200 text-gray-500`, Settled `bg-indigo-100 text-indigo-800` (each with a matching `-300` border) |
| `ASSET_STATUS_CONFIG` | Active green, Inactive amber, Maintenance red, Disposed blue, Returned gray |
| `TRACKING_STATUS_CONFIG` | Checked Out sky, In Transit amber, On Site violet, In Warehouse emerald (`bg-*-50 text-*-700 border-*-200`) |
| `USER_ROLE_CONFIG` | Admin purple, Manager blue, Staff gray, Viewer light gray (the top bar's role badge) |

Tags are `Badge variant="secondary"`.

### 3. Cards
-   **Base**: `ui/card.tsx`, `bg-card text-card-foreground flex flex-col gap-6 rounded-xl border` (no shadow).
-   **Sections on a record page**: `GigSection` (below), which tightens the card to `p-4 gap-2.5`.
-   **Dashboard tiles**: `Card` with a bold muted label (`text-sm text-muted-foreground font-bold`) and label/value rows.

---

## UI Patterns: Record Pages (the gig page, #12)

The gig page (`src/components/gig/GigPage.tsx`) is the model for a record page: one page for viewing and editing, tabs, cards, and printouts. Mockups: the approved #12 design boards.

### 1. Page Header
-   The gig page uses the shared `PageHeader` (see "Page layout" above): **Back** in the slot ("Back to Gigs", or "Back to Calendar" when opened from it), the title, the status `Badge` as `badge`, and the date, venue and tags (`Badge variant="secondary"`) as `meta`.
-   **Actions** on the right: Print (`outline`), the primary Edit button, and a `MoreVertical` icon menu for Duplicate and Delete.
-   **Tabs** (Overview, Equipment, Financials, History) are `PageTabs` in the header's `tabs` slot.
-   **Content** width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, page background `bg-gray-50`.

### 2. Cards (`GigSection`)
-   `src/components/gig/view/GigSection.tsx`: a `Card` with `p-4 gap-2.5`.
-   Title row: `h2` `text-[15px] font-semibold`, an optional muted summary next to it (`text-xs text-muted-foreground`, e.g. "3 of 4 filled"), and right-aligned `actions` (e.g. the Columns picker).
-   Lay cards out on a `grid grid-cols-1 lg:grid-cols-3 gap-4 items-start`; a table card takes `lg:col-span-2` or the full row.
-   Empty content is a short italic muted line ("No notes"), not an empty-state panel.

### 3. Edit Mode (one edit for the whole page)
-   One **Edit** button puts the whole page into edit mode; there are no per-card edit modes and no Save/Cancel. Every field autosaves (`useAutoSave`), and **Done** (primary) waits for pending saves, then returns to view mode.
-   **Header in edit mode**: the background becomes `bg-sky-50 border-b-2 border-sky-700`, the title, status and tags become inputs in place (`PageHeader`'s `heading` slot, so the title doesn't move), and a metadata label `Editing` (`text-sky-800`) sits with the save state and Done in the actions. Nothing goes above the title.
-   **One save state** for the page, in the header (`EditSaveStatus` in `src/components/gig/edit/GigEditParts.tsx`), announced with `aria-live="polite"`:
    - Saving: `Loader2` spinner, "Saving…", `text-muted-foreground`.
    - Saved: `Check`, "All changes saved", `text-green-800`.
    - Error: `AlertCircle`, "Some changes didn't save", `text-red-700`.
-   Each autosaving part reports to the page's edit session (`useReportToEditSession`), so the header shows the combined state and Done can flush everything. New editable parts must do the same.

### 4. Columns Picker
-   For tables where viewers want different detail (staffing, participants, equipment): `ColumnsPicker` plus `useColumnVisibility` in `src/components/gig/view/`.
-   Trigger: a ghost `Columns` button with the `Columns3` icon in the card's `actions`, hidden when printing (`no-print`).
-   Menu: a `Popover` with the metadata label "Show columns" and a checkbox per optional column. Required columns aren't listed; `defaultHidden` columns start off.
-   The choice is remembered per table in this browser (`localStorage`, key `gw.columns.<table>`), and the page still works when storage is unavailable.

---

## UI Patterns: Print Layouts

Printouts are separate components rendered only for print, not the screen styled down. Examples: `src/components/gig/print/GigPrintSheet.tsx` (gig sheet, optional financials page) and the packing list header in `src/components/inventory/InventoryReports.tsx`.

-   **Show and hide**: wrap the screen UI in `no-print`; render the printout in `print-only hidden`. The `@media print` block in `globals.css` flips both.
-   **Ink only**: black on white (`text-black bg-white`), no fills or colour; emphasis by weight and rules. Sizes in points: body `10pt`, tables `9.5pt`, fine print `8.5pt`.
-   **Page header**: a kicker (`text-[8pt] uppercase tracking-[0.1em]`, e.g. "Packing list · Org name"), the title (`16–18pt` bold) and date on the left, counts or the print date on the right (`text-[8.5pt]`), then a `border-b-[3px] border-black` rule.
-   **Section heading**: `text-[10pt] font-bold uppercase tracking-[0.08em] border-b-[1.5px] border-black`.
-   **Tables**: rule each row (`border-b` in `#bbb`, header rule black) instead of drawing a grid; wrap the printout in `gig-print` so the print block's grid borders don't apply. Give each table an `aria-label`.
-   **Pages**: start an optional page with `break-before-page`. Pay and financials print only on their own page, and only when an Admin or Manager asks for it.
-   **Printing**: render the printout, wait until its data has loaded (`onReady`), then call `window.print()`.

---

## UI Patterns: Mobile (PWA)

Mobile screens live in `src/components/mobile/` and share the web app's tokens and Tailwind build.

### 1. Mobile Layout
-   **Shell**: `MobileLayout.tsx` on `.mobile-layout-root` (`globals.css`): a fixed, full-height grid (`100dvh`) of header, scrolling content and the bottom nav.
-   **Bottom nav**: 56 px, centred at `maxWidth: 480`, inline styles. Items Gigs, Scanning, Settings; Staff get Dashboard in place of Gigs. The active item is `var(--primary)` with a 10% `--primary` pill behind a 24 px icon; labels are `10px` bold uppercase.

### 2. Mobile Card Section
Sections on mobile details (Participants, Staff, Times, etc.).
-   **Class**: `Card` with `className="gap-0"`, content padding `p-3 pb-3`.
-   **Section label**: `text-[11px] font-semibold flex items-center gap-1.5` with a `w-3.5 h-3.5` icon, in `text-primary` or `text-muted-foreground` (not uppercase).

### 3. Row Items
-   **List**: rows in a `divide-y divide-border/50` container (staff, participants, financials on the mobile gig page).
-   **Row**: `flex items-center py-1.5 first:pt-0 last:pb-0`: an `11px` semibold label (`w-24`, coloured by its config map), then the value (`text-base font-medium`), then small action icons.

---

## UI Patterns: Common

### 1. Form Validation
- **Inline error**: `text-destructive text-[11px] font-medium mt-1` under the field (e.g. Sign Up's Confirm Password).
- **Feedback**: toasts from Sonner (`ui/sonner.tsx`, its default styling): `toast.success` / `toast.error`.

### 2. Empty States
- **In a card**: a short italic muted line ("No notes", "No schedule yet"), not a panel.
- **A whole list or report**: centred muted text, sometimes with a muted icon (e.g. "No active gigs with kit assignments found."). There's no single shared empty-state component yet (see `inspiration/` for the proposal).

### 3. Loading
- A centred `Loader2` spinner (`animate-spin`, `text-sky-500`/`text-muted-foreground`) for a page or panel; "Loading…" text in reports.
- `ui/skeleton.tsx` (`animate-pulse bg-accent rounded-md`) where a layout should hold its shape, e.g. the activity feed.

---

## UI Patterns: Smart Tables & Inline Editing
`src/components/tables/SmartDataTable.tsx` and `EditableCell.tsx`, used for Assets, Kits, Team, Purchases and other lists. Behaviour in detail: `docs/technical/SmartDataTable.md`.

### 1. Selection & Navigation
- **Selected cell**: a `border-2 border-primary` overlay (`absolute inset-0`), so the cell's content doesn't move.
- **Keyboard**: `Tab` moves to the next cell (every column), `Enter` starts or commits an edit. There are no arrow-key moves.

### 2. Inline Editor
- The cell turns into its editor in place (text, number, currency, date, select, pills); text matches the cell (`text-sm`).
- **Saving**: a small `Loader2` spinner while the save runs; edits aren't optimistic, so the cell shows the saved value.

### 3. Row Actions
- One `MoreHorizontal` ghost button (`h-8 w-8`, `text-muted-foreground hover:text-foreground`) at the end of the row opens a menu (`w-[160px]`).
- Default icons by action id: View `Eye`, Edit `Edit`, Duplicate `Copy`, Delete `Trash2`.

---

## Tailwind Configuration

-   Tailwind CSS v4, compiled by `@tailwindcss/vite` (see `vite.config.ts`). There is no `tailwind.config.js`.
-   Tokens and theme mapping: `src/styles/globals.css` (`:root`, `.dark`, `@theme inline`). The print rules are its `@media print` block.
-   The full default palette, `sky` included, is available; web and mobile screens share this one build.

---

## Checklist for a new or reworked screen
- [ ] `AppHeader`, then `layout/PageHeader`: the slot (section icon or Back named for its destination), a title that's a name, no description line, actions on the right.
- [ ] At most one row of tabs (`PageTabs`), below the title; route-driven tabs use `activationMode="manual"`. A "do something" is a title-row button, not a tab.
- [ ] Content in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4` on `bg-gray-50`; narrow forms left-aligned with `*:max-w-*`.
- [ ] Primary buttons `bg-sky-700 hover:bg-sky-800 text-white`; secondary `outline`. Active tabs and links `sky-700`.
- [ ] Status colours from the `*_CONFIG` maps; tags `Badge variant="secondary"`.
- [ ] Record pages: one Edit for the whole page, autosave, one save state in the header, Done waits for saves.
- [ ] Printouts: a separate `print-only` component, black on white, point sizes, ruled rows, and `no-print` on screen chrome.
- [ ] Mobile: `text-[14px]` body, `text-[11px]` section labels; the PWA keeps its own layout.
- [ ] Update the [component sheet](./component-sheet/index.html) when a shared component's look changes.
