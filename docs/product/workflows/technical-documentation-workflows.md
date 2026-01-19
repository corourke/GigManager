# Technical Documentation Workflows

**Purpose**: This document describes file attachment, stage plot creation, technical documentation, and annotation workflows for GigManager.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover how users upload and manage attachments (contracts, stage plots, manuals), create technical documentation (input lists, packout checklists), and add notes/annotations to entities. Most technical documentation features are **deferred** but represent important future functionality.

---

## Flow 1: Attachments & File Management

**User Journey:**

**Upload Files to Gig:**
1. User views gig detail screen (`/gigs/[gig_id]`)
2. User clicks "Attachments" tab
3. User sees existing attachments (if any):
   - Stage plot (PDF)
   - Input list (Excel)
   - Contract (PDF)
4. User clicks "Upload File" button
5. File picker dialog opens (or drag-and-drop area)
6. User selects file(s) from device
7. Upload progress bar displays
8. Upon completion:
   - File added to attachment list
   - Thumbnail generated (for images/PDFs)
   - File metadata captured (name, size, type, upload date, uploaded by)
9. User can:
   - Click file to preview (in-browser for PDFs/images)
   - Download file
   - Rename file
   - Delete file
   - Add file description/tags

**Upload Files to Organization:**
1. User navigates to Organizations → [Organization Name] → Files tab
2. Similar upload flow as gigs
3. Attachment types:
   - Contracts
   - Insurance certificates
   - W-9 forms
   - Vendor agreements
   - Licenses/permits
4. Files are private to the tenant (not shared with other organizations)

**Upload Files to Assets:**
1. User views asset detail screen (`/assets/[asset_id]`)
2. User clicks "Attachments" tab
3. Upload flow same as above
4. Attachment types:
   - Purchase receipts
   - Product manuals
   - Warranty documents
   - Calibration certificates
   - Photos of equipment

**Upload Files to Kits:**
1. User views kit detail screen (`/kits/[kit_id]`)
2. User clicks "Attachments" tab
3. Attachment types:
   - Packing lists
   - Setup diagrams
   - Transport manifests
   - Photos of packed kit

**Screens Required:**
- **Attachments Tab** (within gig/organization/asset/kit detail screens)
  - File list (table or grid view)
  - Upload button
  - Drag-and-drop zone
  - File preview modal
  - File actions menu (download, rename, delete)
- **File Upload Dialog**
  - File picker
  - Upload progress indicators
  - Multi-file upload support
  - File type validation
  - Size limit warning (e.g., max 10 MB per file)

**Current Implementation Status:**
- 🚫 Deferred - no file attachment system exists
- 🔧 Requires Supabase Storage or similar file storage service

**Technical Requirements:**
- File storage: Supabase Storage (S3-compatible)
- Database: `attachments` table (entity_type, entity_id, file_url, file_name, file_type, file_size, uploaded_by, uploaded_at)
- Access control: RLS policies to enforce file access permissions
- File types supported: PDFs, images (JPG, PNG), documents (DOC, XLSX), CAD files (DWG, DXF)
- Size limits: 10 MB per file, 100 MB total per entity
- Virus scanning: Integrate ClamAV or cloud service (VirusTotal)
- Thumbnail generation: For images and PDF first page

**Mobile Considerations:**
- Camera integration (take photo and upload)
- Document scanner (OCR for receipts)
- Native file picker
- Progressive upload (resume on connection loss)

---

## Flow 2: Stage Plots & Technical Documentation

**User Journey:**

**Create Stage Plot:**
1. User views gig detail screen
2. User clicks "Stage Plot" tab
3. Options:
   - Upload existing stage plot (PDF/image)
   - Create new stage plot (interactive editor)
4. If creating new:
   - **Stage Plot Editor** opens:
     - Canvas with drag-and-drop elements
     - Toolbar with common items:
       - Microphones (dynamic, condenser, wireless)
       - Instruments (drums, guitar amp, keyboard)
       - Monitors (wedge, IEM)
       - Speakers (mains, subs)
       - Stage elements (riser, stairs, backdrop)
     - User drags items onto canvas
     - User positions and rotates items
     - User labels items (e.g., "Vocal Mic 1")
     - User adds dimensions (stage width/depth)
   - User clicks "Save"
   - Stage plot saved as SVG or PDF
   - Attached to gig
5. User can:
   - Share stage plot with venue (email PDF)
   - Print stage plot
   - Export as image (PNG)

**Create Input List:**
1. User views gig detail screen
2. User clicks "Input List" tab
3. User sees table editor:
   - Columns: Channel #, Input Source, Mic/Line, Stand, Cable Length, Phantom Power, Notes
   - Pre-populated from kit (if kit assigned)
