# Mobile Features Workflows

**Purpose**: This document describes mobile-optimized interface, offline support, native features, and PWA workflows for GigManager.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover mobile-specific functionality including touch-optimized UI, offline-first architecture, native device features (camera, biometrics, GPS), and Progressive Web App (PWA) capabilities. Most mobile features are **deferred** pending mobile app development.

---

## Flow 1: Mobile-Optimized Interface

**User Journey:**

**Responsive Layout:**
1. User opens GigManager on mobile browser (iOS Safari, Chrome Android)
2. Application detects mobile viewport and applies responsive styles:
   - Single-column layout
   - Larger touch targets (minimum 44px)
   - Bottom navigation bar (instead of sidebar)
   - Collapsible sections to reduce scrolling
3. User navigates between screens:
   - Dashboard → Tap "Gigs" icon in bottom nav → Gig List
   - Gig List → Tap gig card → Gig Detail (bottom sheet)
4. User interacts with mobile-optimized controls:
   - Swipe left on list items for quick actions (Edit, Delete)
   - Pull-to-refresh on lists
   - Bottom sheets for forms (instead of full-screen)
   - Floating action button (FAB) for primary action (Create Gig)

**Bottom Navigation:**
- **Dashboard** (home icon)
- **Gigs** (calendar icon)
- **Equipment** (box icon)
- **Team** (people icon)
- **More** (menu icon)

**Screens Required:**
- **Mobile-optimized versions of all screens**
  - Adaptive layouts (CSS Grid, Flexbox)
  - Bottom sheets for modals
  - Simplified forms (one field per screen for multi-step)
  - Bottom navigation bar component

**Current Implementation Status:**
- 🟡 Partial - responsive design exists, mobile optimization unclear
- ⏸️ Bottom navigation not implemented (uses desktop sidebar)
- ⏸️ Swipe gestures not implemented
- ⏸️ Pull-to-refresh not implemented

**Technical Requirements:**
- CSS Framework: Tailwind CSS (already in use) with mobile-first breakpoints
- Gesture library: react-swipeable or Framer Motion
- Bottom sheet: Radix Dialog or Vaul (bottom drawer)
- Virtual scrolling: For long lists on mobile (react-window)

**Mobile Considerations:**
- Test on real devices (not just browser DevTools)
- Support both portrait and landscape orientations
- Handle notches and safe areas (iOS)
- Optimize for slower connections (3G, 4G)

---

## Flow 2: Offline Support & Sync

**User Journey:**

**Offline Mode:**
1. User is on-site at gig venue with poor/no internet connection
2. User opens GigManager mobile app
3. App detects offline status:
   - Display offline indicator (banner or icon)
   - Load cached data from local storage
   - Core functionality remains available:
     - View assigned gigs
     - View equipment checklists
     - Mark checklist items complete
     - Add notes (saved locally)
4. User makes changes while offline:
   - Checks off packout checklist items
   - Adds note: "Band arrived 15 minutes late"
   - Updates gig status to "In Progress"
5. Changes queued in local outbox
6. User returns to area with connectivity
7. App detects online status:
   - Display sync indicator (animated spinner)
   - Upload queued changes to server
   - Download remote changes
   - Resolve conflicts (if any)
8. Sync complete notification: "All changes synced"

**Conflict Resolution:**
1. User edits gig notes offline: "Load-in completed at 3:00 PM"
2. Meanwhile, another user (online) edits same gig notes: "Load-in completed at 3:15 PM"
3. User's device comes back online
4. App detects conflict:
   - Display conflict dialog:
     - "Your changes" vs. "Server changes"
     - Diff view (highlighted differences)
     - Options: "Keep mine", "Keep server", "Merge"
5. User selects "Merge"
6. App combines both changes:
   - "Load-in completed at 3:00 PM"
   - "Load-in completed at 3:15 PM (updated)"
7. Merged result saved

**Screens Required:**
- **Offline Indicator** (banner at top)
  - "Offline - changes will sync when online"
  - Dismiss button
- **Sync Status** (in app header)
  - Animated spinner during sync
  - Checkmark on success
  - Error icon on failure
- **Conflict Resolution Dialog**
  - Side-by-side comparison
  - Diff view with highlighting
  - Merge button, Keep mine button, Keep server button

**Current Implementation Status:**
- 🚫 Deferred - offline support not implemented
- 🔧 Requires service worker and local database (IndexedDB)

**Technical Requirements:**
- Service Worker: Register and cache assets/data
- Local Database: IndexedDB (via Dexie.js or localForage)
- Sync Queue: Store pending changes with timestamps
- Conflict Detection: Compare timestamps and values
- Background Sync API: For background data sync (PWA)
- Network detection: Online/offline event listeners

