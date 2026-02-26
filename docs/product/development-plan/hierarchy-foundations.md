# Technical Detail: Hierarchy Foundations

This document details the technical implementation strategy for the Hierarchical Gig Structure and the Flexible CSV Mapping Architecture in GigManager.

## 1. SQL Recursive CTEs & Schema Strategy

### 1.1 `get_gig_hierarchy(root_id UUID)`
Returns the entire subtree starting from a given gig.

```sql
CREATE OR REPLACE FUNCTION public.get_gig_hierarchy(root_id UUID)
RETURNS SETOF public.gigs
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH RECURSIVE gig_tree AS (
      -- Base case: the root gig
      SELECT *
      FROM public.gigs
      WHERE id = root_id
    UNION ALL
      -- Recursive step: find children of the current tree nodes
      SELECT g.*
      FROM public.gigs g
      JOIN gig_tree gt ON g.parent_gig_id = gt.id
  )
  SELECT * FROM gig_tree;
$$;
```

### 1.2 `get_effective_participants(p_gig_id UUID)`
Returns participants for a gig, including inherited ones from parents. Child-defined participants for the same organization role override parent-defined ones.

```sql
CREATE OR REPLACE FUNCTION public.get_effective_participants(p_gig_id UUID)
RETURNS TABLE (
    organization_id UUID,
    role public.organization_type,
    notes TEXT,
    is_inherited BOOLEAN,
    source_gig_id UUID
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hierarchy AS (
        SELECT id, parent_gig_id, 0 as distance
        FROM public.gigs
        WHERE id = p_gig_id
      UNION ALL
        SELECT g.id, g.parent_gig_id, h.distance + 1
        FROM public.gigs g
        JOIN hierarchy h ON g.id = h.parent_gig_id
    ),
    all_participants AS (
        SELECT 
            gp.organization_id, 
            gp.role, 
            gp.notes, 
            h.distance,
            h.id as source_id
        FROM public.gig_participants gp
        JOIN hierarchy h ON gp.gig_id = h.id
    ),
    ranked_participants AS (
        SELECT 
            ap.*,
            ROW_NUMBER() OVER(PARTITION BY ap.role ORDER BY ap.distance ASC) as rank
        FROM all_participants ap
    )
    SELECT 
        rp.organization_id, 
        rp.role, 
        rp.notes, 
        (rp.distance > 0) as is_inherited,
        rp.source_id as source_gig_id
    FROM ranked_participants rp
    WHERE rp.rank = 1;
END;
$$;
```

### 1.3 `get_effective_kits(p_gig_id UUID)`
Similar to participants, this function will resolve the "effective" equipment assignments by traversing the hierarchy.

---

## 2. Service Layer: Hierarchy-Aware Fetching

### 2.1 `gig.service.ts` Enhancements
- **`getGig(gigId: string)`**:
    - Update to fetch `parent_gig_id` and `hierarchy_depth`.
    - Optionally fetch inherited data via the new SQL functions if requested by the UI.
    - Add a `fetchHierarchy` flag to return breadcrumbs (all parents up to root).
- **`getGigsForOrganization(organizationId: string)`**:
    - Modify to support filtering by "Top Level Only" vs "All".
    - Enhance return objects to include a `child_count` or `has_children` boolean.

---

## 3. Flexible CSV Mapping Architecture

The current import logic in `ImportScreen.tsx` and `csvImport.ts` uses hardcoded header names. We will shift to a dynamic mapping engine.

### 3.1 Mapping Data Structure
```typescript
interface ColumnMapping {
  internalField: string;      // e.g., 'title', 'start', 'end'
  csvHeader: string;         // e.g., 'Event Name', 'Start Date', 'Start'
  defaultValue?: any;
  transform?: (val: string) => any;
}
```

### 3.2 The Mapping Workflow
1.  **Preview Phase**: Parse the first row of the CSV to extract available headers.
2.  **Mapping Step**: Present a UI (`HeaderMapper.tsx`) that allows the user to:
    - Select an "Internal Field" (required fields marked).
    - Map it to a "CSV Header" from a dropdown of extracted headers.
    - Save mappings as a "Template" for future use.
3.  **Execution Phase**:
    - `parseAndValidateCSV` receives the mapping object.
    - It iterates through the CSV rows, extracting data using the `csvHeader` keys and assigning them to the `internalField` keys in the normalized object.

### 3.3 Implementation Priorities
- **Asset Import**: Prioritize `serial_number` as the uniqueness key to allow for bulk updates (upserts) rather than just inserts.
- **Auto-Kitting**: If an asset row contains a `kit_name`, the importer will automatically group those assets into a new or existing Kit for the organization.

---

## 4. Verification & Alignment
- **SQL Accuracy**: Recursive CTEs will be tested against depth limits to ensure performance with 500+ hierarchical gigs.
- **Type Safety**: Update `src/utils/supabase/types.ts` to include hierarchy-related fields.
- **Component Mocking**: Ensure `GigHierarchyTree` can be tested in isolation with mock hierarchical data.
