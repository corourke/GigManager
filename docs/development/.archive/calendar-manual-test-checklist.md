Here's the full manual test checklist:

---

## Manual Test Checklist

### 1. Navigation & Tab Naming
- [x] **"Gigs" tab** appears in the navigation bar (not "Events")
- [x] No separate "Calendar" tab in the navigation bar
- [x] Clicking "Gigs" navigates to the gig list screen
- [x] "Gigs" tab highlights as active when viewing list, calendar, gig detail, or create/edit gig

### 2. View Toggle (List ↔ Calendar)
- [x] **List/Calendar toggle** appears in the page header
- [x] Default view is **List**
- [x] Clicking "Calendar" switches to calendar view
- [x] Clicking "List" switches back to list view
- [x] Active toggle button is highlighted (sky-500 blue)
- [x] No console errors when switching views

### 3. List View
- [x] Gig list loads and displays gigs in a table
- [x] **"Future Gigs" toggle** appears in the toolbar (left side)
- [x] Toggling "Future Gigs" ON filters to gigs with end date ≥ today
- [x] Toggling "Future Gigs" OFF shows all gigs
- [x] Table columns are filterable (title, status, venue, act, tags, notes)
- [x] Column visibility dropdown ("Columns" button) works
- [x] Row actions work: View, Edit, Duplicate, Delete
- [ ] Clicking a gig row → View opens gig detail with "Back to Gigs" label

### 4. Calendar View — Month
- [x] Month view renders with gigs displayed on their dates
- [x] **Custom toolbar** shows: ◀ / Today / ▶ buttons, date picker, Month/Week tabs
- [x] No duplicate toolbar (no built-in react-big-calendar toolbar)
- [x] ◀ and ▶ navigate months correctly
- [x] "Today" button returns to current month
- [x] Date picker (calendar icon + month label button) opens a popover with a mini calendar
- [x] Selecting a date in the popover navigates the calendar to that date
- [x] **No crash** when opening the date picker popover (no `formats` error)
- [x] Clicking a day in month view **drills down to week view** for that day

### 5. Calendar View — Week
- [x] Week view renders with gigs displayed in time slots
- [x] ◀ and ▶ navigate weeks correctly
- [x] Toolbar shows "Week of [date]" format
- [x] Month/Week tabs switch between views

### 6. Calendar Event Display
- [x] Events show: **title**, **time** (if available), **act name**, **venue name**
- [x] No **date** shown in calendar event items
- [x] Act and venue are separated by " · "
- [ ] Events are colored by status
- [x] No "Day" view available

### 7. Calendar → Gig Detail Navigation
- [x] Clicking a gig in calendar view opens gig detail
- [x] Back button shows **"Back to Calendar"** (not "Back to Gigs")
- [x] Clicking "Back to Calendar" returns to the **calendar view** (not list view)
- [x] After returning, the calendar is still on the same month/week

### 8. View Persistence After Navigation
- [x] From calendar view: click gig → detail → back → **calendar view** restored
- [x] From list view: click gig → detail → back → **list view** restored
- [x] Switching from calendar to list, clicking gig → detail → back → **list view**

### 9. Conflict Detection
- [x] **Conflicting gigs** appear in **red** (#dc2626) on the calendar
- [x] Conflicting gigs have a red border (2px solid #991b1b)
- [x] **Conflict warning banner** appears above the calendar when conflicts exist
- [x] Conflict types displayed: staff, venue, equipment
- [x] Each conflict shows an appropriate icon (Users, MapPin, Package)
- [x] "View Gig" link in conflict warning navigates to the gig detail
- [x] **Gig detail screen** shows conflict indicators when viewing a conflicting gig

### 10. Google Calendar Integration Settings
- [x] Settings screen accessible from the AppHeader (Settings menu)
- [x] "Connect Google Calendar" button / OAuth flow initiates
- [x] Calendar selection dropdown appears after connecting
- [x] Sync frequency setting works
- [x] Sync status filter settings work
- [x] Sync status summary displays correctly
- [x] Sync logs display correctly
- [ ] Disconnect button works

### 11. Console & Error Checks
- [x] **No** `selected prop without onSelectEvent` warning
- [x] **No** `Cannot read properties of undefined (reading 'formats')` crash
- [x] No unhandled React errors in console
- [x] 406 error for `user_google_calendar_settings` is expected if migration not yet applied

### 12. Empty States & Edge Cases
- [x] Calendar view with **no gigs** shows empty calendar (no crash)
- [ ] List view with **no gigs** shows empty state component
- [x] Gigs without an end date render correctly on calendar
- [x] Gigs without venue or act show title only (no trailing " · ")