**Mobile Considerations:**
- Minimize data usage (sync only essential data)
- Compress data before upload
- Batch sync operations
- Show sync progress percentage

---

## Flow 3: Native Device Features

**User Journey:**

**Biometric Authentication:**
1. User opens app on mobile device (iOS/Android)
2. App detects biometric capability (Face ID, Touch ID, fingerprint)
3. On first login:
   - User logs in with email/Google OAuth
   - System prompts: "Enable Face ID for faster login?"
   - User taps "Enable"
   - System stores encrypted token in secure storage
4. On subsequent logins:
   - User opens app
   - System displays: "Use Face ID to log in"
   - User authenticates with biometrics
   - App unlocks instantly

**Camera Integration - Asset Scanning:**
1. User navigates to Equipment → Assets
2. User taps "Scan Asset" button (camera icon)
3. Device camera opens
4. User points camera at asset barcode/QR code
5. App scans and decodes barcode
6. App searches assets table for matching serial number
7. If found:
   - Navigate to asset detail screen
   - Display asset info
8. If not found:
   - Prompt: "Asset not found. Create new asset?"
   - Pre-fill serial number field with scanned value

**Camera Integration - Photo Capture:**
1. User creating/editing asset
2. User taps "Add Photo" button
3. Options:
   - Take Photo (opens camera)
   - Choose from Library (opens photo picker)
4. User selects "Take Photo"
5. Camera opens
6. User takes photo of equipment
7. Photo preview displays
8. User confirms or retakes
9. Photo uploaded to storage
10. Photo attached to asset

**Location Services - Venue Check-in:**
1. User navigates to assigned gig detail screen
2. User taps "Check In" button
3. App requests location permission (if not granted)
4. User grants permission
5. App reads GPS coordinates
6. App calculates distance to venue:
   - If within 0.5 miles: "Checked in at [Venue Name]"
   - If farther: "You're [X] miles from venue. Still check in?"
7. Check-in recorded with timestamp and location
8. Manager receives notification: "[User] checked in at [Venue]"

**Screens Required:**
- **Biometric Prompt** (native OS dialog)
- **Camera View** (full-screen with scan overlay)
- **Photo Preview** (with confirm/retake buttons)
- **Location Permission Dialog** (native OS)
- **Check-in Confirmation** (toast notification)

**Current Implementation Status:**
- 🚫 Deferred - native features require mobile app or advanced PWA
- 🔧 Biometrics: Requires React Native or Capacitor
- 🔧 Camera: Web APIs available (getUserMedia) but limited
- 🔧 Location: Geolocation API available in web browsers

**Technical Requirements:**
- **Biometrics**: Native biometric libraries (iOS: LocalAuthentication, Android: BiometricPrompt)
- **Camera**: Camera API or MediaDevices API (web), react-native-camera (native)
- **Barcode Scanning**: ZXing, QuaggaJS, or device ML Kit
- **Photo Storage**: Supabase Storage or Cloudinary
- **Geolocation**: Native Geolocation API or react-native-geolocation
- **Distance Calculation**: Haversine formula for lat/long distance

**Mobile Considerations:**
- Request permissions at appropriate time (not on app launch)
- Handle permission denial gracefully
- Support older device cameras (lower resolution)
- Compress photos before upload (reduce size)

---

## Flow 4: Progressive Web App (PWA)

**User Journey:**

**Install PWA:**
1. User visits GigManager in mobile browser (Safari iOS, Chrome Android)
2. Browser detects PWA manifest
3. Browser displays install prompt (banner or menu option)
   - iOS Safari: Share → Add to Home Screen
   - Chrome Android: Install app banner
4. User taps "Install" or "Add to Home Screen"
5. App icon added to home screen
6. User taps app icon
7. App opens in full-screen mode (no browser chrome)
8. App feels like native app

**Background Sync:**
1. User makes changes while offline (marks checklist item complete)
2. User closes app and puts device in pocket
3. Device reconnects to Wi-Fi
4. Service worker detects connectivity
5. Background sync triggered automatically
6. Changes uploaded to server
7. Next time user opens app: Changes already synced

**Push Notifications:**
1. User opens PWA
2. App requests notification permission
3. User grants permission
4. App registers for push notifications
5. Server sends push notification: "You've been assigned to Summer Festival"
6. Notification appears on device (even if app closed)
7. User taps notification
8. App opens to gig detail screen

**Offline Caching:**
1. User opens PWA for first time
2. Service worker caches:
   - App shell (HTML, CSS, JS)
   - Static assets (logo, icons, fonts)
   - API responses (gigs, assets, users)
3. User goes offline
4. User opens PWA again
5. Service worker serves cached content
6. App loads instantly (no loading spinner)

**Screens Required:**
- **PWA Install Prompt** (browser-native)
- **Splash Screen** (full-screen logo during launch)
- **Update Available Banner** ("New version available. Tap to refresh")

