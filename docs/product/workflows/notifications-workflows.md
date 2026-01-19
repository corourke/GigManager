# Notifications & Reminders Workflows

**Purpose**: This document describes email notifications, in-app notifications, push notifications, and reminder workflows for GigManager.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover how users receive notifications about invitations, gig assignments, status changes, and upcoming events through email, in-app notifications, and push notifications (mobile). Most notification features are **planned** but not yet implemented.

---

## Flow 1: Email Notifications

**User Journey:**

**Invitation Email:**
1. Admin invites new user to organization (TeamScreen → Invite New User)
2. System sends email to invitee:
   - Subject: "You've been invited to join [Organization Name] on GigManager"
   - Body: Invitation message, role description, organization details
   - Call-to-action button: "Accept Invitation"
   - Link expires in 7 days
3. User clicks "Accept Invitation"
4. If user has account: Redirect to login → Add to organization
5. If user is new: Redirect to signup → Profile completion → Add to organization
6. User receives confirmation email: "You've joined [Organization Name]"

**Staff Assignment Email:**
1. Manager assigns staff to gig slot (CreateGigScreen → Staff Slots section)
2. System sends email to assigned staff member:
   - Subject: "You've been assigned to [Gig Title]"
   - Body: Gig details (date, time, venue, role, notes)
   - Call-to-action buttons: "Confirm" | "Decline"
   - Link to view gig details in app
3. User clicks "Confirm" or "Decline"
4. Assignment status updated in database
5. Manager receives notification: "[User] confirmed/declined assignment for [Gig Title]"

**Gig Reminder Email:**
1. System runs daily cron job at 9:00 AM
2. Query for gigs starting in next 24 hours
3. For each gig, send email to all assigned staff:
   - Subject: "Reminder: [Gig Title] tomorrow at [Time]"
   - Body: Gig details, location, contact info, special notes
   - Link to view gig details
   - "Add to Calendar" button (ICS export)

**Status Change Email:**
1. Manager updates gig status (e.g., DateHold → Booked)
2. System sends email to all assigned staff and participants:
   - Subject: "[Gig Title] status changed to Booked"
   - Body: Status change details, updated gig info
   - Link to view gig
3. If status changes to Cancelled:
   - Email all participants immediately
   - Subject: "CANCELLED: [Gig Title]"
   - Body: Cancellation reason (if provided), apology message

**Screens Required:**
- Email templates (HTML + plain text)
- Email settings screen (opt-in/opt-out preferences)
- Email log screen (admin view of sent emails)

**Current Implementation Status:**
- ✅ Invitation emails handled by Supabase Auth
- ⏸️ Staff assignment emails not implemented
- ⏸️ Gig reminder emails not implemented
- ⏸️ Status change emails not implemented

**Technical Requirements:**
- Email service: Supabase Auth (invitation emails) or SendGrid/Mailgun/Postmark (transactional emails)
- Email templates: Handlebars or React Email
- Cron jobs: Supabase Edge Functions or external cron service
- Unsubscribe handling: Per-notification-type preferences
- Email deliverability: SPF, DKIM, DMARC records

**Mobile Considerations:**
- Mobile-friendly email templates
- Large tap targets for buttons
- Inline images (venue photos, maps)

---

## Flow 2: In-App Notifications

**User Journey:**

**Notification Bell:**
1. User logs in and navigates to any screen
2. Header shows bell icon with badge count (e.g., "🔔 3")
3. User clicks bell icon → Notification dropdown opens
4. Dropdown shows:
   - List of recent notifications (last 10)
   - Notification type icon (invitation, assignment, reminder, status)
   - Notification text (e.g., "You've been assigned to Summer Festival")
   - Timestamp (e.g., "2 hours ago")
   - Unread indicator (bold text or blue dot)
   - "Mark all as read" button
   - "View all notifications" link

**Notification Detail:**
1. User clicks on a notification in dropdown
2. System marks notification as read
3. User is redirected to relevant screen:
   - Assignment notification → Gig detail screen
   - Invitation notification → Team screen
   - Status change → Gig detail screen
4. Badge count decrements

**Notification Center:**
1. User clicks "View all notifications" in dropdown
2. Redirected to Notifications screen (`/notifications`)
3. Full list of all notifications:
   - Filter by type (All, Invitations, Assignments, Reminders, Status Changes)
   - Filter by read/unread status
   - Sortable by date
   - Pagination (20 per page)
   - Bulk actions: "Mark selected as read", "Delete selected"
4. User can:
   - Click notification to view detail
   - Mark individual notifications as read/unread
   - Delete individual notifications
   - Clear all read notifications

