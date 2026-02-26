# Technical Detail: Phase 5 - Scale, Sync & Performance Roadmap

This document outlines the strategy for ensuring GigManager remains performant, reliable, and responsive under high-volume data loads and in varied connectivity environments.

## 1. Offline Sync & Conflict Resolution

GigManager will utilize `idb` (IndexedDB) and a Service Worker-based synchronization strategy to support "Field Ops" in low-connectivity environments.

### 1.1 Local Storage Strategy (IndexedDB)
- **Object Stores**:
    - `pending_sync`: Stores outgoing mutations (POST/PATCH/DELETE) with timestamps and sequence numbers.
    - `gig_cache`: Stores the most recently accessed gigs and their hierarchies.
    - `asset_cache`: Stores critical asset/kit data for warehouse operations.
- **Sync Queue Schema**:
    ```typescript
    interface SyncOperation {
      id: string;             // Unique ID for the operation
      timestamp: number;      // Sequence for ordering
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      table: string;          // e.g., 'gigs', 'kit_assignments'
      payload: any;           // The data to be sent
      status: 'pending' | 'syncing' | 'failed';
      retryCount: number;
    }
    ```

### 1.2 Synchronization Workflow
1.  **Intercept & Queue**: If the network is unavailable, the `apiClient` intercepts the request and writes it to the `pending_sync` store.
2.  **Background Sync**: The Service Worker listens for the `sync` event (or uses a fallback polling mechanism) to drain the `pending_sync` queue when the browser detects connectivity.
3.  **Conflict Resolution**:
    - **Last-Write-Wins (LWW)**: Default strategy for simple fields (notes, names).
    - **Version Check**: For critical fields (gig status, asset availability), the backend will check `updated_at` timestamps. If a conflict occurs, the client is notified via a "Sync Conflict" UI to choose between "Keep Local" or "Use Server".

---

## 2. Push Notification Architecture

To keep staff updated on real-time hierarchy changes (e.g., a set time moving within a festival), we will implement a Web Push architecture.

### 2.1 Subscription Flow
1.  **Permission**: UI prompts user for notification permission on the mobile dashboard.
2.  **Registration**: Client generates a `PushSubscription` via the browser's `PushManager`.
3.  **Storage**: The subscription (endpoint, keys) is sent to a Supabase table `user_push_subscriptions` linked to the `user_id`.

### 2.2 Trigger Mechanism
- **Supabase Database Webhooks**: When a gig in a hierarchy is updated, a database webhook triggers a Supabase Edge Function.
- **Edge Function (`notify-staff`)**: 
    - Queries `user_push_subscriptions` for all staff assigned to that gig or its parent hierarchy.
    - Sends a payload (title, body, icon, URL) to the Web Push service (FCM or similar).
    - Includes a `tag` in the notification to collapse multiple updates for the same gig.

---

## 3. Scale & Performance Benchmarks

### 3.1 Load Testing Protocols
- **Data Volume Targets**:
    - **Gigs**: 5,000+ per organization with 5+ levels of hierarchy.
    - **Assets**: 20,000+ unique serial numbers with associated check-in/out history.
    - **Users**: 500+ concurrent staff members during a "Festival" scenario.
- **Testing Tools**: Use `k6` for load testing the Supabase Edge Functions and recursive SQL queries.

### 3.2 Optimization Strategies
- **Database Indexing**: 
    - Composite indexes on `(parent_gig_id, organization_id)` for faster hierarchy traversal.
    - GIN indexes on `search_vector` for fast asset/gig searching.
- **Virtualized Lists**: Implement `react-window` or `@tanstack/react-virtual` in `GigListScreen` and `AssetList` to handle thousands of rows without DOM lag.
- **Recursive CTE Materialization**: If hierarchy lookups become a bottleneck, implement a materialized view or a "path" column (LTREE) for faster subtree retrieval.

---

## 4. Verification & Load Testing
- **Protocol**: 
    1.  Seed the database with 20k assets and 5k gigs using a custom script.
    2.  Measure response times for `get_gig_hierarchy` (Target: <200ms).
    3.  Verify offline scan-to-sync loop on a mobile device with "Airplane Mode" toggled.
    4.  Verify push notification delivery latency (Target: <3s from DB update).
