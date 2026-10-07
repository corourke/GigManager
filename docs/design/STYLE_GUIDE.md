# GigManager Design System & Style Guide

This document serves as the "Ground Truth" for the look and feel of the GigManager application (Web & Mobile). AI Agents and humans should refer to this guide to ensure visual consistency across the platform.

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
| `--destructive` | `#d4183d` | `bg-destructive`, `text-destructive` | Delete actions, errors |
| `--border` | `rgba(0, 0, 0, 0.1)` | `border-border` | Standard border |
| `--input-background` | `#f3f3f5` | `bg-input-background` | Input fill |
| `--radius` | `0.625rem` | `rounded-md`, `rounded-lg` … | Corner radius base |

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

### Metadata Labels (Metadata Rule)
Use for headers of sections, field labels, or secondary status.
-   **CSS**: `text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground` (or specific semantic color)
-   **Purpose**: Clear categorization without distracting from data.

### Primary Data
-   **Web**: `text-sm font-medium text-foreground`
-   **Mobile**: `text-[14px] font-semibold text-foreground`

### Interaction States
All interactive elements (buttons, inputs, links) must have defined states:
- **Hover**: Subtle shift in background (e.g., `bg-muted/80`, `hover:bg-sky-800` on a primary button).
- **Focus**: the shadcn/ui components' own ring (`focus-visible:ring-ring/50 focus-visible:ring-[3px]`); don't remove it. Custom controls match it.
- **Active**: Slight scale down (`scale-[0.98]`) or deeper background color.
- **Disabled**: `opacity-50 cursor-not-allowed grayscale-[0.5]`.

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
-   **No second level of tabs.** When a page used to need one, the choices became title-row actions (Equipment › Locations' **Print manifest**, Out on gigs' **Track a gig**) or moved to where they're used (a gig's packing list is on the gig page). A view that prints swaps in place (Print manifest / Close manifest) rather than opening in a modal, so it prints cleanly.
-   **Editable titles**: `heading` replaces the title, badge and meta with custom content in the same place (the gig page's edit mode).
-   **Narrow content** (editors, Import, org screens): keep the header full width and left-align the narrower content with the title, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 *:max-w-4xl`, rather than centring it.
-   **Back labels** name the destination ("Back to Assets", "Back to Select Organization"). Use a bare "Back" only when Back is history-based and the destination isn't known (Starter categories, editing an organization). Import is opened from Gigs or Assets and its Back returns there (`/import?from=assets`).
-   **Every web screen uses the frame**, and no page has more than one row of tabs. The mobile PWA has its own layout.

### 2. Inline Stats (Dashboard/Summary)
Used for financial summaries or key metrics.
-   **Container**: `flex items-baseline gap-1`
-   **Value**: `text-2xl font-bold tracking-tight text-foreground`
-   **Label**: `text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5`

### 3. Data Cards
-   **Class**: `rounded-xl border bg-card text-card-foreground shadow-sm`
-   **Header**: Bold title with optional icon.

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
-   **Container**: `min-h-screen bg-muted/30`
-   **Content**: Max width `max-w-md` (centered on larger screens).

### 2. Mobile Card Section
Standardized section for mobile details (Participants, Staff, Times, etc.).
-   **Class**: `Card` with `className="gap-0"`
-   **Content Padding**: `p-3 pb-3`
-   **Section Label**:
    ```tsx
    <p className="text-[11px] font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-widest mb-2">
      <Icon className="w-3.5 h-3.5" />
      LABEL
    </p>
    ```

### 3. Row Items
-   **Container**: `py-2 border-b border-border/40 last:border-0 last:pb-0`
-   **Structure**: Label (top), Data (bottom).

---

## UI Patterns: Common

### 1. Form Validation
- **Inline Error**: `text-destructive text-[11px] font-medium mt-1`. Use for field-specific errors.
- **Input State**: Error fields should have `border-destructive focus-visible:ring-destructive`.
- **Global Feedback**: Use Toasts (Sonner) for form submission status.
    - **Success**: Sky icon/accent.
    - **Error**: Destructive icon/accent.

### 2. Empty States
Used when a list, dashboard, or search result has no data.
- **Container**: `flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/10`
- **Icon**: `text-muted-foreground/40 w-12 h-12 mb-4`
- **Title**: `text-lg font-semibold text-foreground`
- **Description**: `text-sm text-muted-foreground max-w-[300px] mb-6`
- **CTA**: Primary button (`bg-sky-700 hover:bg-sky-800 text-white`).

### 3. Loading Skeletons
Use for progressive loading of data-heavy views.
- **Base Class**: `animate-pulse bg-muted rounded-md`
- **Stat Skeleton**: A `h-8 w-24` rectangle for values, `h-3 w-16` for labels.
- **Card Skeleton**: A container with a `h-4 w-1/3` header and `h-20` body.

### 4. Navigation Transitions
- **Web**: Instant or 150ms fade-in for page content to maintain high-density speed.
- **Mobile (PWA)**: 
    - **Forward**: Slide from right (`duration-300`).
    - **Backward**: Slide to left (`duration-300`).
    - **Bottom Nav**: Persistent; icons scale or change color to `sky-500` when active.

---

## UI Patterns: Hierarchy & Inheritance
Specific to the GigHierarchy system.

### 1. Inheritance Indicator
- **Badge**: `text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-sm`
- **Label**: "Inherited" or "Parent Value".
- **Usage**: Place next to field labels or in row items.

### 2. Override State
- **Visual**: Highlight overridden fields with a subtle `border-l-2 border-sky-500 pl-2`.
- **Action**: Provide a "Revert" button (`text-sky-600 hover:underline text-[10px] uppercase font-bold`).

---

## UI Patterns: Smart Tables & Inline Editing
Used for high-density data management (e.g., Gig Accounting, Kit Lists).

### 1. Selection & Navigation
- **Selected Cell**: `box-shadow: inset 0 0 0 2px #0ea5e9` (sky-500) with `bg-sky-500/10`.
- **Keyboard**: `Tab` moves horizontally, `Enter` moves vertically.

### 2. Inline Editor
- **Active State**: The cell becomes a borderless input. Text should not shift visually.
- **Typography**: Matches the primary data style (`text-sm font-medium`).
- **Saving State**: Show a small spinner (`Loader2`) if the operation takes > 200ms.

### 3. Row Actions
Standardized set of actions at the end of a row.
- **Grouped pattern**: Use a subtle container (`bg-muted`, `rounded-lg`) that reveals/becomes prominent on row hover.
- **Dropdown pattern**: For high-density tables, keep 1-2 primary actions visible and move the rest into a `MoreHorizontal` menu.
- **Sizing**: Use 26-28px buttons with 14px icons for a precise, professional feel.
- **Icons**:
    - **View**: `Eye` icon (`text-muted-foreground`, hover `text-sky-600`).
    - **Edit**: `Edit` icon (`text-muted-foreground`, hover `text-sky-600`).
    - **Duplicate**: `Copy` icon (`text-muted-foreground`, hover `text-sky-600`).
    - **Notes**: `StickyNote` icon (`text-muted-foreground`, hover `text-sky-600`).
    - **Delete**: `Trash2` icon (`text-muted-foreground`, hover `text-destructive`).

---

## Tailwind Configuration

-   Tailwind CSS v4, compiled by `@tailwindcss/vite` (see `vite.config.ts`). There is no `tailwind.config.js`.
-   Tokens and theme mapping: `src/styles/globals.css` (`:root`, `.dark`, `@theme inline`). The print rules are its `@media print` block.
-   The full default palette, `sky` included, is available; web and mobile screens share this one build.

---

## Implementation Checklist for AI Agents
- [ ] Primary buttons: `bg-sky-700 hover:bg-sky-800 text-white`. Active tabs and links: `sky-700`.
- [ ] Ensure all metadata labels are `uppercase tracking-wider font-bold`.
- [ ] Use `border-border/40` for subtle internal dividers.
- [ ] Mobile: Prefer `text-[14px]` for body text and `text-[11px]` for headers.
- [ ] Web: Use standard shadcn/ui component patterns with token overrides.
- [ ] Record pages: one Edit for the whole page, autosave, one save state in the header, Done waits for saves.
- [ ] Printouts: a separate `print-only` component, black on white, point sizes, ruled rows, and `no-print` on screen chrome.
