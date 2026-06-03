# Product Requirements Document: Financial Data Entry Improvements & Mobile Visibility

## 1. Purpose
This feature aims to align the mobile and web financial experiences, providing visibility into gig financials on mobile and streamlining data entry across both platforms. The focus is on "making simple gigs simple" through a unified, button-driven input flow.

## 2. Target Users
- **Admins & Managers**: Primary users who need to view and record financials in the field and at the desk.

## 3. Functional Requirements

### 3.1 Unified Streamlined Input (Web & Mobile)
Replace the generic "Add Record" button with a set of common "Quick Action" buttons. These buttons initiate the "Type First" selection flow with intelligent defaults.

- **"Agreement" Button**: 
    - Defaults to `Informal Terms`.
    - Dialog allows "upgrading" to `Bid Accepted` or `Contract Signed` via a toggle or selector.
    - Fields: Date, Amount, Description. Toggle to expose: Counterparty, External Entity, Notes.
- **"Payment" Button**:
    - Defaults to `Payment Received`.
    - Options for `Deposit Received`.
    - Fields:  Date, Paid Date (default to today), Amount, Reference Number,  Description. Toggle to expose Counterparty, External Entity, Notes. 
- **"Expense / Mileage" Button**:
    - Options for `Simple Expense` (Manual) or `Mileage`.
    - **Mileage Sub-flow**: Fields for Date, Distance (miles) OR Start and End odometer reading, Description. 
    - **Expense Sub-flow**: Fields for Date, Amount, Category, Description. Toggle to expose 
- **"Other" Button**:
    - Opens the full financial entry modal with all 24 transaction types and advanced fields (Reference #, Counterparty, etc.).

### 3.2 Mobile Financial Visibility
Introduce a new **Financials Section** to the `MobileGigDetail` screen, matching the summary logic of the web version.

- **Summary Cards**:
    - **Contract**: Total agreed amount.
    - **Received**: Total payments/deposits received.
    - **Costs**: Total actual costs + projected staff.
- **Transaction List**:
    - Show a simplified list of key transactions:
        - All Revenue records (`Contract Signed`, `Informal Terms`, etc.).
        - All Payment records.
        - High-level Expense records (grouped or summarized).
    - **Hidden on Mobile**: Deeply technical tracking records (e.g., specific Invoice revisions) unless expanded.
- **Detail View**: Tapping a transaction shows its full details (Notes, Category, Source indicator).

### 3.3 Mileage Tracking Refinement
- **Rate Per Mile** -- Pull in official mileage expense rates from IRS publications. 
- **Automatic Calculations**: Distance × Rate = Amount.
- **IRS Alignment**: Force category to `Car and truck expenses`.
- **Notes Storage**: Store "X miles @ $Y/mile" automatically in the notes field.

## 4. UI/UX Standards
- **Platform Alignment**: Attempt to align functionality and layout between Web and Mobile to ensure a consistent mental model.
- **Progressive Disclosure**: Only show the complex fields (Counterparty, Reference Number, etc.) in the "Other" flow or when a user togles the extended dialog in a simple flow.

## 5. Business Rules
- **Access Control**: Financial visibility and entry remain restricted to **Admin** and **Manager** roles on both platforms.
- **Roles**: Staff and Viewers do not see the Financials section or the Quick Action buttons.

## 6. Verification Approach
- [ ] Verify unified "Quick Action" buttons appear on both Web and Mobile.
- [ ] Verify "Agreement" button correctly defaults to `Informal Terms` and allows upgrading.
- [ ] Verify the Financials Summary and Transaction List appear on mobile for Admins.
- [ ] Verify mileage calculation and categorization.
- [ ] Verify that Staff roles cannot see financial data on mobile.
