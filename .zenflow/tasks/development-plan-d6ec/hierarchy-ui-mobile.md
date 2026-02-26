# Technical Detail: Hierarchy UI & Mobile Strategy

This document specifies the UI/UX designs for the hierarchical gig structure and the technical strategy for the Mobile PWA in GigManager.

## 1. GigHierarchyTree Design

The `GigHierarchyTree` component provides a visual navigation structure for complex events (e.g., festivals, multi-day tours).

### 1.1 Component Structure
- **Root**: The top-level "Master Gig".
- **Nodes**: Child gigs, recursively nested.
- **States**: 
    - `isExpanded`: boolean, persists in local state (or URL param for deep linking).
    - `isSelected`: indicates current view/edit context.

### 1.2 Visual Representation
- **Indentation**: 1.5rem per depth level.
- **Connectors**: L-shaped lines to visually link children to parents.
- **Collapsible Controls**: Chevron icons to toggle visibility of sub-branches.
- **Node Metadata**: 
    - Title (Primary)
    - Date range (Subtle)
    - Status badge (Small, icon-only or color dot)
    - Rollup indicators: e.g., "3 children", "2 conflicts" (Icons with tooltips).

### 1.3 Component Hierarchy
```tsx
// src/components/gig/GigHierarchyTree.tsx
interface GigTreeNodeProps {
  gig: Gig;
  depth: number;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  isExpanded: boolean;
}

export const GigHierarchyTree = ({ rootGigId }: { rootGigId: string }) => {
  // Uses useGigHierarchy(rootGigId) hook to fetch the recursive tree via RPC
  // Renders nested GigTreeNode components
};
```

---

## 2. Progressive Disclosure in Gig Forms

To avoid overwhelming simple users while supporting complex hierarchies, we use a progressive disclosure pattern.

### 2.1 Parent Selection (`GigBasicInfoSection`)
- **Default State**: `parent_gig_id` is hidden or set to `null` (Flat mode).
- **Activation**: A toggle "This is a sub-event of another gig" or an "Advanced" section reveals the Parent Gig picker.
- **The Picker**: A searchable combo-box filtered by organization. Prevents circular references (cannot select self or its own descendants).

### 2.2 Inherited Value Visualization
When a gig has a parent, child sections (`Participants`, `Staff Slots`, `Kits`) must handle inherited data.

- **Inherited Indicator**: A subtle "Inherited" badge (e.g., light blue background, info icon) next to items coming from a parent.
- **Override Pattern**:
    - If a user adds a participant for a role already defined in the parent, the local entry **replaces** the inherited one (as per SQL `rank = 1` logic).
    - UI displays: "Overriding [Parent Value]" with a "Revert to Parent" button.
- **Read-Only Inheritance**: Some parent-level staff/kits might be fixed; these appear in the child list but are grayed out or marked "Global Resource" with an "Edit in Parent" link.

### 2.3 Form Flow for Production Companies
1.  Create Master Gig (Festival).
2.  In Master Gig Detail, click "+ Add Sub-Gig".
3.  New Gig Form opens with `parent_gig_id` pre-filled.
4.  Sub-gig inherits dates (bounded by parent), participants, and technical specs.

---

## 3. Mobile PWA & Caching Strategy

GigManager will be an offline-first PWA to support staff in the field (venues, warehouses).

### 3.1 PWA Manifest & Icons
- **`manifest.json` Configuration**:
    - `display`: `standalone` (removes browser chrome).
    - `orientation`: `any`.
    - `theme_color`: `#0ea5e9` (Sky-500).
    - `background_color`: `#f8fafc` (Gray-50).
    - `icons`: Comprehensive set (192x192, 512x512, maskable).

### 3.2 Service Worker Strategy (`vite-plugin-pwa`)
- **Static Assets**: `CacheFirst` for JS, CSS, and Fonts.
- **API Responses**: `StaleWhileRevalidate` for gig lists and details.
- **Background Sync**: Use the Workbox `BackgroundSyncPlugin` to replay failed `POST/PATCH` requests when connectivity returns.

### 3.3 Data Persistence (`idb`)
While the Service Worker caches network responses, we will use `idb` for explicitly managed offline data:
- **`GigStore`**: Local copy of frequently accessed gigs.
- **`OutboxStore`**: Queue of pending local edits (Create/Update/Delete) that need to be synced to Supabase.
- **Conflict Handling**: If a sync fails due to a newer server-side change, notify the user via a "Sync Conflict" toast with an option to "Keep Mine" or "Discard Mine".

---

## 4. Simple vs Complex Organizational Needs

| Feature | Band (Simple) | Production Co (Complex) |
| :--- | :--- | :--- |
| **Gig List** | Flat list of individual shows. | Tree view showing tours and their dates. |
| **Form Entry** | Fast entry of title, date, venue. | Detailed parent/child relationship setup. |
| **Staffing** | Assign specific members. | Inherit global technical staff across 10 sub-gigs. |
| **Equipment** | Simple kit list. | Rollup of equipment needs from all sub-gigs. |

**Key Design Principle**: If `parent_gig_id` is null and `has_children` is false, hide all hierarchy UI elements. The system feels like a flat event manager until complexity is requested.
