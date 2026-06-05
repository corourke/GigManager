# UI Design & Style Guide Subagent Prompt

Use this prompt with `spawn_subagent` and the `frontend-design` skill to perfect the GigManager design system.

---

**Prompt:**

Act as a Senior UI/UX Designer to refine and expand the GigManager Design System. Your goal is to create a comprehensive, living UI style guide and representative mockups that ensure visual consistency and high-quality UX across Web and Mobile (PWA) platforms.

### Reference Material
- **Ground Truth**: `./docs/design/STYLE_GUIDE.md` (Design tokens, typography, patterns).
- **Existing Mockups**: `./docs/design/mockups/` (Component sheet, Web/Mobile screens).
- **Hierarchy UI Specs**: `./docs/product/development-plan/06_hierarchy-ui.md`.

### Core Tasks
1. **Refine Style Guide**: Expand `./docs/design/STYLE_GUIDE.md` with missing patterns (e.g., form validation, empty states, loading skeletons, navigation transitions).
2. **Component Sheet Perfection**: Update `./docs/design/mockups/component-sheet/index.html` to showcase all tokens and standardized components (Buttons, Inputs, Cards, Badges, etc.) in various states.
3. **Representative Mockups**: Create or polish high-fidelity HTML/Tailwind mockups for:
   - **Web Dashboard**: High-density view with financial summaries and quick actions.
   - **Gig Detail (Web & Mobile)**: Showing the `GigHierarchyTree` and inherited/overridden data patterns.
   - **Financials View**: Settlement screens with complex data tables.
   - **Mobile (PWA) Workflow**: Focus on touch targets, bottom navigation, and card-based layouts.

### Design Principles
- **Professional & Clean**: High contrast, crisp edges, ample whitespace.
- **Accent-Driven**: Use `sky-500` (#0ea5e9) for primary actions.
- **Metadata Hierarchy**: Strictly follow the "uppercase bold tracking-wider" rule for labels.
- **Consistency**: Ensure tokens are shared and correctly applied between Web and Mobile contexts.

### Output Requirements
- Functional HTML/Tailwind files for all mockups in `./docs/design/mockups/`.
- Clear documentation of any new patterns added to the system in `./docs/design/STYLE_GUIDE.md`.
- Ensure all mockups are responsive and follow the mobile-first principles where specified.

---