4. User adds rows for each input:
   - Channel 1: Kick Drum, Shure Beta 52A, Short Boom, 25', No
   - Channel 2: Snare Top, Shure SM57, Short Boom, 25', No
   - Channel 3: Vocal 1, Shure SM58, Tall Boom, 50', No
5. User clicks "Save"
6. Input list stored in database
7. User can:
   - Export to Excel/CSV
   - Print input list
   - Share with sound engineer

**Create Packout Checklist:**
1. User assigns kit to gig
2. System auto-generates packout checklist from kit assets:
   - Section 1: Microphones
     - ☐ 4x Shure SM58
     - ☐ 2x Shure SM57
   - Section 2: Cables
     - ☐ 10x 25' XLR cables
     - ☐ 5x 50' XLR cables
   - Section 3: Stands
     - ☐ 6x Boom mic stands
3. User can:
   - Add custom items (not in kit)
   - Reorder items
   - Group items by case/road case
4. On gig day:
   - User opens checklist on mobile
   - User checks off items as they pack
   - Progress indicator shows completion %
   - Checklist saved (can reference for returns)

**Screens Required:**
- **Stage Plot Editor** (`/gigs/[gig_id]/stage-plot`)
  - Canvas (grid-based)
  - Element toolbar
  - Properties panel (position, rotation, label)
  - Save/export buttons
- **Input List Editor** (`/gigs/[gig_id]/input-list`)
  - Editable table
  - Add/remove row buttons
  - Import from template
  - Export buttons
- **Packout Checklist** (`/gigs/[gig_id]/packout`)
  - Checklist items (grouped)
  - Checkboxes
  - Progress indicator
  - Print button

**Current Implementation Status:**
- 🚫 Deferred - stage plot editor not prioritized
- ⏸️ Input lists could be implemented as enhanced notes field
- ⏸️ Packout checklist could be generated from kit data

**Technical Requirements:**
- Stage plot editor: Canvas library (Fabric.js, Konva.js)
- SVG/PDF export: jsPDF, svg2pdf
- Input list storage: JSON field in gigs table or separate `input_lists` table
- Packout checklist: Generated from `kit_assets` join query

**Mobile Considerations:**
- Stage plot editor challenging on mobile (desktop-first)
- Input list editing: spreadsheet-like interface (scroll horizontally)
- Packout checklist optimized for mobile (large checkboxes)

---

## Flow 3: Notes & Annotations

**User Journey:**

**Add Notes to Gig:**
1. User views gig detail or create/edit gig screen
2. User sees "Notes" field (Markdown editor)
3. User types notes:
   ```
   ## Load-In Instructions
   - Arrive at venue by 2:00 PM
   - Load in through rear entrance
   - Park in designated area (lot B)

   ## Special Requirements
   - Band requires **green room** with water and snacks
   - Soundcheck at 5:00 PM sharp
   ```
4. Markdown rendered with formatting
5. User can:
   - Bold, italic, lists, headers, links
   - Preview mode (toggle)
   - Insert images (via URL)
6. Notes saved to `gigs.notes` field

**Add Private Notes to Shared Organization:**
1. User views organization detail screen (e.g., a venue)
2. Organization is shared across all tenants
3. User clicks "Private Notes" tab (tenant-specific)
4. User adds private notes visible only to their organization:
   ```
   Venue contact prefers email over phone.
   Parking can be difficult on weekends - arrive early.
   Last gig: Stage was smaller than advertised.
   ```
5. Notes stored in separate `organization_annotations` table:
   - Columns: organization_id, annotated_org_id, tenant_id, notes
6. Other tenants viewing same organization cannot see these notes

**Add Tags to Assets:**
1. User views asset detail screen
2. User sees "Tags" field
3. User adds tags: `fragile`, `high-value`, `requires-case`
4. Tags displayed as colored chips
5. User can filter asset list by tags
6. Tags stored as array in `assets.tags` field

**Search Across Notes:**
1. User navigates to Dashboard → Search
2. User types search query: "green room"
3. System searches across:
   - Gig notes
   - Asset notes
   - Kit notes
   - Organization private notes
4. Results displayed with:
   - Entity type (Gig, Asset, etc.)
   - Entity name
   - Matching snippet (highlighted search term)
   - Link to entity

**Screens Required:**
- **Markdown Editor Component** (reusable across all notes fields)
  - Toolbar (bold, italic, list, header, link, image)
  - Edit mode / Preview mode toggle
  - Syntax highlighting
  - Auto-save (draft saved every 10 seconds)
- **Private Notes Tab** (within organization detail screen)
  - Notes editor
  - Save button
  - Indicator: "Private - only visible to [Organization Name]"
- **Tags Input Component** (reusable)
  - Multi-select dropdown
  - Create new tag inline
  - Tag color picker
- **Search Screen** (`/search`)
  - Search input
  - Filter by entity type
  - Results list

