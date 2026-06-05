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
-   **CSS**: `text-[10px] font-bold uppercase tracking-wider text-muted-foreground` (or specific semantic color)
-   **Purpose**: Clear categorization without distracting from data.

### Primary Data
-   **Web**: `text-sm font-medium text-foreground`
-   **Mobile**: `text-[14px] font-semibold text-foreground`

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
