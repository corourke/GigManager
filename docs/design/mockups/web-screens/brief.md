# Design Brief: GigManager "Gig Detail" Mockup Page

## Objective
Create a complete, professional-grade, high-density, and highly responsive single-page HTML mockup for the GigManager **Gig Detail** page. This is used by event managers and coordinators to oversee the full lifecycle, structural hierarchy, staffing, equipment, financial status, and final settlement of an individual show within a broader project event.

---

## Target Audience
Professional production managers, tour managers, stage managers, and event operations team members who require highly detailed, high-density, fast-scrolling, and actionable event interfaces.

---

## Output Path
- `/Users/cameron/dev/GigManager/docs/design/mockups/web-screens/gig-detail.html`

---

## References
- Canonical CSS Shell / Theme structure: `./docs/design/mockups/web-screens/dashboard.html`
- Style Guide & Tokens: `./docs/design/STYLE_GUIDE.md`

---

## Aesthetic Direction
- **Vibe**: Clean, elite, high-density technical SaaS (reminiscent of Linear, Stripe, or Vercel).
- **Structure**: Sharp pixel-perfect grid borders, strict alignment, high information density, and generous metadata usage.
- **Accents**: Pure sky-blue (`#0ea5e9`) used elegantly for active indicators, primary call-to-actions, and interactive selection.
- **Modes**: Full light-mode and light/dark theme toggle, mirroring the exact toggle logic in `dashboard.html`.

---

## Theme & Design Tokens
Use the canonical variables as defined in `./docs/design/mockups/web-screens/dashboard.html`:
- `--background`: `#ffffff` (light) / `#09090b` (dark)
- `--foreground`: `#030213` (light) / `#f4f4f5` (dark)
- `--card`: `#ffffff` (light) / `#18181b` (dark)
- `--muted`: `#f4f4f5` (light) / `#27272a` (dark)
- `--muted-foreground`: `#71717a` (light) / `#a1a1aa` (dark)
- `--accent-sky`: `#0ea5e9`
- `--accent-sky-foreground`: `#ffffff`
- `--border`: `#e4e4e7` (light) / `#3f3f46` (dark)
- `--sky-bg`: `#f0f9ff` (light) / `#082f49` (dark)
- `--font`: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- `--sidebar-w`: `220px`
- `--header-h`: `64px`

---

## Typography & Text Styling
- **Sans-Serif Font**: Standard system sans-serif stack.
- **Metadata Rule**: All headers of cards, small sub-headings, table titles, and section markers MUST use:
  - Font Size: `10px`
  - Font Weight: `700` (Bold)
  - Letter Spacing: `0.1em` (Tracking-wider)
  - Case: UPPERCASE
  - Color: `--muted-foreground`
- **Primary Data**: 13px/14px medium/semibold.
- **Numbers & Currencies**: All financial numbers, hours, weights, and times MUST have the class `tabular-nums` applied and render in monospace-aligned style (`font-variant-numeric: tabular-nums`).

---

## Layout & Main Structure

### 1. App Shell (Layout)
- CSS Grid with two rows (`var(--header-h) 1fr`) and two columns (`var(--sidebar-w) 1fr`).
- Height: `100vh`, Overflow: `hidden`.

### 2. Header (64px, Spans Full Width)
Match `dashboard.html` header exactly:
- **Left**: 40x40px dark logo-mark with brief SVG suitcase/briefcase outline icon (white strokes), Organization Name `"Main Stage Productions"` (15px 700, -0.02em tracking), and a neat outline badge `"ADMIN"`.
- **Right**: Search icon button, notification bell icon button, 34x34px sky-blue avatar with text `"JD"`, and a small chevron icon.

### 3. Left Navigation Sidebar (220px)
- Lists navigation items: `Dashboard`, `Gigs`, `Calendar`, `Financials`, `Team`, `Inventory`, `Equipment`, `Settings` (matching the HTML links and SVGs from `dashboard.html`).
- The **`Gigs`** item must be marked `.active` with color `var(--accent-sky)`, background `var(--sky-bg)`, and a left active border `border-left: 2px solid var(--accent-sky)`. All others hover default.

