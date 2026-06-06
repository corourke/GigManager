# Technical Specification: GigManager Design System Expansion

This specification details the technical approach for refining and expanding the GigManager Design System, focusing on visual consistency, high-quality UX, and comprehensive documentation of UI patterns.

## Technical Context
- **Framework**: React with Tailwind CSS.
- **Components**: shadcn/ui (Radix UI primitives).
- **Styling**: Utility-first CSS using Tailwind, semantic design tokens via CSS variables.
- **Design Reference**: `./docs/design/STYLE_GUIDE.md`, `./docs/product/development-plan/06_hierarchy-ui.md`.

## Implementation Approach

### 1. Style Guide Expansion (`STYLE_GUIDE.md`)
We will expand the existing style guide to include missing UI patterns.
- **Form Validation**:
    - **Inline**: Use `aria-invalid` and `destructive` tokens. Error messages should follow the metadata rule but in `text-destructive`.
    - **Global**: Standardize `sonner` toast configurations for success, error, and info states.
- **Empty States**:
    - Define a `GigListEmptyState` pattern: centered container, muted icon (size 12), `hero-title` variant for text, and `sky` primary action button.
- **Loading Skeletons**:
    - Standardize skeleton shapes using `src/components/ui/skeleton.tsx`.
    - Patterns for `GigCard`, `AccountingRow`, and `DashboardTile`.
- **Transitions**:
    - **Web**: Standard CSS transitions for hover/focus.
    - **Mobile**: Framer Motion or CSS transitions for "Slide-in" detail views and "Cross-fade" tab switches.

### 2. Component Sheet Perfection (`docs/design/mockups/component-sheet/index.html`)
The living component sheet will be updated to act as a definitive reference.
- **State Matrix**: Implement a grid view for each component showing Default, Hover, Focus, Active, Disabled, and Error states.
- **Hierarchy Components**:
    - **GigTreeNode**: Implementing connectors using pseudo-elements (`::before`, `::after`) and L-shaped borders.
    - **Inheritance Badge**: Small badge with `bg-sky-50` and `text-sky-600` for inherited values.
    - **Override Controls**: Revert buttons using `ghost` variant with sky accents.

### 3. High-Fidelity Mockups (`docs/design/mockups/`)
All mockups will be pure HTML/Tailwind files for fast iteration and clear reference.
- **Web Dashboard (`dashboard.html`)**:
    - Grid-based layout with high-density financial tiles.
    - Uses `tabular-nums` for financial data.
- **Gig Detail (`gig-detail.html`)**:
    - Split-pane layout (Sidebar Tree + Main Content).
    - Demonstration of inherited vs overridden data sections.
- **Financials View (`financials.html`)**:
    - Complex tables with sticky headers and groupable rows.
    - Visual linking indicators for ledger-to-source tracing.
- **Mobile PWA (`mobile-screens.html`)**:
    - Bottom tab bar with active state using `sky-500`.
    - Card-based layouts optimized for 44px tap targets.

## Source Code Structure Changes
- **`./docs/design/STYLE_GUIDE.md`**: Updated with new patterns.
- **`./docs/design/mockups/component-sheet/index.html`**: Expanded with state matrix and hierarchy components.
- **`./docs/design/mockups/web-screens/dashboard.html`**: Updated high-density view.
- **`./docs/design/mockups/web-screens/gig-detail.html`**: Updated with hierarchy integration.
- **`./docs/design/mockups/web-screens/financials.html`**: New settlement screen mockup.
- **`./docs/design/mockups/mobile-screens/mobile-screens.html`**: Updated PWA workflow mockups.

## Verification Approach
- **Linting**: Ensure all Tailwind classes are valid and follow existing patterns.
- **Visual Regression**: Manual check against the `STYLE_GUIDE.md` principles.
- **Responsiveness**: Verify mockups across common device widths (375px, 768px, 1280px, 1440px).
- **Accessibility**: Ensure high contrast for text and 44px minimum tap targets for mobile.
