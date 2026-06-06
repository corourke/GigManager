# Product Requirements Document: GigManager Design System Expansion

**Goal**: Refine and expand the GigManager Design System to ensure visual consistency and high-quality UX across Web and Mobile (PWA) platforms.

## 1. Style Guide Refinement (STYLE_GUIDE.md)

The design system needs to be expanded with missing UI patterns to provide a complete reference for developers and AI agents.

### 1.1 Form Validation Patterns
- **Inline Validation**: Define state styles for error (red border + message), warning (amber), and success (green check).
- **Global Feedback**: Standardize toast notifications for action confirmation and system errors.

### 1.2 Empty States & Loading
- **Empty States**: Create a pattern for empty data containers (Icon + Title + Descriptive Text + Call to Action).
- **Loading Skeletons**: Define standard skeleton shapes for cards, data rows, and high-density dashboards to improve perceived performance.

### 1.3 Navigation Transitions
- **PWA Context**: Define mobile-centric transitions (e.g., slide-in for detail views, cross-fade for tab navigation).
- **Web Context**: Subtle fade/shift for page transitions.

---

## 2. Component Sheet Perfection (index.html)

Update the living component sheet to showcase all design tokens and standardized components in various states.

### 2.1 State Representation
Every component (Buttons, Inputs, Selects, Cards) must showcase the following states:
- Default
- Hover / Focus
- Active / Pressed
- Disabled
- Error / Invalid

### 2.2 Hierarchy Components
Add specific components defined in `06_hierarchy-ui.md`:
- **GigTreeNode**: Showing nesting, indentation, and connectors.
- **Inheritance Indicators**: Subtle blue badges and info icons for inherited data.
- **Override Controls**: "Revert to Parent" buttons and override indicators.

---

## 3. Representative Mockups

Create high-fidelity HTML/Tailwind mockups in `./docs/design/mockups/` that demonstrate the design system in action.

### 3.1 Web Dashboard (High-Density)
- **Financial Tiles**: Real-time summary of Revenue, Costs, and Profit using the accent-driven style.
- **Recent Activity**: High-density table of recent transactions and gig updates.
- **Quick Actions**: Floating or prominent header actions (e.g., "New Gig", "Scan Receipt").

### 3.2 Gig Detail (Web & Mobile)
- **Hierarchy Integration**: Sidebar or nested tree view showing the gig's position in a larger structure.
- **Data Inheritance**: Visual differentiation between local data and data inherited from a parent gig.
- **Resource Management**: Cards for staff and equipment showing rollups and assignments.

### 3.3 Financials View (Settlement)
- **Complex Data Tables**: Multi-column tables with grouping for "Labor", "Expenses", and "Revenue".
- **Two-Way Linking**: Visual cues for linked records (e.g., Ledger entry → Source Purchase).

### 3.4 Mobile (PWA) Workflow
- **Touch-First Design**: Minimum 44px tap targets.
- **Bottom Navigation**: Persistent tab bar for core navigation.
- **Card-Based Layouts**: Vertical stacking of data points optimized for scanning on small screens.

---

## 4. Design Principles & Constraints

- **Accent Primary**: `sky-500` (#0ea5e9) is the primary color for actions.
- **Metadata Rule**: All labels must follow `text-[10px] font-bold uppercase tracking-wider text-muted-foreground`.
- **Consistency**: The same design tokens must be applied to both Web and Mobile contexts to maintain brand identity.
- **Performance**: Mockups should be lightweight, using utility-first CSS (Tailwind).