**Current Implementation Status:**
- 🚫 Deferred - PWA features not implemented
- 🔧 Requires manifest.json, service worker, and build configuration

**Technical Requirements:**
- **Manifest.json**: App metadata (name, icons, theme color, display mode)
- **Service Worker**: Cache strategies, background sync, push notifications
- **Workbox**: Service worker library (precaching, routing, strategies)
- **HTTPS**: Required for PWA features
- **App Icons**: Multiple sizes (192x192, 512x512) for different devices
- **Splash Screens**: Generated for iOS (various sizes)

**PWA Manifest Example:**
```json
{
  "name": "GigManager",
  "short_name": "GigManager",
  "description": "Production and event management platform",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a56db",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Mobile Considerations:**
- Test PWA install flow on multiple browsers
- Optimize service worker cache size (avoid caching too much)
- Handle service worker updates gracefully
- Provide "Skip waiting" option for critical updates

---

## Flow 5: Mobile-Specific Workflows

**User Journey:**

**On-Site Checklist Management:**
1. User arrives at gig venue
2. User opens PWA on mobile device
3. User navigates to Today's Gigs
4. User taps assigned gig
5. User views packout checklist (bottom sheet)
6. User checks off items as they unload:
   - ☑️ 4x Shure SM58
   - ☑️ 2x Shure SM57
   - ☐ 10x 25' XLR cables
7. Progress bar shows 67% complete
8. User continues until 100% complete
9. Checklist marked complete (timestamp recorded)
10. Manager receives notification: "Packout complete for [Gig]"

**Quick Status Updates:**
1. User at gig venue
2. User swipes up from bottom navigation
3. Quick actions menu appears:
   - "Start Load-In"
   - "Start Soundcheck"
   - "Start Performance"
   - "Complete Gig"
4. User taps "Start Performance"
5. Gig status updated to "In Progress"
6. Timestamp recorded
7. All participants notified

**Voice Notes (Future Enhancement):**
1. User on-site, hands full with equipment
2. User long-presses note field
3. Voice input activates
4. User speaks: "Venue stage is smaller than expected, adjusted setup accordingly"
5. Speech-to-text converts to note
6. User reviews and saves

**Screens Required:**
- **Checklist Screen** (bottom sheet or full screen)
  - Grouped items
  - Large checkboxes
  - Progress indicator
  - Complete button
- **Quick Actions Menu** (bottom sheet)
  - Large touch targets
  - Status options
  - Cancel button
- **Voice Input** (system UI)

**Current Implementation Status:**
- ⏸️ Checklist management could be implemented with current data model
- 🚫 Quick actions menu not implemented
- 🚫 Voice notes require Web Speech API

**Technical Requirements:**
- Checklist storage: JSON field in gigs or separate `checklist_items` table
- Real-time updates: Supabase Realtime for live progress tracking
- Voice input: Web Speech API (browser support varies)

**Mobile Considerations:**
- Large tap targets for on-site use (gloves, outdoor conditions)
- Haptic feedback on checkbox toggle
- Offline support critical for on-site workflows
- Screen brightness auto-adjust for outdoor use

---

## Common Mobile UI Patterns

### Bottom Navigation
- Fixed at bottom of screen
- 5 primary destinations
- Active state highlighted (color + icon filled)
- Tap animation (scale + haptic)
- Badge count on icons (for notifications)

### Bottom Sheet
- Slides up from bottom
- Draggable handle at top
- Swipe down to dismiss
- Snap points (half-screen, full-screen)
- Background dim overlay

### Floating Action Button (FAB)
- Positioned bottom-right
- Primary action (Create Gig, Add Asset)
- Tap expands to action menu (speed dial)
- Hides on scroll down, shows on scroll up

### Pull-to-Refresh
- Pull down on list view
- Spinner appears at top
- Release to trigger refresh
- Haptic feedback on release

### Swipe Actions
- Swipe left on list item reveals actions
- Actions: Edit (blue), Delete (red), Share (green)
- Swipe right for alternate actions (Archive, Pin)
- Full swipe triggers primary action

### Toast Notifications
- Small popup at bottom (above bottom nav)
- Auto-dismiss after 3-5 seconds
- Swipe to dismiss
- Action button (optional: "Undo")

---

## Related Documentation

- [Requirements: Mobile Features](../requirements.md#10-mobile-features)
- [Feature Catalog: Mobile Features](../feature-catalog.md#10-mobile-features)
- [Notifications & Reminders Workflows](./7-notifications-workflows.md) - Push notification details
- [Technical Documentation Workflows](./9-technical-documentation-workflows.md) - Camera/photo workflows

---

**Last Updated**: 2026-01-18  
**Status**: Planning Document - Features mostly deferred pending mobile app development
