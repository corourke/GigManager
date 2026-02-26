# Technical Detail: Field Ops & Mobile Experience

This document outlines the mobile strategy for GigManager, focusing on staff workflows in the field and warehouse environments.

## 1. Mobile-First Workflows

### 1.1 Staff Dashboard
The mobile staff dashboard is designed for high-glanceability and quick action for crew members on-site.

- **Upcoming Gigs**: A card-based list of assigned gigs for the next 48 hours.
- **Quick Links**:
    - **Venue Map/Directions**: Integration with device native maps.
    - **Stage Plots**: A full-screen SVG/PDF viewer for technical documents.
    - **Contact List**: One-tap access to call/message gig organizers.
- **Time Tracking**: Location-aware "Check-in" button that becomes active when within a predefined radius of the venue.

### 1.2 Warehouse Mode
Warehouse Mode is a specialized interface for equipment logistics, optimized for single-handed use.

- **Load-Out Flow**:
    1. Select Gig/Pack List.
    2. Scan item barcode.
    3. Visual/Audio feedback (Success, Wrong Item, Already Packed).
    4. Auto-update status to `In Transit`.
- **Return Flow**:
    1. Scan item barcode.
    2. Auto-detect associated Gig.
    3. Update status to `In Warehouse`.
    4. Prompt for "Maintenance Required" if flagged during return.

---

## 2. Barcode Scanning & Hardware

### 2.1 Implementation Strategy
- **Camera Scanning**: Use `react-qr-barcode-scanner` for built-in camera access.
- **External Scanners**: Support Bluetooth HID scanners.
    - Implement a global key-press listener to capture fast input from external scanners.
    - Add a `scanner_prefix` and `scanner_suffix` (e.g., Enter) configuration to distinguish scanner input from keyboard input.

### 2.2 Barcode Formats
The system will support the following standard formats:
- **QR Codes**: For general asset identification and kitting.
- **Data Matrix**: For small assets with limited surface area.
- **Code 128**: Compatibility with legacy rental house systems.

---

## 3. Advanced Authentication & Security

### 3.1 Biometric Auth (WebAuthn)
To allow field staff to quickly unlock the app without typing passwords on small screens.
- **Enrollment**: Users can register a device (FaceID/TouchID/Android Biometrics) in their profile settings.
- **Fast Auth**: A "Sign in with Biometrics" button on the login screen.

### 3.2 Location-Based Services (LBS)
- **Geofencing**: Store GPS coordinates for all Venues.
- **Radius Check**: Staff can only mark themselves as "On Site" if within 500m of the venue coordinates.
- **Privacy**: Location is only tracked at the moment of check-in/out, not continuously.

---

## 4. Mobile Best Practices (UI/UX)

### 4.1 Design Tokens
- **Touch Targets**: All interactive elements (buttons, toggles, list items) must be at least **44x44px**.
- **Bottom Navigation**: Primary app navigation moves to the bottom of the screen for thumb-driven usage.
- **Contrast**: High-contrast themes to ensure readability in bright sunlight (outdoor festivals).

### 4.2 Offline Reliability
- **Local Storage**: Use `idb` (IndexedDB) to cache the user's upcoming 7 days of gig data.
- **Background Sync**: Changes made offline (e.g., checking an item out) are queued and synced using the Background Sync API when connectivity returns.
- **Conflict Handling**: "Last write wins" for status updates, with manual resolution for inventory discrepancies.

---

## 5. Implementation Roadmap (Sprint 3)
1.  **PWA Baseline**: Configure `vite-plugin-pwa` and manifest.
2.  **Scanner Hook**: Develop `useScanner.ts` to handle both camera and HID input.
3.  **Warehouse UI**: Implement the Scan-and-Update views for Load-Out/Return.
4.  **Geofence Logic**: Add distance calculation utilities and check-in button validation.
