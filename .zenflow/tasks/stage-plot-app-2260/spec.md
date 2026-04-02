# Stage Plot & Routing App - Technical Specification

## 1. Technical Context
- **Framework**: React Native with Expo (for cross-platform iOS first, Android second)
- **Language**: TypeScript
- **Styling**: Tailwind CSS via NativeWind
- **State Management**: Zustand (local state) + Supabase (cloud state)
- **Data Persistence**: Expo-FileSystem (local JSON) + Supabase Storage/Database (cloud)
- **Real-time**: Supabase Realtime (WebSockets) for collaborative editing
- **PDF Generation**: Expo-Print / React Native Print
- **Icons**: Lucide React Native

## 2. Implementation Approach

### 2.1 MVP+ (Phase 1)
- **Modular Data Model**: Robust TypeScript interfaces for projects, devices, ports, and connections.
- **Auto-Cascading Logic**: Graph traversal algorithm for name propagation from Stage terminal sources.
- **Offline-First Storage**: Local JSON files as primary source of truth in the app's document directory.
- **Core Views**:
    - **Setups**: List and form-based management of devices and ports.
    - **Diagram**: Node-based visual signal chain using `react-native-svg` or a lightweight custom canvas.
    - **Patch**: High-performance sortable/filterable tables with perspective switching (Example: Stage, FOH, Monitors).
    
      | Stage                |      | Stagebox A |           | FOH Mixer |
      | -------------------- | ---- | ---------- | --------- | --------- |
      |                      |      | XLR IN     | AES50 Out | AES50 In  |
      | Kick (Beta 91)       |      | Ch 1       | A         | A         |
      | Bass DI (Radial AV2) | R    | Ch 2       |           |           |
      |                      | L    | Ch 3       |           | XLR In    |
      | VOX 1 (SM58)         |      |            |           | Ch 1      |
      | VOX 2 (SM58)         |      |            |           |           |
      | Keys (Nord) L        |      |            |           |           |
    
      
- **Cloud & Sharing**:
    
    - **Cloud Saving**: Integration with GigManager/Supabase for backup and gig attachments.
    - **iCloud Integration**: One-tap "Share Link" (read-only view).
    - **Phone Home Service**: Periodic check for update alerts and service status.
- **Export**: PDF, PNG, and CSV export functionality.

### 2.2 Phase 2
- **Power & RF Layer**: Parallel data layer for PDU circuits and RF frequency management.
- **Stage Plot Canvas**: Interactive canvas for dragging real-world props linked to devices, with background image support.
- **Real-time Collaboration**: WebSocket-based co-editing via Supabase Realtime.
- **Web Service Integration**: Centralized service for pre-built and community-contributed devices/templates.
- **CSV/Excel Import**: Bulk data entry from spreadsheets.

## 3. Source Code Structure (Standalone App)
- `src/`
  - `api/`: Clients for GigManager, Heartbeat, and Phase 2 services.
  - `components/`: Reusable UI elements (Buttons, Inputs, Modals).
  - `features/`: Setups, Diagram, Patch, and Collaboration modules.
  - `hooks/`: State management, sync logic, and data fetching.
  - `models/`: TypeScript interfaces and validation logic.
  - `services/`: File system, Supabase client, PDF generation, and Sync Engine.
  - `utils/`: Graph traversal, name cascading, and conflict resolution.

## 4. Data Model Changes (JSON Schema)
- `projects`: Metadata and content (devices, connections, notes).
- `devices`: Definitions with unique IDs, port mappings, and enhanced metadata (phantom, pad, etc.).
- `connections`: Source/destination port mapping with cable metadata.
- `collaboration`: Session metadata for real-time editing.

## 5. Verification Approach
- **Unit Tests**: Vitest for utility functions (cascading, graph logic).
- **Component Tests**: React Native Testing Library for core UI.
- **Integration Tests**: Verification of Supabase sync and local file persistence.
- **Manual Verification**: Cross-device testing on iOS physical devices.
- **Lint/Typecheck**: `npm run lint` and `npm run typecheck`.