### 4. Main Area Two-Pane Layout
The main area inside the app shell uses a flex or grid row, taking up 100% of the remaining height, and setting `overflow: hidden`.
It is split into two visual panes:
1. **Hierarchy Sidebar** (Left, `270px` width, border-right, background `var(--muted)` or custom background, `overflow-y: auto`).
2. **Content Pane** (Right, flex-1, `overflow-y: auto`, padding layout).

---

## Pane 1: Hierarchy Sidebar (270px)
- **Header**: Label `"GIG HIERARCHY"` (metadata label style, 16px padding).
- **Tree Structure**: A visual tree with actual HTML/CSS tree connector lines (using solid thin borders, e.g., left/top border line connectors).
- **Nodes**:
  - **Root node**: `"Summer Festival 2024"` (project icon, sky ring/border, cursor-pointer).
  - **Child node 1**: `└ "Load-In / Setup"` (sub-event, gray, standard border).
  - **Child node 2 (SELECTED)**: `└ "Show: Main Stage"` (the active detail page. Uses background `var(--accent-sky)`, text `white` or sky-500 bg, bold text, active marker).
  - **Child node 3**: `└ "Load-Out"` (sub-event, gray).
- **Node Style**: Clean, slightly rounded card borders (`border-radius: 8px`), padding `10px 12px`, font-size `12px`, with small SVG icon (calendar/stage/briefcase) on left.

---

## Pane 2: Content Pane (Right Area)
Divided into:
1. **Breadcrumbs Row**: Small gray text: `Gigs > Summer Festival 2024 > Show: Main Stage` (with the final section in bold). Padding `16px 32px`, size `12px`.
2. **Page Title Section**: Padding `20px 32px`, border-bottom.
   - Left side: Title `"Show: Main Stage"` (20px 700 weight), next to it a sky-blue status badge `"CONFIRMED"` (uppercase, 10px, bold tracking).
   - Below title: `"Jun 15, 2024  ·  Red Rocks Amphitheater  ·  8:00 PM – 11:30 PM"` (13px text, muted-foreground).
   - Right side: Secondary button `[Edit]` and Primary action button `[Actions (sky bg)]`.
3. **Tab Bar**: Horizontal tabs (`Overview`, `Staffing`, `Equipment`, `Financials`, `Settlement`).
   - Active tab: border-bottom 2px of `var(--accent-sky)`, text color `var(--accent-sky)`, font-weight 600.
   - Non-active tabs: color `var(--muted-foreground)`, subtle hover.
   - Padding `0 32px`, height is centered, margins `24px`.
4. **Tab Panels**: Single-page toggled panes using JavaScript `showTab(n)`.

---

## Active Tab Content Specification

### Tab 1: OVERVIEW (Active by Default)
Two-column grid (60% Left column / 40% Right column, Gap `24px`, padding `32px`):

#### Left Column Cards:
- **Venue Card**: Border, rounded-xl, padding 20px, margin-bottom 16px.
  - Header: `"VENUE"` metadata label.
  - Name: `"Red Rocks Amphitheater"` (16px 700).
  - Grid (2 columns):
    - *Address*: `"18300 W Alameda Pkwy, Morrison, CO"`
    - *Capacity*: `"9,525 seated"` (tabular-nums)
    - *Load-In*: `"Dock B, Gate 3"`
    - *Coordinator*: `"Lisa Park · +1 303-555-0420"`
- **Act Card**: Border, rounded-xl, padding 20px, margin-bottom 16px.
  - Header: `"ACT"` metadata label.
  - Name: `"The Mountain Echo"` (16px 700), Genre: `"Indie Folk / Americana"`
  - Agent: `"Marcus Webb, CAA · marcus@caa.com"`
  - Rider: `"Standard hospitality rider: 4 hotel rooms, catering for 12, 2x towels per dressing room"`
- **Notes Card**: Border, rounded-xl, padding 20px, margin-bottom 16px.
  - Header: `"NOTES"` with small link `"Edit"` (sky-600) on right.
  - Text: `"Pyrotechnics approved by venue for finale. Confirm with fire marshal on day. Stage manager to brief entire crew at 7:30am call. VIP area backstage requires wristbands - coordinate with venue."` (italic, 14px, muted-foreground).
- **Tags Row**: Label `"TAGS"` then pill badges: `"Main Stage"`, `"Outdoor"`, `"Festival"`, `"VIP Access"`, `"Pyrotechnics"`.
  - Pill: Rounded pill shape, border, px-3, py-1, font 11px, weight 500.
