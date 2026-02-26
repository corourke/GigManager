# Product Requirements Document: GigManager Evolution Plan

## 1. Overview
This document charts the development course for GigManager over the next several sprints. It addresses the gaps identified in current functionality, specifically focusing on organizational persona needs, advanced data structures for complex events (Hierarchical Gigs), robust mobile capabilities, and enhanced data management for real-world testing.

## 2. Organizational Persona Analysis
GigManager's multi-tenant architecture must cater to the distinct workflows of different event participants.

### 2.1 Sound & Lighting (Production Services)
*   **Primary Need**: Precise gear tracking and technical staffing.
*   **Workflow**: Receive bid requests, build "Kits", manage conflicts, assign specialized staff, generate pack lists/stage plots.
*   **Gap**: Need for better "Kit" management, barcoding, and visual conflict detection.

### 2.2 Bands / Acts
*   **Primary Need**: Logistics and financial settlement for individual performances.
*   **Workflow**: Manage tour dates, track venues/riders, track settlement, share stage plots.
*   **Gap**: Financial settlement tools and streamlined rider management.

### 2.3 Production Companies (Event Producers)
*   **Primary Need**: High-level coordination of multiple vendors and complex financials using hierarchical gig structures.
*   **Workflow**: Create "Master Gigs" with sub-gigs (e.g., Festival with multiple stages). Manage shared resources across the event hierarchy.
*   **Gap**: Robust hierarchical gig implementation to handle parent/child relationships seamlessly without complicating simple workflows.

### 2.4 Venues
*   **Primary Need**: Calendar management, technical spec sharing, and multi-room event schedules.
*   **Workflow**: Manage incoming booking requests, handle multi-room events using hierarchical gig structures, provide house tech specs.
*   **Gap**: External booking portal, multi-room calendar visualization.

### 2.5 Rental Houses
*   **Primary Need**: Inventory accuracy and logistics.
*   **Workflow**: Maintain large asset inventory, use barcode scanning for warehouse check-in/out, track sub-rentals.
*   **Gap**: Mobile warehouse mode with barcode integration.

## 3. Complex Events: Hierarchical Gig Structure
To support Production Companies, Venues, and Multi-Day/Multi-Stage events, GigManager must implement a robust Hierarchical Gig Structure.

### 3.1 Core Principles & Inheritance
*   **Parent-Child Relationships**: Gigs can have nested sub-gigs (e.g., Festival -> Main Stage -> Friday Concert).
*   **Recursive Inheritance**: Child gigs inherit Participants, Staff Slots, and Equipment Assignments from parent gigs.
*   **Child Overrides**: Child values natively take precedence over parent values without needing explicit "override" flags.
*   **Progressive Disclosure**: Simple gigs remain flat. Hierarchy features are only shown when explicitly creating/editing a parent gig.

### 3.2 Business Rules & Conflict Detection
*   **Status Propagation**: Independent by default, with rollup summaries for the parent gig.
*   **Hierarchical Conflict Resolution**: System must track staff and equipment usage across the hierarchy, preventing overlapping double-assignments but allowing reuse on non-overlapping child gigs.
*   **Access Control**: Access to a parent gig automatically grants access to child gigs.

### 3.3 UI/UX Enhancements
*   **Visual Hierarchy Indicators**: Nesting, indentation, breadcrumbs, and hierarchy-aware sorting/filtering in list views.
*   **Inherited Value Display**: Clear indication of what fields are inherited vs locally overridden in edit forms.

## 4. Competitive Analysis & Benchmarking

See [competitive-analysis.md](./competitive-analysis.md) for the full deep-dive covering Rentman, Current RMS, LASSO, and BackOpsLive with per-feature gap matrix, persona-based positioning, differentiation opportunities, and sprint roadmap recommendations.

**Key Takeaways**:
*   **GigManager's strongest advantages are architectural**: multi-tenant collaboration and hierarchical events. No competitor has either.
*   **Biggest gap to close**: financial management (quoting, invoicing, settlement). Every serious competitor has this.
*   **Underserved personas** (bands, venues) represent a go-to-market opportunity that competitors ignore.
*   **Mobile is table-stakes**, not a differentiator. Rentman has the most mature mobile/offline. PWA approach is viable.
*   **No competitor has hierarchical events** — this is a genuinely unique feature that should be prioritized.

## 5. Mobile Application Strategy
A dedicated mobile experience is critical for field ops. The strategy revolves around an Offline-First PWA, with potential for Native wrappers.

### 5.1 Mobile-Optimized Interface
*   **Touch-first Design**: Minimum 44px touch targets, swipe gestures, card-based layouts, and bottom navigation.
*   **Staff Mode**: Easy thumb access to gig schedules, venue maps, and "Stage Plot" viewers.

### 5.2 Offline Support & Native Capabilities
*   **Offline-First**: Core functionality works without internet. Background synchronization occurs when connectivity is restored, with visual sync indicators.
*   **Warehouse Mode (Camera)**: Native camera integration to scan asset barcodes/QR codes for fast equipment check-in/out.
*   **Push Notifications**: Real-time alerts for staff assignments, gig reminders, and last-minute schedule changes.
*   **Location & Biometrics**: GPS for venue check-in/distance calc, and Face/Touch ID for fast, secure authentication.

## 6. Enhanced Data Management (Real-World Testing)
*   **Asset Import**: Support flexible CSV mapping, bulk updates via serial/barcode, and kitting import.
*   **Testing Scale**: Validate performance with 5,000+ assets and 500+ hierarchical gigs.
*   **Success Criteria**: Queries on complex hierarchies resolving in <200ms; smooth offline sync with 100+ queued changes.

## 7. Development Roadmap (Next 4 Sprints)

*Risk Note*: Recursive database queries and offline-first state synchronization pose significant technical complexity and require rigorous integration testing.

### Sprint 1: Data Foundations & Hierarchy Core
- [ ] Implement enhanced Asset CSV import (flexible mapping, bulk updates).
- [ ] Database schema changes for `parent_gig_id` and `hierarchy_depth`.
- [ ] Backend recursive inheritance logic for Participants and Equipment.

### Sprint 2: Hierarchy UI & Mobile PWA Baseline
- [ ] Update Gig List UI to show nested hierarchy and rollup statuses.
- [ ] Implement progressive disclosure forms for parent/child gig creation.
- [ ] Launch Offline-First PWA baseline with manifest, service workers, and touch-optimized layout.

### Sprint 3: Warehouse Flow & Conflict Detection
- [ ] Implement Mobile Camera API barcode scanning for equipment check-in/out.
- [ ] Implement hierarchical conflict detection (preventing double-booking across the tree).
- [ ] Support Biometric Auth and Location Services for venue check-in.

### Sprint 4: Financial Rollups & Advanced Notifications
- [ ] Implement Push Notifications for staff assignments and hierarchy-aware gig updates.
- [ ] Implement Act-specific Settlement screen and Production Vendor Bid rollups.
- [ ] Performance optimization & real-world volume testing (5k+ assets).
