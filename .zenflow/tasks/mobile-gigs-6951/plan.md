# Auto

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Implementation
<!-- chat-id: 11ce2ddf-efcf-48c3-9e61-dff70e3b6b87 -->

**Sprint 1: Mobile Gig Browsing & Quick Booking**

Existing Sprint 2 inventory/warehouse mobile work is already in place (MobileLayout, MobileDashboard, MobileInventoryMode, MobileBarcodeScanner, MobileSettings, MobileLockScreen). Sprint 1 fills the gig browsing gaps:

**Scope:**
1. **MobileGigDetail** - Mobile-optimized gig detail view (date/time, venue w/ directions, act, participants, staff, notes, tags)
2. **MobileGigList** - Full gig browsing with search, status filter tabs, beyond the 7-day upcoming view
3. **Staff Assignment Actions** - Confirm/decline staff assignments from mobile gig detail
4. **Enhanced MobileDashboard** - Add "View All Gigs" action and link to gig detail (not just packing list)
5. **Routing** - Add mobile-gig-detail and mobile-gig-list routes in App.tsx, update bottom nav

**Key files:**
- `src/components/mobile/MobileGigDetail.tsx` (new)
- `src/components/mobile/MobileGigList.tsx` (new)
- `src/components/mobile/MobileDashboard.tsx` (update)
- `src/components/mobile/MobileLayout.tsx` (update bottom nav)
- `src/App.tsx` (add routes)
- `src/services/gig.service.ts` (add updateStaffAssignmentStatus)
- Tests for new components

**Refinement rounds (Sessions 3-4):**
- Badge font sizes tuned to 10px with inline styles (defeats CVA base class specificity)
- Badge component replaced with plain `<span>` for all status pills
- Org/Staff tables: plain colored text labels (no Badge), wider first column (w-20)
- Card whitespace fixed via inline `style={{ gap: 0 }}` on Card, `paddingBottom` on CardContent
- App Locked bug fixed (removed localStorage restore of lock state on unenrolled devices)
- Assignment user matching broadened (user.id, user_id, email fallback)
- Quick-Create Gig modal and Booking Status Confirmation implemented
- Enhanced debug logging for assignment matching (active in all environments)