- **Attachments Card**: Border, rounded-xl, padding 20px, margin-bottom 16px.
  - Header: `"ATTACHMENTS"` with small ghost button `"Upload"` (sky) on right.
  - Row items:
    - `[PDF Icon] Stage-Plot-MainStage.pdf · 2.4 MB · Jun 2`
    - `[XLS Icon] Rider-TheEcho.xlsx · 180 KB · Jun 3`
    - `[IMG Icon] Venue-Map.png · 1.1 MB · Jun 5`
- **Inheritance & Policies Card**: Border, rounded-xl, padding 20px.
  - Header: `"INHERITANCE & POLICIES"` metadata label.
  - Row 1: `"Venue Curfew"`, next to it a small sky badge `"INHERITED"`. Description: `"11:45 PM MDT strictly enforced. $1k/min penalty."`. Actions: Ghost hover button `"Override"`.
  - Row 2 (OVERRIDDEN): `"Day Rate Adjustment"`, next to it an amber badge `"OVERRIDDEN"`. Description: `"$1,850.00 (was $1,200.00)"` with a line-through on `$1,200.00`. Actions: Ghost button `"Revert"`.
  - Overridden Row layout requirement: Left-border of `3px solid var(--accent-sky)` and padding-left 2px (as defined in `STYLE_GUIDE.md`).

#### Right Column Cards:
- **Financial Summary (Dark Card)**: Dark-foreground card, text white, rounded-2xl, padding 24px.
  - Header: `"FINANCIAL SUMMARY"` (slate-400 or lighter).
  - Main Revenue: `"Estimated Revenue: $28,000.00"` (3xl extrabold, tabular-nums).
  - Grid (2 columns):
    - *Projected Costs*: `"$12,400.00"` (tabular-nums)
    - *Net Margin*: `"$15,600.00"` (emerald color, tabular-nums)
  - Bottom: Ghost button `"Details & Ledger →"` with thin white border.
- **Key Times Card**: Border, rounded-xl, padding 20px, margin-top 16px.
  - Header: `"KEY TIMES"` metadata label.
  - Grid (2x2):
    - *Load-In*: `"8:00 AM"`
    - *Doors*: `"6:00 PM"`
    - *Showtime*: `"8:00 PM"`
    - *Curfew*: `"11:45 PM"`
  - Each item: styled in a light grey box (`bg: var(--muted)`), metadata label, time value in bold (tabular-nums).
- **Primary Contacts Card**: Border, rounded-xl, padding 20px, margin-top 16px.
  - Header: `"PRIMARY CONTACTS"` metadata label.
  - Rows:
    - *Sarah Miller*: Avatar `SM`, name, role `"Stage Manager"`, phone `"+1 303-555-0123"`.
    - *Robert King*: Avatar `RK`, name, role `"Head Rigger"`, phone `"+1 303-555-0987"`.

---

## Active Tab Content Specification

### Tab 2: STAFFING (Hidden by Default)
Padding: `24px 32px`.
- **Top Stats Bar**: Displays totals: `12 Assigned  ·  96.5h Total  ·  $14,250 Est. Cost  ·  10 Confirmed` in clear tabular-nums.
- **Actions Row (Right)**: Button `[Export CSV]` and `[+ Add Staff Member (sky primary)]`.
- **High Density Table**:
  - Headers: `NAME`, `ROLE`, `CALL TIME`, `WRAP`, `HRS`, `RATE`, `TOTAL`, `STATUS`.
  - Content Rows (8 rows):
    1. Sarah Miller · Stage Manager · 7:00 AM · 12:00 AM · 17h · $85 · $1,445 · Confirmed (green badge)
    2. Robert King · Head Rigger · 6:00 AM · 8:00 PM · 14h · $75 · $1,050 · Confirmed (green badge)
    3. James Osei · Audio Engineer · 8:00 AM · 11:30 PM · 15.5h · $90 · $1,395 · Confirmed (green badge)
    4. Maria Chen · Lighting Director · 9:00 AM · 11:45 PM · 14.75h · $80 · $1,180 · Confirmed (green badge)
    5. Tom Walsh · Stage Hand · 6:00 AM · 9:00 PM · 15h · $35 · $525 · Pending (amber badge)
    6. Alex Rivera · Stage Hand · 6:00 AM · 9:00 PM · 15h · $35 · $525 · Pending (amber badge)
    7. Donna Ford · Wardrobe · 10:00 AM · 11:00 PM · 13h · $55 · $715 · Confirmed (green badge)
    8. Gary Boon · Security Lead · 2:00 PM · 12:00 AM · 10h · $65 · $650 · Confirmed (green badge)
  - Badge style: `.status-pill` (round-full, px-2, py-0.5, font-weight 700, 11px uppercase).
    - *Confirmed*: bg `#dcfce7`, text `#15803d`
    - *Pending*: bg `#fef9c3`, text `#854d0e`

