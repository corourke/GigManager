# Technical Detail: Scale & Performance Roadmap

This document outlines the strategy for ensuring GigManager remains performant, reliable, and responsive under high-volume data loads.

For offline sync, push notifications, and mobile-specific performance concerns, see [Mobile Development](04_mobile-development.md).

---

## 1. Scale & Performance Benchmarks

### 1.1 Load Testing Protocols
- **Data Volume Targets**:
    - **Gigs**: 5,000+ per organization, including hierarchical structures (5+ levels) when hierarchy is implemented.
    - **Assets**: 20,000+ unique serial numbers with associated check-in/out history.
    - **Users**: 500+ concurrent staff members during a "Festival" scenario.
- **Mobile Performance**: Gig list loads in <1s on 3G connections.
- **Testing Tools**: Use `k6` for load testing the Supabase Edge Functions and SQL queries.

### 1.2 Optimization Strategies
- **Database Indexing**:
    - Composite indexes on `(organization_id, status)` for gig list queries.
    - GIN indexes on `search_vector` for fast asset/gig searching.
    - Index on `parent_gig_id` for hierarchy traversal (when hierarchy is implemented).
- **Virtualized Lists**: Implement `react-window` or `@tanstack/react-virtual` in `GigListScreen` and `AssetList` to handle thousands of rows without DOM lag.
- **Recursive CTE Materialization**: If hierarchy lookups become a bottleneck, implement a materialized view or a "path" column (LTREE) for faster subtree retrieval.

---

## 2. Verification & Load Testing
- **Protocol**:
    1.  Seed the database with 20k assets and 5k gigs using a custom script.
    2.  Measure response times for gig list and detail queries (Target: <200ms).
    3.  Measure response times for `get_gig_hierarchy` when hierarchy is implemented (Target: <200ms).
    4.  Verify mobile gig list performance on throttled 3G network (Target: <1s initial load).
    5.  Verify push notification delivery latency (Target: <3s from DB update).
