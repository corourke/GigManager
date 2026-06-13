# Deferred: Role-Based UI Gating (Viewer/Staff)

**Status:** Deferred (surfaced during Phase 6 smoke testing, June 2026). Frontend-only; pairs naturally with the Phase 7 component work since it touches the same screens.

**Context:** The data layer is now correctly enforced — RLS + the `create_gig_complex` role check + the server middleware deny privileged actions to Viewers/Staff (migration `20260613000000`). So this is **UI hygiene, not a data-exposure fix**: today a Viewer still *sees* buttons that fail when clicked and can navigate to screens that then error or come back empty. This task hides/disables those affordances by role.

**Approach:** Gate on `userRole` (already available in the app). Hiding is preferred; disabling (with a tooltip) is acceptable where hiding is awkward. The privileged roles are **Admin/Manager**; **Staff/Viewer** are read-only (Staff additionally can act on their own staff assignments, per the security model).

## Requirements (from smoke test)

- **Dashboard:** a Viewer currently lands on the dashboard and sees `Insufficient permissions` (the endpoint is Admin/Manager/Staff only). Either route Viewers away from the dashboard (they already land on the gig list on org-select — make it consistent on direct nav/reload) **or** render a graceful Viewer-appropriate state instead of a raw error.
- **Gigs list:** hide **New Gig** and **Import** buttons. Hide **Edit / Duplicate / Delete** row actions.
- **Gig detail:** hide **Edit** and **Duplicate**. In Staff Assignments: hide **Finalize All** and **Add Staff Slot**. Hide the Attachments **Upload** button.
- **Financials:** hide the entire **Financials** menu item.
- **Assets list:** hide **Upload Invoice**, **Add Asset**, **Import**. In the actions column, hide **Duplicate** and **Delete**.
- **Asset detail, Kits list, Kit detail:** repeat the same pattern — hide Add / Edit / Duplicate / Delete / Upload affordances for Viewers.

## Notes
- General principle: any create/edit/delete/upload/import affordance is Admin/Manager-only; read affordances stay for all members.
- Keep the gating in one place where possible (a `canManage` helper from `userRole`) so it's consistent and testable.
- The backend already rejects these actions, so this is defense-in-depth at the UI layer + UX (don't show what you can't do).
