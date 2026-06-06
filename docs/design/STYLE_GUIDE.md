# GigManager Design System & Style Guide

This document serves as the "Ground Truth" for the look and feel of the GigManager application (Web & Mobile). AI Agents and humans should refer to this guide to ensure visual consistency across the platform.

## Design Principles
1.  **Professional & Clean**: High contrast, crisp edges, and ample whitespace.
2.  **Information Density**: High density for Web (admin/dashboard), optimized for legibility and tap targets for Mobile.
3.  **Accent-Driven**: Use `sky` (blue) as the primary action and focus color.
4.  **Semantic Hierarchy**: Use bold uppercase labels for metadata and specific font weights for primary data.

---

## Design Tokens (CSS Variables)

Tokens are defined in `./src/styles/globals.css` and mapped to Tailwind configurations.

### Colors
| Token | Value (Hex/HSL) | Description |
| :--- | :--- | :--- |
| `--background` | `hsl(0 0% 100%)` | Main page background |
| `--foreground` | `hsl(222.2 84% 4.9%)` | Primary text color |
| `--muted` | `hsl(210 40% 96.1%)` | Secondary backgrounds |
| `--muted-foreground` | `hsl(215.4 16.3% 46.9%)` | Secondary/metadata text |
| `--accent-sky` | `#0ea5e9` | Primary action/highlight color |
| `--accent-sky-foreground` | `#ffffff` | Text on sky backgrounds |
| `--border` | `hsl(214.3 31.8% 91.4%)` | Standard border color |

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
- **Hover**: Subtle shift in background (e.g., `bg-muted/80`) or opacity (0.9).
- **Focus**: `ring-2 ring-sky-500 ring-offset-2 outline-none` (Web).
- **Active**: Slight scale down (`scale-[0.98]`) or deeper background color.
- **Disabled**: `opacity-50 cursor-not-allowed grayscale-[0.5]`.

---

## UI Patterns: Web

### 1. App Header
-   **Style**: Bordered bottom, background blur.
-   **Height**: `h-14` (56px).
-   **Content**: Title on left, actions/user on right.

### 2. Inline Stats (Dashboard/Summary)
Used for financial summaries or key metrics.
-   **Container**: `flex items-baseline gap-1`
-   **Value**: `text-2xl font-bold tracking-tight text-foreground`
-   **Label**: `text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5`

### 3. Data Cards
-   **Class**: `rounded-xl border bg-card text-card-foreground shadow-sm`
-   **Header**: Bold title with optional icon.

---

## UI Patterns: Mobile (PWA)

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
    - **Success**: Sky-500 icon/accent.
    - **Error**: Destructive icon/accent.

### 2. Empty States
Used when a list, dashboard, or search result has no data.
- **Container**: `flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/10`
- **Icon**: `text-muted-foreground/40 w-12 h-12 mb-4`
- **Title**: `text-lg font-semibold text-foreground`
- **Description**: `text-sm text-muted-foreground max-w-[300px] mb-6`
- **CTA**: Primary `sky` button (`bg-sky-500 text-white`).

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
- **Selected Cell**: `box-shadow: inset 0 0 0 2px var(--accent-sky)` with `bg-sky-500/10`.
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

### Web (`./tailwind.config.js`)
-   Uses `@tailwindcss/vite` for live compilation.
-   Includes `sky` as a primary color palette.

### Mobile (`./stage-plot-app/tailwind.config.js`)
-   Synced with Web tokens.
-   Extends `colors` with `sky` and semantic variables.

---

## Implementation Checklist for AI Agents
- [ ] Use `sky` for primary actions (buttons, active links).
- [ ] Ensure all metadata labels are `uppercase tracking-wider font-bold`.
- [ ] Use `border-border/40` for subtle internal dividers.
- [ ] Mobile: Prefer `text-[14px]` for body text and `text-[11px]` for headers.
- [ ] Web: Use standard shadcn/ui component patterns with token overrides.
