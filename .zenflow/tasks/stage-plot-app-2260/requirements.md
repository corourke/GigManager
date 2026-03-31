# Stage Plot & Routing App - Product Requirements Document (PRD)

## 1. Purpose
The Stage Plot & Routing app is a lightweight, standalone iOS application designed for live-sound engineers to quickly build, edit, store, recall, and print audio patch sheets. It models the physical signal chain from stage sources to amplifiers and speakers, focusing on connectivity and physical setup rather than internal mixer processing.

## 2. Target Users
- Live Sound Engineers
- Production Managers
- Stage Technicians
- Bands and Performing Acts (for creating their own plots)

## 3. Core Features (MVP+)

### 3.1 Device & Group Management
- **Devices**: Every item in the signal chain (mics, DIs, stageboxes, mixers, amps, etc.).
- **Groups**: Optional visual containers for organizing devices (e.g., "Stage", "FOH Rack", "Monitor Rack", "Speaker System").
- **Device Types**: Pre-populated and user-editable list (Microphone, DI, Stagebox, Mixer, Amp, etc.).
- **Color-Coded Categories**: Devices can be assigned to categories (e.g., Drums, Vocals, Instruments) for visual propagation in Diagram and Patch views.

### 3.2 Ports & Signal Flow
- **Input/Output Ports**: Defined list per device with port number, name, channel count, and connector type.
- **Terminal Sources (Stage Group)**:
  - **General Name**: (e.g., "Kick", "Snare")
  - **Type/Specific**: (e.g., "SM92a", "SM57")
  - **Enhanced Metadata**: Phantom power toggle, pad, gain note, and stage position (L/C/R).
- **Auto-Cascading Names**: The "General Name" propagates downstream (with user override).

### 3.3 Connections & Routing
- Connect any output port to any input port.
- **Connection Properties**: Channel mapping, cable length (ft/m), and cable label/type.
- **Visualization**: Drag-to-connect interface in the Diagram view.
- **Phase 2 Features:**
  - **Power & RF Layer**: Parallel "Power Path" for PDUs/circuits and RF frequency management for wireless devices.


### 3.4 User Interface & Views
- **Setups Tab**: Manage devices, groups, and ports.
- **Diagram Tab**: Node-based visual signal chain with group-based layout hints.
- **Patch Tab**: Sortable/filterable table of connections starting from different perspectives (Stage, FOH, Monitor world).
- **Printing Presets**: Optimized layouts for "Load-In Sheet" (Patch only) or "System Diagram".
- **Phase 2 Features:**
  - **Stage Plot Canvas**: Optional embedded canvas to drag real-world props (mic stands, DI boxes, amps) linked to Stage devices. Supports background image upload (stage photo) and snap-to-grid.


### 3.5 Templates & Library
- **Built-in Library**: Reusable templates (e.g., "4-Piece Band", "Festival Line-Array"). Various devices (Mixer: WING, X32; DI Box: Radial 2AV; Stage Box: Behringer SD16).
- **Web Service Integration**: Ability to connect to a centralized web service to download pre-built and user-contributed devices and templates. (Phase 2)

### 3.6 Project Management & Data
- **Data Persistence**: Local JSON storage (sandbox or Files app).
- **User Templates**: Ability to save a project as a template.
- **Import/Export**: Export as PDF, PNG (Diagram), CSV (Patch list)

### 3.7 Cloud, Collaboration and Sharing
- **Cloud Saving**: Secure cloud backup and project synchronization tied into GigManager. Projects can be saved/restored as gig attachments.
- **Real-time Collaboration**: Ability to coordinate and initiate real-time collaborative editing sessions with other users via WebSockets.
- **iCloud Integration**: One-tap "Share Link" via iCloud (read-only view for crew).
- **Update Alerts**: Periodic "phone home" mechanism to check for app updates, service status, and critical alerts.

## 4. Technical Constraints
- **Platform Priority**: iOS (iPhone) first, Android second.
- **Standalone Mode**: Initially independent of GigManager, with increasing integration over time.
- **App Store Readiness**: Support for Dark Mode, Undo/Redo, and Accessibility (VoiceOver).

## 5. User Experience Principles
- **Speed & Efficiency**: Optimized for "on the fly" editing during setup.
- **iOS-Native UX**: High-contrast modes, Undo/Redo stack, and responsive touch controls.
- **Offline First**: Full functionality without an internet connection, with background syncing to cloud services.
