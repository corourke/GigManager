# Design System: Tailwind Build Integration and UI Token Refactoring

## Summary

Migrated from a static pre-compiled `src/index.css` (Tailwind v4 snapshot) to a live-compiled pipeline using `@tailwindcss/vite`. Updated all semantic design tokens and refactored components to use token-based color classes instead of literal Tailwind color utilities.

## Steps

### [x] Step 1: Vite / Tailwind Build Pipeline
- Installed `@tailwindcss/vite` (dev dependency)
- Added `tailwindcss()` plugin to `vite.config.ts` (before `react()`)
- Rewrote `src/styles/globals.css` with `@import "tailwindcss"` at top, plus all custom CSS (utilities, mobile layout, print styles)
- Updated `src/main.tsx` to import `./styles/globals.css` instead of `./index.css`

### [x] Step 2: Design Token Alignment (Web)
- Updated `--primary` to `#0284c7` (sky-600, the brand blue used throughout the app)
- Updated `--primary-foreground` to `#ffffff`
- Dark mode `--primary` set to `oklch(0.698 0.139 214.35)` (sky-400 equivalent)
- Updated `--sidebar-primary` to match

### [x] Step 3: Design Token Alignment (Mobile — stage-plot-app)
- Added semantic color tokens to `stage-plot-app/tailwind.config.js` theme extend
- Added `:root` and `.dark` CSS variable definitions to `stage-plot-app/global.css`

### [x] Step 4: Web UI Refactoring — AppHeader & Dashboard
- `AppHeader.tsx`: replaced `bg-white`→`bg-background`, `border-gray-200`→`border-border`, `bg-sky-500`→`bg-primary`, `text-white`→`text-primary-foreground`, `bg-sky-100 text-sky-700`→`bg-primary/10 text-primary`, `text-gray-500`→`text-muted-foreground`, `text-red-600`→`text-destructive`
- `Dashboard.tsx`: replaced `bg-gray-50`→`bg-muted/30`, all `text-gray-*`→`text-foreground`/`text-muted-foreground`, `text-sky-*`→`text-primary`, error state colors→`destructive` tokens

### [x] Step 5: Web UI Refactoring — Gig Financials
- `GigAccountingSummaryBar.tsx`: replaced `text-gray-500`→`text-muted-foreground`, `text-gray-900`→`text-foreground`

### [x] Step 6: Mobile UI Refactoring
- `MobileLayout.tsx`: replaced hardcoded `#0284c7`→`var(--primary)`, `#ffffff`→`var(--primary-foreground)`, `rgba(2,132,199,0.1)`→`color-mix(in srgb, var(--primary) 10%, transparent)`, `bg-sky-100 text-sky-700`→`bg-primary/10 text-primary`
- `MobileGigDetail.tsx`: replaced all `sky-*` classes with `primary` tokens, `red-*` with `destructive` tokens, input focus ring updated
- `MobileGigFinancials.tsx`: replaced `text-sky-500`→`text-primary`

### [x] Step 7: SmartDataTable UX Improvements
- Added resizable columns with drag handles on column header edges; widths persist in localStorage via `useTableState`
- Set 80px minimum column width to prevent header text/icon overlap; reduced header font to `text-xs` and tightened gaps
- Replaced individual row action buttons (view/edit/duplicate/delete) with a single `⋯` dropdown menu, reducing the actions column from 120px to 48px
- Updated `Table` component to forward refs for resize measurement
- Updated test mocks and row-actions test to work with dropdown pattern

## Verification

`npm run build && npm run test:run` — **62 test files, 523 tests: all passed** ✓
