# GigManager Development Roadmap

## Overview

This document serves as the overview and index for the GigManager development plan. It provides strategic context — who our users are, where the gaps exist, and how we plan to close them — then links to the detailed technical documents that specify the implementation.

For functional requirements and business rules, see [Product Requirements](../requirements.md).

**Last Updated**: 2026-01-18

---

## 1. Organizational Persona Analysis

GigManager's multi-tenant architecture must cater to the distinct workflows of different event participants. This analysis identifies the gaps in current functionality for each persona.

### 1.1 Sound & Lighting (Production Services)
- **Primary Need**: Precise gear tracking and technical staffing.
- **Workflow**: Receive bid requests, build kits, manage conflicts, assign specialized staff, generate pack lists/stage plots.
- **Gap**: Better kit management, barcoding, and visual conflict detection.

### 1.2 Bands / Acts
- **Primary Need**: Logistics and financial settlement for individual performances.
- **Workflow**: Manage tour dates, track venues/riders, track settlement, share stage plots.
- **Gap**: Financial settlement tools and streamlined rider management.

### 1.3 Production Companies (Event Producers)
- **Primary Need**: High-level coordination of multiple vendors and complex financials using hierarchical gig structures.
- **Workflow**: Create master gigs with sub-gigs (e.g., Festival with multiple stages). Manage shared resources across the event hierarchy.
- **Gap**: Robust hierarchical gig implementation to handle parent/child relationships seamlessly without complicating simple workflows.

### 1.4 Venues
- **Primary Need**: Calendar management, technical spec sharing, and multi-room event schedules.
- **Workflow**: Manage incoming booking requests, handle multi-room events using hierarchical gig structures, provide house tech specs.
- **Gap**: External booking portal, multi-room calendar visualization.

### 1.5 Rental Houses
- **Primary Need**: Inventory accuracy and logistics.
- **Workflow**: Maintain large asset inventory, use barcode scanning for warehouse check-in/out, track sub-rentals.
- **Gap**: Mobile warehouse mode with barcode integration.

---

## 2. Strategic Priorities

Based on the persona analysis and [competitive analysis](02_competitive-analysis.md):

- **GigManager's strongest advantages are architectural**: multi-tenant collaboration and hierarchical events. No competitor has either.
- **Biggest gap to close**: financial management (quoting, invoicing, settlement). Every serious competitor has this.
- **Underserved personas** (bands, venues) represent a go-to-market opportunity that competitors ignore.
- **Mobile is table-stakes**, not a differentiator. Rentman has the most mature mobile/offline. Our PWA approach is viable.
- **No competitor has hierarchical events** — this is a genuinely unique feature that should be prioritized.

---

## 3. Document Index

| # | Document | Description |
|---|----------|-------------|
| 02 | [Competitive Analysis](02_competitive-analysis.md) | Competitor profiles (Rentman, Current RMS, LASSO, BackOpsLive), feature gap matrix, positioning strategy, and differentiation opportunities. |
| 03 | [Technical Spec](03_technical-spec.md) | Implementation approach overview — tech stack, architecture for hierarchy/CSV/PWA, source code structure, delivery phases, and verification strategy. |
| 04 | [Hierarchy Foundations](04_hierarchy-foundations.md) | SQL recursive CTEs, schema strategy, inheritance functions, service layer changes, and flexible CSV mapping architecture. |
| 05 | [Hierarchy UI & Mobile](05_hierarchy-ui-mobile.md) | GigHierarchyTree component design, progressive disclosure patterns, PWA manifest/caching strategy, and simple vs. complex org needs. |
| 06 | [Field Ops & Mobile](06_field-ops-mobile.md) | Mobile staff workflows, inventory mode (pack-out through return), barcode scanning hardware, WebAuthn, location services, and data model extensions. |
| 07 | [Financials & Settlement](07_financials-settlement.md) | Financial rollup algorithms, multi-tenant visibility rules, settlement views (production and act), vendor bid management, and hierarchy-aware reporting. |
| 08 | [Scale & Performance](08_scale-performance-roadmap.md) | Offline sync and conflict resolution, push notification architecture, scale/performance benchmarks, and load testing protocols. |

---

## 4. Development Roadmap

*Risk Note*: Recursive database queries and offline-first state synchronization pose significant technical complexity and require rigorous integration testing.

### Sprint 1: Data Foundations & Hierarchy Core
*Detail: [Technical Spec §Phase 1](03_technical-spec.md), [Hierarchy Foundations](04_hierarchy-foundations.md)*

- [ ] Implement enhanced Asset CSV import (flexible mapping, bulk updates)
- [ ] Database schema changes for `parent_gig_id` and `hierarchy_depth`
- [ ] Backend recursive inheritance logic for Participants and Equipment

### Sprint 2: Hierarchy UI & Mobile PWA Baseline
*Detail: [Technical Spec §Phase 2](03_technical-spec.md), [Hierarchy UI & Mobile](05_hierarchy-ui-mobile.md)*

- [ ] Update Gig List UI to show nested hierarchy and rollup statuses
- [ ] Implement progressive disclosure forms for parent/child gig creation
- [ ] Launch Offline-First PWA baseline with manifest, service workers, and touch-optimized layout

### Sprint 3: Warehouse Flow & Conflict Detection
*Detail: [Technical Spec §Phase 3](03_technical-spec.md), [Field Ops & Mobile](06_field-ops-mobile.md)*

- [ ] Implement Mobile Camera API barcode scanning for equipment check-in/out
- [ ] Implement hierarchical conflict detection (preventing double-booking across the tree)
- [ ] Support Biometric Auth and Location Services for venue check-in

### Sprint 4: Financial Rollups & Advanced Notifications
*Detail: [Technical Spec §Phase 4](03_technical-spec.md), [Financials & Settlement](07_financials-settlement.md)*

- [ ] Implement Push Notifications for staff assignments and hierarchy-aware gig updates
- [ ] Implement Act-specific Settlement screen and Production Vendor Bid rollups
- [ ] Performance optimization & real-world volume testing (5k+ assets)

### Sprint 5: Scale & Polish
*Detail: [Scale & Performance](08_scale-performance-roadmap.md)*

- [ ] Offline sync finalization and conflict resolution UI
- [ ] Push notification architecture (database webhooks, Edge Functions)
- [ ] Load testing (5k+ gigs, 20k+ assets, 500+ concurrent users)
- [ ] Performance optimization (indexing, virtualized lists, CTE materialization)

---

## 5. Success Criteria

- Queries on complex hierarchies resolve in <200ms
- Smooth offline sync with 100+ queued changes
- Barcode scanning operational on physical devices
- Multi-tenant financial rollups verified with no data leakage
- 5,000+ asset and 500+ hierarchical gig datasets perform acceptably
