#### **CSV Template & Generation**

- [x]  Download asset import template and verify it contains all 26 columns
- [x]  Verify template includes proper example data (header row + asset row)
- [x]  Confirm column headers match the spreadsheet specification

#### **Basic Import Scenarios**

- [x]  Import CSV with single asset (source=1) - verify successful import
- [x]  Import CSV with header row (source=0) + asset rows - verify grouping works
- [x]  Import CSV with expense items (source=2) - verify cost allocation

#### **Cost Allocation Testing**

- [x]  Test pro-rata allocation: Header $1000 total, 2 items at $300 each → verify $400 allocation each
- [x]  Test penny reconciliation: Header $100 total, 3 items at $33.33 each → verify last item gets $33.34
- [x]  Test edge case: Header $0 total → verify no allocation applied
- [x]  Test mixed pricing: Items with different `item_price` vs `item_cost` values

#### **Validation & Error Handling**

- [x]  Test invalid source values (not 0, 1, or 2) → should show validation error
- [x]  Test missing required fields for each source type
- [x]  Test invalid numeric values (negative costs, invalid dates)
- [x]  Test quantity validation (must be ≥ 1)

#### **Data Mapping Verification**

- [x]  Verify all 26 columns map correctly to database fields
- [x]  Test legacy field aliases (e.g., `cost_per_item` → `item_cost`)
- [x]  Test date format handling (various formats)
- [x]  Test insurance class vs insurance category mapping

#### **Integration Testing**

- [x]  Test import with existing asset data (no conflicts)
- [x]  Verify imported assets appear correctly in asset list
- [ ]  Test import with large datasets (performance)
- [ ]  Verify no data corruption on failed imports