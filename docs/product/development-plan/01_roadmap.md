# GigWrangler Product Roadmap

**Last Updated**: 2026-06-21

For functional requirements, see [Product Requirements](../requirements.md).
For market context, see [Competitive Analysis](02_competitive-analysis.md).

---

## 1. What We've Built

### Core Platform
- **Multi-tenant architecture** with RLS-enforced organization isolation — our strongest architectural differentiator
- **Gig lifecycle management**: full CRUD, status tracking (DateHold → Settled), duplication, tagging
- **Multi-act scheduling**: schedule entries (load-in, soundcheck, sets, etc.) within gigs, timeline UI
- **Equipment management**: assets with serial numbers, kits (logical + container), kit assignments to gigs, insurance tracking
- **Staff management**: role-based slots, assignments with status workflow (Invited → Confirmed/Declined), conflict detection
- **Single-ledger gig financials**: revenue/expense/labor tracking, profitability views, staff completion lifecycle, AI receipt scanning with auto-ledger entry
- **Change history**: audit trail for gigs, assets, and kits with actor snapshotting
- **Calendar**: month/week views with conflict detection (staff, equipment, venue), Google Calendar one-way sync
- **Data import**: CSV import for gigs (with auto-org creation) and assets (with purchase/kit linking)
- **Organizations**: shared profiles, multi-org membership, role-based access (Admin/Manager/Staff/Viewer)
- **Notifications**: email invitations, staff assignment alerts, gig reminders
- **Data tables**: sortable, filterable, column-customizable tables with in-place editing (SmartDataTable)
- **Attachments**: polymorphic file attachments on gigs, assets, purchases with org-scoped storage

### Mobile & PWA
- **PWA baseline**: manifest, service worker, installable, standalone mode
- **Mobile gig list**: card-based layout with filters, search, status badges
- **Mobile gig detail**: simplified read view with essential info
- **Quick-create gig**: streamlined mobile booking form
- **Staff dashboard**: upcoming assigned gigs with venue/contact quick links
- **Mobile barcode scanning**: camera-based scanning for equipment workflows

### Engineering Quality (June 2026 Remediation)
- **Security**: org-scoped attachment storage policies, ai-scan auth + rate limiting, CORS pinning, RLS hardening
- **Architecture**: Hono middleware on edge functions (auth/membership checks), react-router v7 (deep-linkable URLs), TanStack Query (server state caching)
- **Quality gates**: TypeScript strict mode, ESLint, GitHub Actions CI, Sentry error monitoring
- **Role-based UI gating**: canManage helper hides create/edit/delete affordances from Staff/Viewer roles
- **Repo hygiene**: stage-plot-app extracted to separate repo, build artifacts untracked

### In Testing
- **Financial improvements** (branch: `fin-improvements-913f`): purchase edit dialog, per-line gig assignment, document panel, asset panel navigation — awaiting user verification

---

## 2. Target Users & Gaps

GigWrangler serves five personas. See the [Competitive Analysis §3](02_competitive-analysis.md) for detailed positioning against Rentman, Current RMS, LASSO, BackOpsLive, and gig-manager.app.

| Persona | What We Offer Today | Biggest Gap |
|---|---|---|
| **Sound & Lighting Cos** | Gig management, equipment kits, staff scheduling, financials, multi-org collaboration | Quoting/invoicing, availability requests |
| **Production Companies** | Multi-act scheduling, financial P&L, multi-org collaboration | Hierarchical events, settlement workflows, vendor bid rollups |
| **Bands / Acts** | Gig visibility as shared participants, financial tracking | Settlement from band's perspective, rider management |
| **Venues** | Calendar views, gig participation, conflict detection | Booking portal, advance checklists, holds calendar |
| **Rental Houses** | Asset inventory, kits, insurance tracking | Shortage detection, subrental management, barcode workflows |

---

## 3. What's Next

### Sprint 3: Financial Workflows & Notifications
*Closes the biggest competitive gap identified in the competitive analysis.*