**Current Implementation Status:**
- ✅ Markdown editor implemented (MarkdownEditor.tsx component)
- ✅ Notes fields exist on gigs, assets, kits, organizations
- ⏸️ Private notes on shared organizations - unclear if implemented
- ⏸️ Tags partially implemented (gigs have tags, unclear for assets)
- ⏸️ Full-text search not implemented

**Technical Requirements:**
- Markdown library: react-markdown, marked, or remark
- Markdown editor: SimpleMDE, EasyMDE, or custom component
- Full-text search: PostgreSQL full-text search (tsvector, tsquery) or Algolia
- Tag management: Array field in database, indexed for performance

**Mobile Considerations:**
- Simplified Markdown toolbar (fewer options)
- Large tap targets
- Voice-to-text input
- Tag selection via bottom sheet

---

## Flow 4: Version Control & Document History

**User Journey:**

**Track Document Versions:**
1. User uploads new stage plot to gig
2. Gig already has existing stage plot (v1)
3. System prompts: "A stage plot already exists. Do you want to replace it or keep both versions?"
4. User selects "Keep both versions"
5. System stores:
   - Stage Plot v1 (original)
   - Stage Plot v2 (new upload)
6. Attachments tab shows both files with version labels
7. User can:
   - View version history
   - Compare versions (side-by-side for images)
   - Restore previous version
   - Delete old versions

**View Revision History:**
1. User views gig notes field
2. User clicks "History" button
3. Modal opens showing:
   - List of revisions (date, user, summary)
   - Diff view (highlighted changes)
4. User can:
   - Restore previous revision
   - View who made changes and when
5. Revision history stored in `gig_notes_history` table

**Screens Required:**
- **Version History Modal**
  - Timeline of versions
  - Diff view
  - Restore button
  - Delete version button

**Current Implementation Status:**
- 🚫 Deferred - version control not prioritized

**Technical Requirements:**
- File versioning: Store multiple file versions in storage with version suffix
- Revision history: Separate table with previous values and timestamps
- Diff algorithm: For text-based fields (notes, input lists)

**Mobile Considerations:**
- Swipe between versions
- Tap to restore
- Bottom sheet for version list

---

## Flow 5: Collaborative Editing (Future Enhancement)

**User Journey:**

**Real-Time Collaboration:**
1. Two users viewing same gig detail screen
2. User A edits notes field
3. User B sees live cursor position and typing indicator
4. User A saves changes
5. User B sees changes reflected immediately
6. Conflict resolution:
   - If both users edit simultaneously → Show merge dialog
   - Option to accept User A's changes, User B's changes, or merge manually

**Comment Threads:**
1. User highlights text in notes field
2. User clicks "Add Comment"
3. Comment box appears:
   - User types: "Should we confirm green room availability?"
   - User tags another user: "@JohnDoe"
4. Tagged user receives notification
5. Tagged user replies to comment thread
6. Comment thread saved and displayed alongside notes

**Screens Required:**
- **Live Editing Indicators** (cursor positions, user avatars)
- **Comment Sidebar** (show all comment threads)
- **Merge Conflict Dialog** (compare and resolve)

**Current Implementation Status:**
- 🚫 Deferred - collaborative features not prioritized

**Technical Requirements:**
- Real-time sync: Supabase Realtime or WebSockets
- Operational transformation: For conflict-free collaborative editing (CRDT libraries)
- Comment storage: `comments` table linked to entity and field

---

## Common UI Components

### Markdown Editor
- Toolbar with formatting buttons
- Edit mode (raw Markdown) and Preview mode
- Syntax highlighting
- Auto-save indicator
- Character count (optional)

### File Upload Zone
- Drag-and-drop area with dashed border
- "Click to upload" fallback
- Upload progress bar
- File type/size validation messages
- Multi-file selection

### File Preview
- Inline preview for images (thumbnail + lightbox)
- PDF viewer (embedded iframe or PDF.js)
- Document viewer for Office files (Google Docs Viewer)
- Download button for unsupported types

### Tag Input
- Multi-select dropdown
- Create new tag inline (+ button)
- Tag chips with remove button (X)
- Color-coded tags

### Attachment List
- Table view: Name, Type, Size, Uploaded By, Date, Actions
- Grid view: Thumbnails with overlay metadata
- Sort by date, name, type, size
- Filter by type (PDFs, images, documents)

---

## Related Documentation

- [Requirements: Technical Documentation](../requirements.md#9-technical-documentation)
- [Feature Catalog: Technical Documentation](../feature-catalog.md#9-technical-documentation)
- [Gig Management Workflows](./gig-management-workflows.md) - Related gig workflows
- [Equipment Management Workflows](./equipment-management-workflows.md) - Asset attachment workflows

---

**Last Updated**: 2026-01-18  
**Status**: Planning Document - Features mostly deferred
