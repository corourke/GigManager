### **CSV Import**

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
- [x]  Test import with large datasets (performance)
- [ ]  Verify no data corruption on failed imports

### **User Testing Checklist: Asset & Purchase Import**

#### **1. General Attachment Management**
- [x] **Upload File**: In any `AttachmentManager` section (Asset or Purchase), upload a PDF or image. Verify the file appears in the list.
- [x] **View File**: Click the **Eye** icon. Verify the file opens in a new tab (signed URL).
- [x] **Remove Attachment**: Click the **X** icon and confirm. Verify the attachment is unlinked from the entity.

#### **2. Asset List: Invoice Import**
- [ ] **Upload Invoice**: Click **Upload Invoice** on the Asset List screen. Select a PDF invoice.
- [ ] **Extraction Pulse**: Verify the loading/scanning state appears while the AI processes the file.
- [ ] **Review Dialog**: Verify the `ReviewScannedDataDialog` opens with extracted Vendor, Date, and Total.
- [ ] **Line Item Verification**: Check that individual line items (Manufacturer/Model, Qty, Price) are correctly extracted.
- [ ] **Reconciliation Status**: Verify the "Reconciliation Successful" message if line items sum to the total, or a warning if they don't.
- [ ] **Manual Adjustment**: Edit an extracted price or quantity. Verify the "Total Mismatch" warning updates in real-time.
- [ ] **Persistence**: Click **Confirm and Save**. Verify the new Assets appear in the list with correct costs.
- [ ] **Automatic Linking**: Open one of the newly created assets. Click the **Financials** or **Attachments** tab (if applicable) and verify the source invoice is linked.

#### **3. Gig Screen: Receipt Import**
- [x] **Section Visibility**: Navigate to a Gig and locate the **Purchase Expenses** section.
- [ ] **Upload Receipt**: Use the **Upload Receipt** button. Verify it triggers the same AI extraction flow.
- [ ] **Gig Association**: After saving, verify the Purchase header appears in the Gig's expense list.
- [ ] **Detail View**: Click the **File** icon on a linked expense. Verify the `AttachmentManager` appears below the table, showing the original receipt.
- [ ] **Unlink Expense**: Click the **Trash** icon to unlink. Verify the expense disappears from the Gig but remains in the global Financials/Purchases list.

#### **4. Backend Logic & Allocation**
- [ ] **Cost vs. Price Path**: Test an invoice where some items have a "Price" and others have a "Cost". Verify that `item_cost` is calculated correctly for all items based on the invoice total (including tax/shipping allocation).
- [ ] **Penny Reconciliation**: Use an invoice total like $100.00 with 3 items at $33.33. Verify the 3rd item is adjusted to $33.34 to ensure the total matches exactly.
- [ ] **Data Propagation**: Verify that items created via the AI pipeline correctly inherit the `vendor` and `acquisition_date` from the invoice header.

#### **5. Error Handling & Edge Cases**
- [ ] **Missing API Key**: Temporarily unset `ANTHROPIC_API_KEY` in Supabase. Attempt to scan and verify a clear "ANTHROPIC_API_KEY environment variable is not set" error is toasted.
- [ ] **Invalid File Type**: Attempt to upload a non-PDF/image file (e.g., .txt). Verify the frontend restricts this or shows a proper error.
- [ ] **Network Failure**: Simulate a network disconnection while scanning. Verify the "Network error" message appears.
- [ ] **API Limits**: If possible, simulate a rate limit or large file error from Anthropic. Verify the error message is correctly parsed and displayed.

#### **6. CSV Import (Regression Test)**
- [ ] **A-Z Template**: Generate and download the Asset Template. Verify it contains the new columns (A-Z mapping).
- [ ] **Grouped Import**: Upload a CSV with a Source 0 (Header) followed by Source 1 (Asset) rows. Verify that the assets are correctly grouped and their costs are burdened by the header's total.

---