---

### Tab 3: EQUIPMENT (Hidden by Default)
Padding: `24px 32px`.
- **Top Stats Bar**: `42 Items  ·  3 Categories  ·  1,240 kg  ·  All Allocated`
- **Actions Row (Right)**: `[Export List]`, `[+ Add Item (sky primary)]`
- **Tables by Category**: Grouped with distinct section bars (bold uppercase 12px, bg `var(--muted)` with expand chevron).
- **Categories & Items**:
  - **AUDIO** (18 items, 580 kg)
    - d&b J-Series Speaker | 24 ea | AUDIO-01 | 28 kg ea | Allocated
    - DiGiCo SD12 Console | 2 ea | AUDIO-02 | 34 kg ea | Allocated
    - Sennheiser IEM System | 6 sets | AUDIO-03 | 8 kg set | Allocated
    - BSS Signal Processor | 4 ea | AUDIO-04 | 5 kg ea | Allocated
    - Cabling & Accessories | 1 lot | AUDIO-05 | 45 kg | Allocated
  - **LIGHTING** (15 items, 340 kg)
    - LD Systems Moving Head | 12 ea | LIGHT-01 | 18 kg ea | Allocated
    - Chauvet Strike 4 | 8 ea | LIGHT-02 | 6 kg ea | Allocated
    - Dimmer Rack 24ch | 2 ea | LIGHT-03 | 28 kg ea | Allocated
    - Cable Truss 3m | 12 ea | LIGHT-04 | 12 kg ea | Allocated
  - **STAGING** (9 items, 320 kg)
    - 4'×8' Stage Deck | 20 ea | STAGE-01 | 14 kg ea | Pending (amber status)
    - Stage Leg 24" | 40 ea | STAGE-02 | 2.5 kg ea | Pending (amber status)
    - Stair Unit | 4 ea | STAGE-03 | 18 kg ea | Allocated
- **Columns**: `ITEM`, `QTY`, `UNIT`, `CASE #`, `WEIGHT`, `STATUS`

---

### Tab 4: FINANCIALS (Hidden by Default)
Padding: `24px 32px`.
- **Top Summary Stats Bar**: `Revenue $28,000 − Expenses $12,240 = Net $15,760` (prominent large value, tabular-nums).
- **Actions Row (Right)**: `[+ Add Revenue]`, `[+ Add Expense (sky primary)]`
- **Revenue Items Table**:
  - Header: `"REVENUE ITEMS"` (metadata style).
  - Columns: `TYPE`, `DESCRIPTION`, `AMOUNT`, `INVOICED`, `RECEIVED`, `STATUS`.
  - Rows:
    1. Performance Fee | Contracted show fee | $18,000 | Yes | Yes | Paid (green)
    2. Merchandise | 20% gross merch sales | $3,200 | Yes | Pending | Pending (amber)
    3. Sponsorship | Stage naming rights | $5,000 | Yes | Yes | Paid (green)
    4. Hospitality Rider | Venue covers rider costs | $1,800 | No | — | Not Invoiced (gray)
  - Subtotal row at bottom: `Subtotal: $28,000 | Received: $23,000` (tabular-nums).