**Notification Settings:**
1. User navigates to Settings → Notifications
2. User configures preferences:
   - **Email Notifications**: Toggle on/off per notification type
   - **In-App Notifications**: Toggle on/off per type
   - **Push Notifications** (mobile): Toggle on/off per type
   - **Notification Frequency**: Real-time, Daily digest, Weekly digest
   - **Quiet Hours**: Set times to suppress push notifications (e.g., 10 PM - 7 AM)
3. User saves preferences

**Screens Required:**
- **Notification Dropdown** (header component)
  - Notification list
  - Badge count
  - "Mark all as read" button
- **Notifications Screen** (`/notifications`)
  - Filter panel
  - Notification list
  - Pagination
  - Bulk actions
- **Notification Settings** (`/settings/notifications`)
  - Per-type toggles
  - Frequency selector
  - Quiet hours time picker

**Current Implementation Status:**
- ⏸️ Not implemented - no in-app notification system exists

**Technical Requirements:**
- Database: `notifications` table (user_id, type, entity_id, message, read, created_at)
- Real-time updates: Supabase Realtime subscriptions for live notification badge
- Notification triggers: Database triggers or app-level logic when events occur
- Retention policy: Auto-delete read notifications after 90 days

**Mobile Considerations:**
- Bottom sheet for notification dropdown
- Swipe to mark as read
- Swipe to delete
- Pull-to-refresh on notification screen

---

## Flow 3: Push Notifications (Mobile)

**User Journey:**

**Permission Request:**
1. User installs mobile app (PWA or native)
2. On first launch after signup:
   - System displays permission prompt: "Allow GigManager to send you notifications?"
   - User taps "Allow" or "Don't Allow"
3. If allowed:
   - Register device token with push notification service
   - Store token in database (linked to user)
4. If denied:
   - User can enable later in Settings → Notifications

**Receiving Push Notifications:**
1. Event occurs (staff assignment, gig reminder, status change)
2. System sends push notification to user's registered devices:
   - Notification title: "[Gig Title]" or "New Assignment"
   - Notification body: Short message (e.g., "You've been assigned as Sound Engineer")
   - Notification icon: GigManager logo
   - Notification action buttons: "View" | "Dismiss"
3. User taps notification:
   - App opens (or comes to foreground)
   - Navigates to relevant screen (gig detail)
4. User swipes to dismiss:
   - Notification cleared from device
   - In-app notification remains (synced separately)

**Push Notification Types:**

**Staff Assignment:**
- Title: "New Gig Assignment"
- Body: "[Gig Title] on [Date] at [Time]"
- Actions: "Confirm" | "Decline" | "View Details"
- Deep link: `/gigs/[gig_id]`

**Gig Reminder:**
- Title: "Upcoming Gig Reminder"
- Body: "[Gig Title] starts in 1 hour"
- Actions: "View Details" | "Get Directions"
- Deep link: `/gigs/[gig_id]`

**Status Change:**
- Title: "Gig Status Updated"
- Body: "[Gig Title] is now Booked"
- Actions: "View Details"
- Deep link: `/gigs/[gig_id]`

**Screens Required:**
- Push notification permission prompt (native or PWA)
- Deep linking handler (route to correct screen)

**Current Implementation Status:**
- 🚫 Deferred - requires native app or PWA with service worker

**Technical Requirements:**
- **iOS**: Apple Push Notification Service (APNs)
- **Android**: Firebase Cloud Messaging (FCM)
- **Web (PWA)**: Web Push API (FCM for Chrome, APNs for Safari)
- Device token management: Store in `user_devices` table
- Push service: Firebase Admin SDK or OneSignal
- Background sync: Update app state when notification received

**Mobile Considerations:**
- Rich notifications with images (venue photo)
- Notification grouping (multiple gigs grouped)
- Action buttons directly in notification
- Badging (app icon badge count)

---

## Flow 4: Reminder Scheduling

**User Journey:**

**Automatic Reminders:**
1. System runs cron job every hour
2. Query for upcoming events:
   - Gigs starting in 24 hours → Send reminder to assigned staff
   - Gigs starting in 1 week → Send reminder to manager (prepare equipment)
   - Gigs starting in 1 hour → Send immediate reminder to staff on-site
3. System sends reminders via:
   - Email (if email notifications enabled)
   - Push notification (if push enabled)
   - In-app notification (always)
4. Reminders marked as sent in database (prevent duplicates)

**Custom Reminders (Future Enhancement):**
1. User viewing gig detail screen
2. User clicks "Set Reminder" button
3. Dialog opens:
   - Reminder time selector (1 hour before, 1 day before, custom)
   - Reminder method (Email, Push, Both)
   - Custom message (optional)
