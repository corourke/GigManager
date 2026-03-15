#### **CSV Template & Generation**

- [x]  Download asset import template and verify it contains all 26 columns
- [ ]  Verify template includes proper example data (header row + asset row)
- [ ]  Confirm column headers match the spreadsheet specification

#### **Basic Import Scenarios**

- [ ]  Import CSV with single asset (source=1) - verify successful import
- [ ]  Import CSV with header row (source=0) + asset rows - verify grouping works
- [ ]  Import CSV with expense items (source=2) - verify cost allocation

#### **Cost Allocation Testing**

-  Test pro-rata allocation: Header $1000 total, 2 items at $300 each → verify $400 allocation each
-  Test penny reconciliation: Header $100 total, 3 items at $33.33 each → verify last item gets $33.34
-  Test edge case: Header $0 total → verify no allocation applied
-  Test mixed pricing: Items with different `item_price` vs `item_cost` values

#### **Validation & Error Handling**

-  Test invalid source values (not 0, 1, or 2) → should show validation error
-  Test missing required fields for each source type
-  Test invalid numeric values (negative costs, invalid dates)
-  Test quantity validation (must be ≥ 1)

#### **Data Mapping Verification**

-  Verify all 26 columns map correctly to database fields
-  Test legacy field aliases (e.g., `cost_per_item` → `item_cost`)
-  Test date format handling (various formats)
-  Test insurance class vs insurance category mapping

#### **Integration Testing**

-  Test import with existing asset data (no conflicts)
-  Verify imported assets appear correctly in asset list
-  Test import with large datasets (performance)
-  Verify no data corruption on failed imports