- **Expense Items Table**:
  - Header: `"EXPENSE ITEMS"` (metadata style, margin-top 32px).
  - Columns: `CATEGORY`, `DESCRIPTION`, `VENDOR`, `AMOUNT`, `RECEIPT`.
  - Rows:
    1. Labor | Stage Manager | Sarah Miller | $1,445 | ✓ (green check)
    2. Labor | Head Rigger | Robert King | $1,050 | ✓ (green check)
    3. Labor | Audio Engineer | James Osei | $1,395 | ✓ (green check)
    4. Rental | PA System | SoundCo Inc. | $3,200 | ✓ (green check)
    5. Rental | Lighting Rig | LightPro | $2,400 | ⚠ Missing (red warning icon / text)
    6. Transport | Truck Hire x3 | FastFreight | $1,800 | ✓ (green check)
    7. Hospitality | Catering | Venue Catering | $950 | ✓ (green check)
  - Subtotal row at bottom: `Subtotal: $12,240 · Warning badge "1 receipt missing"` (amber style).

---

### Tab 5: SETTLEMENT (Hidden by Default)
Padding: `24px 32px`.
- **Top Status Bar**: Status `"SETTLEMENT PENDING"` (amber badge, uppercase), `"Settlement Date: —"`. Right Action: `[Mark as Settled (sky primary)]`.
- **Three-Column Reconciliation Summary Cards**:
  1. *Total Revenue*: `$28,000 contracted vs $26,200 received` — variance amber `-$1,800` (tabular-nums).
  2. *Total Expenses*: `$12,240 actual vs $14,250 estimated` — variance green (under budget) (tabular-nums).
  3. *Net Settlement*: `$13,960` (prominent bold value, tabular-nums).
- **Revenue Reconciliation Table**:
  - Section title: `"REVENUE RECONCILIATION"` (metadata style).
  - Columns: `ITEM`, `CONTRACTED`, `RECEIVED`, `VARIANCE`, `STATUS`.
  - Rows:
    1. Performance Fee | $18,000 | $18,000 | $0 | ✓ Settled (green)
    2. Merchandise | $3,200 | $1,400 | -$1,800 (red) | Pending (amber)
    3. Sponsorship | $5,000 | $5,000 | $0 | ✓ Settled (green)
    4. Hospitality Rider | $1,800 | $1,800 | $0 | Venue Credit (gray)
- **Labor Reconciliation Table**:
  - Section title: `"LABOR RECONCILIATION"` (metadata style, margin-top 24px).
  - Columns: `STAFF MEMBER`, `ROLE`, `EST. HRS`, `ACT. HRS`, `RATE`, `TOTAL`.
  - Rows matching the first 3 staff members:
    1. Sarah Miller | Stage Manager | 18h | 17h | $85 | $1,445
    2. Robert King | Head Rigger | 15h | 14h | $75 | $1,050
    3. James Osei | Audio Engineer | 16h | 15.5h | $90 | $1,395
    - and an additional subtotal indicator.
- **Adjustments Section**:
  - Section title: `"ADJUSTMENTS"` (metadata style, margin-top 24px) with small `[+ Add Adjustment]` button.
  - Empty state: Gray italicized text `"No adjustments recorded."` with a `+ add adjustment` link.
- **Settlement Total Bar**:
  - Bottom bar, margin-top 24px, border-top, padding 16px, background highlight.
  - Text: `Revenue Received $26,200 − Total Expenses $12,240 = Net Due $13,960` in large font.
  - Actions: `[Download PDF (ghost btn)]` and `[Mark as Settled (sky primary)]`.

---

## What Makes It Memorable
1. **Interactive Client-side Tab Toggling**: Flawless switching of all 5 high-fidelity dashboards inside a unified layout.
2. **Visual Hierarchy Tree Sidebar**: High-detail CSS tree connectors that render nested lifecycles seamlessly, matching the dark/light mode toggle.
3. **Visual Inheritance & Override Flow**: Interactive demonstrate-ready design illustrating how parent/child event variables work, using sky-blue vertical indicators and precise status badges.
4. **Interactive Dark Mode Toggle**: Floating sun/moon toggle with local storage persistence matching `dashboard.html` exactly.

---

## Technical Instructions for Implementation Agent
- Ensure pure vanilla CSS & HTML — all icons must be standard inline SVGs (no external icon fonts or external packages).
- Avoid any placeholder texts or abbreviated "..." rows. Every single list, table, or stat card must be populated with realistic data.
- Ensure all financial data columns align perfectly with `tabular-nums` class.
- The `showTab(n)` JavaScript function must be robustly written to toggle visibility, update active states on buttons, and run instantly.
- Test both light and dark modes to make sure text is fully readable in both themes.
