# Product Requirements Document: Hierarchical Kits

## 1. Overview
The GigManager application currently supports "Kits" which are flat collections of "Assets". This document specifies the requirements for extending Kits to be hierarchical, allowing kits to be added to other kits. This will enable better organization, reuse of common equipment groupings, and more accurate representation of complex equipment setups (e.g., a "Lighting Rig" kit containing several "Fixture kits").

## 2. Goals
- Support nesting of kits within other kits to any reasonable depth.
- Improve equipment management efficiency by allowing reuse of kit definitions.
- Maintain compatibility with existing inventory tracking and gig assignment workflows.

## 3. User Personas
- **Inventory Manager**: Needs to define and manage complex equipment hierarchies.
- **Rigger / Lead Technician**: Needs to see the full breakdown of assigned kits to ensure all components are present.
- **Warehouse Staff**: Needs to scan/track kits and their nested contents during check-in/out.

## 4. Functional Requirements

### 4.1. Hierarchy Management
- **Add Sub-Kits**: Users must be able to add existing kits as components of a parent kit.
- **Quantity Support**: Users must be able to specify how many of each sub-kit are included in the parent kit.
- **Many-to-Many Relationships**: A kit can be a sub-kit of multiple parent kits.
- **Circular Reference Prevention**: The system must prevent a kit from being added to its own hierarchy (direct or indirect).
- **Infinite Depth (Theoretical)**: While practical depth is likely 2-4 levels, the system should support arbitrary depth within performance constraints.

### 4.2. Visualization
- **Recursive Content View**: When viewing a kit, the user should see a flattened list of all assets (with aggregated quantities) AND a hierarchical view of sub-kits.
- **"Where Used" Analysis**: Users should be able to see which parent kits contain a specific kit.

### 4.3. Gig Assignments
- **Recursive Assignment**: When a parent kit is assigned to a gig, all of its nested sub-kits and assets are implicitly assigned.
- **Inventory Manifests**: The packing list/manifest for a gig must correctly show the full hierarchy of equipment.

### 4.4. Inventory Tracking
- **Container Logic**: If a kit is marked as a `container`, scanning it should ideally provide the option to automatically mark all its contents (assets and sub-kits) as scanned/present.
- **Status Propagation**: Changes in a parent kit's location/status should optionally propagate to its nested contents, depending on the scanning mode.

## 5. Non-Functional Requirements
- **Performance**: Recursive lookups must be optimized (e.g., using recursive CTEs or cached flattened views) to avoid slow UI loading.
- **Data Integrity**: Enforce constraints to prevent orphaned kit-links or circularities.

## 6. Open Questions & Assumptions
- **Assumption**: Rental values are additive. The total rental value of a kit is its own value plus the value of all its constituent assets and sub-kits.
- **Question**: Should we allow assets and sub-kits to be mixed in the same kit? (Requirement: Yes, this is essential).
- **Question**: How should "Conflict Detection" handle nested kits? (Assumption: Conflicts are detected at the asset level, summing up all requirements across all assigned kits).

## 7. Feasibility Evaluation (Product Manager Perspective)
Hierarchical kits are a high-value but high-complexity feature. The primary technical challenge is the recursive nature of the data, which affects almost every part of the equipment workflow: database queries, conflict detection logic, and UI tree components.

**Recommendation**: Proceed with a phase-based implementation. 
- **Phase 1**: Data model and basic CRUD for sub-kits.
- **Phase 2**: Recursive fetching and basic visualization.
- **Phase 3**: Integration with conflict detection and inventory tracking.
- **Phase 4**: Advanced UI (drag-and-drop hierarchy management).

Given the current architecture, a separate `kit_kit_links` junction table is recommended over modifying `kit_assets` to maintain clarity and separate concerns.