- [ ] Quoting / proposal generation (line items, total, PDF export)
- [ ] Settlement views for flat gigs (who owes whom, payment tracking)
- [ ] Act-specific settlement screen (band's perspective)
- [ ] Push notifications (Web Push API) for staff assignments and gig updates
- [ ] Complete user testing of `fin-improvements-913f` branch

### Sprint 4: Hierarchical Events
*Our unique differentiator — no competitor has this.*

- [ ] Hierarchy UI: tree view, progressive disclosure forms for parent/child gig creation
- [ ] Recursive inheritance for participants, equipment, staff across hierarchy
- [ ] Hierarchical conflict detection
- [ ] Financial rollups from child to parent gigs
- [ ] Hierarchical access control (parent access grants child access)

Technical foundation exists: `parent_gig_id` and `hierarchy_depth` columns are in the schema; SQL functions (`get_gig_hierarchy`, `get_effective_participants`, `get_effective_equipment`) are designed. See [Hierarchy Foundations](05_hierarchy-foundations.md) and [Hierarchy UI](06_hierarchy-ui.md).

### Sprint 5: Scale, Polish & Launch Readiness

- [ ] Offline sync finalization and conflict resolution UI
- [ ] Barcode scanning field testing (camera + Bluetooth HID)
- [ ] Performance optimization: virtualized lists, query optimization
- [ ] Load testing (5k+ gigs, 20k+ assets, 500+ concurrent users)
- [ ] Biometric auth (WebAuthn) and location services
- [ ] Onboarding flow, terms/privacy, billing/subscription
- [ ] Error monitoring hardening

### Backlog (prioritized by competitive analysis)
See [Competitive Analysis §6](02_competitive-analysis.md) for full gap prioritization.

| Priority | Feature | Rationale |
|---|---|---|
| High | Availability requests | Rentman, LASSO, gig-manager.app all have this |
| High | Shortage detection | Rentman, Current RMS — critical for rental/production |
| High | Recurring gigs | gig-manager.app, Rentman — common venue request |
| Medium | Advance checklists | gig-manager.app validates demand |
| Medium | Invoicing (formal) | All major competitors except BackOpsLive |
| Medium | Revenue forecasting | gig-manager.app has this |
| Medium | Accounting integrations | QuickBooks/Xero — Rentman, Current RMS, LASSO |
| Lower | Subrental management | Rentman, Current RMS |
| Lower | Repairs/maintenance tracking | Rentman, LASSO |
| Lower | Time tracking | LASSO, gig-manager.app |
| Lower | Crew ratings | gig-manager.app, LASSO |
| Lower | Public API | Rentman, Current RMS |
| Future | Run of show / rundown | LASSO, BackOpsLive |
| Future | Crew marketplace | LASSO only |

---

## 4. Strategic Priorities

1. **Close the financial workflow gap** — Every competitor has quoting and invoicing. Our single-ledger model is architecturally strong; we need the document generation layer.
2. **Ship hierarchical events** — Our unique differentiator. No competitor models parent-child events with recursive inheritance.
3. **Pursue underserved personas** — Bands and venues have no good options. gig-manager.app validates venue demand but lacks equipment management. Our multi-tenant model naturally serves both.
4. **Reach closed beta** — 3-5 friendly organizations testing multi-org collaboration. The security and quality work from the June 2026 remediation makes this feasible.

---

## 5. Success Criteria

- Flat gig financial management (quoting, settlement, notifications) complete before hierarchy work begins
- Hierarchical events operational for festivals and multi-venue events
- Closed beta with 3-5 organizations using multi-org collaboration
- Queries resolve in <200ms under load (5k+ gigs, 20k+ assets)
- Mobile PWA functional on iOS/Android with barcode scanning tested on physical devices
- Smooth offline sync with 100+ queued changes

---

## 6. Technical Reference Documents

| Document | Description |
|---|---|
| [Technical Spec](03_technical-spec.md) | Architecture overview, tech stack, delivery phases |
| [Mobile Development](04_mobile-development.md) | PWA config, offline sync, push notifications, warehouse mode |
| [Hierarchy Foundations](05_hierarchy-foundations.md) | SQL recursive CTEs, schema, inheritance functions |
| [Hierarchy UI](06_hierarchy-ui.md) | Tree component, progressive disclosure, form patterns |
| [Gig Financials Workflow](07_gig-financials-workflow.md) | Single-ledger design, profitability model, staff lifecycle |
| [Scale & Performance](08_scale-performance-roadmap.md) | Load testing, indexing, virtualization strategy |
| [Code & Product Review](../code-and-product-review-202606.md) | June 2026 review findings and remediation (completed) |
| [The Reporting Gap](../reporting-gap-202608.md) | Aug 2026 gap analysis: financial reporting is a placeholder; two doc status markers were wrong; June review follow-up |
