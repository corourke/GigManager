# GigManager Scripts

## Spreadsheet Import (Columns A-Z)

The system supports a comprehensive 26-column spreadsheet import for assets and expenses. The mapping follows the legacy Act4Audio format with enhanced fields.

### Source Types
- **0-Invoice**: Header row. Defines the vendor, date, and total invoice amount.
- **1-Asset**: Individual trackable equipment.
- **2-Expense**: Non-trackable expense items (shipping, tax, small parts).

### Column Mapping (A-Z)

| Col | CSV Column Name | Req? | Type | Notes |
|---|---|---|---|---|
| A | `acquisition_date` | Yes | Date | YYYY-MM-DD |
| B | `source` | Yes | Enum | 0, 1, or 2 |
| C | `vendor` | Yes* | String | *Req for Header |
| D | `total_inv_amount` | Yes* | Number | *Req for Header |
| E | `payment_method` | No | String | e.g. Visa, Amex |
| F | `line_amount` | No* | Number | *Req for Item if no price |
| G | `line_cost` | No | Number | Computed if empty |
| H | `quantity` | Yes | Integer | Default: 1 |
| I | `item_price` | No | Number | Selling price |
| J | `item_cost` | No | Number | Burdened cost |
| K | `manufacturer_model` | Yes* | String | *Req for Asset |
| L | `category` | Yes* | String | e.g. Audio, Video |
| M | `sub_category` | No | String | Older sheets only: fills Type when Type is empty |
| N | `type` | No | String | e.g. Dynamic Mic |
| O | `kit` | No | String | Add to named kit |
| P | `serial_number` | No | String | |
| Q | `tag_number` | No | String | |
| R | `description` | No | String | |
| S | `insured` | No | Boolean | |
| T | `insurance_class` | No | String | |
| U | `replacement_value` | No | Number | |
| V | `retired_on` | No | Date | |
| W | `liquidation_amt` | No | Number | |
| X | `service_life` | No | Integer | Years |
| Y | `dep_method` | No | String | e.g. MACRS |
| Z | `status` | No | Enum | e.g. Active |

### Cost Allocation Logic
For each purchase group (Header + Items):
1. **Factor** = `Invoice Total / Sum(Item Price * Quantity)`.
2. **Line Cost** = `(Item Price * Quantity) * Factor`.
3. **Item Cost** = `Line Cost / Quantity`.
4. **Penny Reconciliation**: The final item's cost is adjusted so that `Sum(Line Cost) == Invoice Total`.

---

## Native Implementation (Edge Function) Setup

The `ai-scan` Edge Function requires an Anthropic API key to process PDFs.

### Configuration

1. **API Key**: Obtain a paid API key from the [Anthropic Console](https://console.anthropic.com/).
2. **Supabase Secret**: Add the key to your Supabase project:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=your_key_here
   ```
   Alternatively, add it via the Supabase Dashboard under **Project Settings -> Edge Functions -> Secrets**.
