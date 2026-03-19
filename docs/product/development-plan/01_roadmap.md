# GigManager Development Roadmap

## Overview

This document serves as the overview and index for the GigManager development plan. It provides strategic context — who our users are, where the gaps exist, and how we plan to close them — then links to the detailed technical documents that specify the implementation.

For functional requirements and business rules, see [Product Requirements](../requirements.md).

**Last Updated**: 2026-03-11

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
- **Gap**: Financial settlement tools, streamlined rider management, and multi-act scheduling for shared bills.

### 1.3 Production Companies (Event Producers)
- **Primary Need**: High-level coordination of multiple vendors, multi-act scheduling, and complex financials.
- **Workflow**: Book events with multiple acts and a schedule of performances, manage shared resources. For large events, create master gigs with sub-gigs (e.g., Festival with multiple stages).
- **Gap**: Multi-act scheduling within gigs; hierarchical gig structure for complex multi-venue events (advanced).

### 1.4 Venues
- **Primary Need**: Calendar management, technical spec sharing, and multi-room event schedules.
- **Workflow**: Manage incoming booking requests, handle multi-room events, provide house tech specs.
- **Gap**: External booking portal, multi-room calendar visualization.

### 1.5 Rental Houses
- **Primary Need**: Inventory accuracy and logistics.
- **Workflow**: Maintain large asset inventory, use barcode scanning for warehouse check-in/out, track sub-rentals.
- **Gap**: Mobile warehouse mode with barcode integration.

---

## 2. Strategic Priorities

Based on the persona analysis and [competitive analysis](02_competitive-analysis.md):

- **Mobile gig browsing is the most urgent gap**: Users need a compact way to view upcoming gigs, confirm bookings, and capture new bookings on the go.
- **Multi-act scheduling is a practical everyday need**: Most gigs have multiple acts with a schedule. This is more broadly useful than full hierarchical events.
- **Financial management is the biggest competitive gap**: Quoting, invoicing, and settlement. Every serious competitor has this.
- **GigManager's strongest architectural advantages**: Multi-tenant collaboration and hierarchical events. No competitor has either.
- **Underserved personas** (bands, venues) represent a go-to-market opportunity that competitors ignore.
- **Hierarchical events are a genuine differentiator** but serve a smaller subset of users. They should be developed independently, not as a foundation for other features.
- **Mobile is table-stakes**, not a differentiator. Our PWA approach is viable.

---

## 3. Document Index

| # | Document | Description |
|---|----------|-------------|
| 02 | [Competitive Analysis](02_competitive-analysis.md) | Competitor profiles (Rentman, Current RMS, LASSO, BackOpsLive), feature gap matrix, positioning strategy, and differentiation opportunities. |
| 03 | [Technical Spec](03_technical-spec.md) | Implementation approach overview — tech stack, architecture, source code structure, delivery phases, and verification strategy. |
| 04 | [Mobile Development](04_mobile-development.md) | Consolidated mobile plan: gig browsing, staff dashboard, inventory/warehouse mode, PWA configuration, offline sync, push notifications, and data model extensions. |
| 05 | [Hierarchy Foundations](05_hierarchy-foundations.md) | SQL recursive CTEs, schema strategy, inheritance functions, service layer changes, and flexible CSV mapping architecture. |
| 06 | [Hierarchy UI](06_hierarchy-ui.md) | GigHierarchyTree component design, progressive disclosure patterns, and simple vs. complex org needs. |
| 07 | [Gig Financials Workflow](07_gig-financials-workflow.md) | Single-ledger gig financials, profitability tracking, staff completion flow, receipt integration, and two-way linking. See also: [Coding Prompt](financials-coding-prompt.md). |
| 08 | [Scale & Performance](08_scale-performance-roadmap.md) | Scale/performance benchmarks and load testing protocols. |

---

## 4. Development Roadmap

### Sprint 1: Mobile Gig Browsing + CSV Import
*Detail: [Technical Spec §Phase 1](03_technical-spec.md), [Mobile Development](04_mobile-development.md)*

- [ ] PWA baseline (manifest, service worker, touch-optimized layout)
- [ ] Mobile gig list (card-based), simplified gig detail view, quick-create gig form
- [ ] Enhanced Asset CSV import (flexible mapping, bulk updates)

### Sprint 2: Multi-Act Scheduling + Warehouse Mobile
*Detail: [Technical Spec §Phase 2](03_technical-spec.md), [Mobile Development](04_mobile-development.md)*

- [ ] Implement `gig_schedule_entries` model (act time slots, activity types)
- [ ] Schedule/timeline UI within gig detail
- [ ] Mobile barcode scanning for equipment check-in/out
- [ ] Staff dashboard mobile view

### Sprint 3: Financial Management (Flat Gigs)
*Detail: [Technical Spec §Phase 3](03_technical-spec.md), [Gig Financials Workflow](07_gig-financials-workflow.md)*

- [ ] Flat gig financials: settlement views and vendor bid management
- [ ] Act-specific settlement screen
- [ ] Push notifications for staff assignments and gig updates

### Sprint 4: Hierarchical Gig Structure
*Detail: [Technical Spec §Phase 4](03_technical-spec.md), [Hierarchy Foundations](05_hierarchy-foundations.md), [Hierarchy UI](06_hierarchy-ui.md)*

- [ ] Database schema changes for `parent_gig_id` and `hierarchy_depth`
- [ ] Recursive inheritance logic for participants and equipment
- [ ] Hierarchy UI (tree view, progressive disclosure forms)
- [ ] Hierarchical conflict detection
- [ ] Extend financial rollups to support hierarchy

### Sprint 5: Scale & Polish
*Detail: [Technical Spec §Phase 5](03_technical-spec.md), [Scale & Performance](08_scale-performance-roadmap.md)*

- [ ] Offline sync finalization and conflict resolution UI
- [ ] Load testing (5k+ gigs, 20k+ assets, 500+ concurrent users)
- [ ] Performance optimization (indexing, virtualized lists)
- [ ] Biometric auth (WebAuthn) and location services

---

## 5. Success Criteria

- Mobile gig browsing functional on iOS/Android within Sprint 1
- Multi-act scheduling operational for gigs with 2+ acts
- Flat gig financial management complete before hierarchy work begins
- Smooth offline sync with 100+ queued changes
- Barcode scanning operational on physical devices
- Multi-tenant financial rollups verified with no data leakage
- Queries resolve in <200ms under load (5k+ gigs, 20k+ assets)