4. User saves reminder
5. System stores in `gig_reminders` table
6. At scheduled time, system sends notification

**Screens Required:**
- Custom reminder dialog (within gig detail screen)
- Reminder management screen (view/edit/delete reminders)

**Current Implementation Status:**
- ⏸️ Not implemented - no reminder system exists

**Technical Requirements:**
- Cron service: Supabase Edge Functions, AWS Lambda, or Vercel Cron
- Scheduling logic: Check every hour for upcoming events
- Deduplication: Track sent reminders to avoid duplicates
- Timezone handling: Convert gig start time to user's local timezone

**Mobile Considerations:**
- Local notifications (device-level reminders)
- Sync with in-app reminder system
- Snooze option (delay reminder by 15 minutes)

---

## Flow 5: Notification Preferences & Opt-Out

**User Journey:**

1. User navigates to Settings → Notifications (`/settings/notifications`)
2. User sees notification preference panel:

   **Email Notifications:**
   - ☑️ Invitation emails
   - ☑️ Assignment notifications
   - ☑️ Gig reminders (24 hours before)
   - ☑️ Status change notifications
   - ☐ Weekly summary (digest of upcoming gigs)

   **In-App Notifications:**
   - ☑️ All notifications

   **Push Notifications (Mobile):**
   - ☑️ Assignment notifications
   - ☑️ Gig reminders
   - ☐ Status changes
   - ☐ Chat messages (future)

   **Notification Frequency:**
   - ○ Real-time (as they happen)
   - ○ Daily digest (single email per day)
   - ○ Weekly digest (single email per week)

   **Quiet Hours:**
   - Enable quiet hours: ☑️
   - Start time: 10:00 PM
   - End time: 7:00 AM
   - (Push notifications suppressed during quiet hours)

3. User adjusts preferences and clicks "Save"
4. System updates `user_notification_preferences` table
5. Future notifications respect user preferences

**Unsubscribe from Emails:**
1. User receives email notification
2. User clicks "Unsubscribe" link in email footer
3. Redirected to unsubscribe confirmation page
4. Options:
   - Unsubscribe from this type of email only
   - Unsubscribe from all emails (except critical account emails)
5. User confirms
6. Preferences updated
7. Confirmation message displayed

**Screens Required:**
- **Notification Settings** (`/settings/notifications`)
  - Per-type toggles
  - Frequency radio buttons
  - Quiet hours time pickers
  - "Save" button
- **Unsubscribe Page** (`/unsubscribe?token=[token]`)
  - Unsubscribe options
  - Confirmation button
  - Success message

**Current Implementation Status:**
- ⏸️ Not implemented - no preference management exists

**Technical Requirements:**
- Database: `user_notification_preferences` table
- Email unsubscribe tokens: Signed JWT with user_id and notification type
- Preference validation: Ensure critical notifications (invitations) cannot be fully disabled
- Audit log: Track preference changes for compliance

**Mobile Considerations:**
- Toggle switches for all preferences
- iOS/Android system settings integration
- Reset to defaults button

---

## Common UI Components

### Notification Card
- Icon representing notification type (envelope, bell, calendar)
- Bold title
- Description text (truncated if long)
- Timestamp (relative: "2 hours ago")
- Unread indicator (blue dot or bold text)
- Dismiss button (X icon)

### Notification Badge
- Red circle with count (e.g., "3")
- Max display: "9+" if count > 9
- Positioned on bell icon (top-right corner)
- Animated pulse on new notification

### Notification Settings Panel
- Grouped by notification type
- Toggle switches (on/off)
- Nested options (indented under parent toggle)
- Descriptions for each option
- "Save Changes" button (sticky at bottom)

### Toast Notifications (Transient)
- Small popup in bottom-right corner (desktop) or top (mobile)
- Auto-dismiss after 5 seconds
- Types: Success (green), Error (red), Info (blue), Warning (yellow)
- Close button (X)
- Action button (optional, e.g., "Undo")

---

## Related Documentation

- [Requirements: Notifications & Reminders](../requirements.md#7-notifications--reminders)
- [Feature Catalog: Notifications & Reminders](../feature-catalog.md#7-notifications--reminders)
- [Team Management Workflows](./team-management-workflows.md) - Invitation workflows
- [Gig Management Workflows](./gig-management-workflows.md) - Assignment workflows
- [Mobile Workflows](./mobile-workflows.md) - Push notification details

---

**Last Updated**: 2026-01-18  
**Status**: Planning Document - Features not yet implemented
