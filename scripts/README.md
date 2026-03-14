# GigManager Scripts

## invoice_import.py

Reads PDF purchase receipts/invoices, extracts structured line items via Claude
(or local Ollama), and inserts asset records directly into the Supabase `assets` table.

---

## Native JS/TS Implementation Spec

This section documents the pipeline in enough detail for an agent (or developer) to
re-implement it natively inside the GigManager app — e.g. as a Supabase Edge Function,
a Next.js API route, or a client-side upload flow.

### Overview

The pipeline has six sequential stages. Every stage must succeed before the next runs.
The whole operation is per-file; multiple files are processed one at a time, not batched.

```
PDF file
  │
  ▼
[1] Text extraction      pdfplumber → raw text string (≤ 4000 chars)
  │
  ▼
[2] LLM parsing          Claude API → structured JSON (invoice header + line items)
  │
  ▼
[3] Validation           Check required fields; abort file on failure
  │
  ▼
[4] Row expansion        One DB row per asset unit, serial expansion, cost allocation
  │
  ▼
[5] Supabase insert      assets table, service role key, batch insert
  │
  ▼
[6] File archival        Optional: move PDF to Processed/ subdirectory
```

---

### Stage 1 — PDF Text Extraction

**Python library:** `pdfplumber`
**JS equivalent:** `pdf-parse` (npm) or `pdfjs-dist` (Mozilla PDF.js)

Extract the text content of every page, concatenate with newlines, and truncate to
**4000 characters** before passing to the LLM. The 4000-char limit keeps token costs
manageable and covers virtually all single-invoice PDFs without losing important detail.

If extraction fails for any reason, skip the file entirely and record it as failed.
Do not attempt to insert partial data.

In a native JS implementation running in the browser, use a `FileReader` + `pdf-parse`
in a Web Worker, or send the raw PDF bytes to a Supabase Edge Function that handles
extraction server-side (preferable, since pdf-parse has limited browser support).

---

### Stage 2 — LLM Parsing

**Model:** `claude-haiku-4-5-20251001` (default; any Claude model works)
**Max output tokens:** 2048
**Call pattern:** single user message, expect JSON back

#### System context (embed in user message)

```
You are an inventory assistant for a professional audio/video/lighting production company.
Extract structured data from the invoice or receipt text below and return ONLY a JSON object
with no explanation, markdown, or code fences.
```

#### Category taxonomy (also embed in the prompt)

Guide the LLM toward these values for `category` and `sub_category`. The LLM may go
off-list when nothing fits, which is acceptable.

```
Audio       → Microphone, Speaker, Subwoofer, Amplifier, Mixer, Interface,
              Processor, DI Box, In-Ear Monitor, Headphone, Cable, Connector,
              Accessory, Software
Lighting    → Moving Head, LED Par, Wash, Spot, Strobe, Controller, Cable,
              Truss, Stand, Dimmer, Accessory
Video       → Camera, Display, Projector, Switcher, Scaler, Cable, Accessory
Backline    → Guitar Amp, Bass Amp, Keyboard, Drum Kit, Percussion, Accessory
Staging     → Stage Deck, Leg, Guardrail, Stair, Carpet, Accessory
Cases       → Road Case, Rack Case, Soft Bag, Accessory
Power       → Distribution, Cabling, UPS, Accessory
Networking  → Switch, Router, Cable, Wireless, Accessory
Misc        → (anything that doesn't fit above)
```

#### Requested JSON schema

```json
{
  "invoice_date": "YYYY-MM-DD or null",
  "vendor": "Vendor name or null",
  "invoice_total": 1234.56,
  "line_items": [
    {
      "manufacturer_model": "Brand + Model string",
      "description": "Full line description including bundle/accessory notes",
      "quantity": 2,
      "unit_cost": 499.00,
      "serial_numbers": ["SN001", "SN002"],
      "category": "Audio",
      "sub_category": "Speaker",
      "type": "Powered Speaker"
    }
  ]
}
```

#### Extraction rules (include verbatim in the prompt)

- `manufacturer_model` is **required** for every line item. If the invoice has no clear
  make/model string, use the best descriptive label available.
- **Omit consumables**: batteries, gaff tape, packaging material, shipping charges, taxes.
  These are not trackable assets. (Note: their costs are captured implicitly through the
  cost allocation factor described in Stage 4.)
- If a line item shows `qty > 1` **and** lists individual serial numbers, the LLM should
  expand into one item per serial with `quantity: 1` each. If it doesn't, Stage 4 handles
  the expansion.
- `invoice_date` must be ISO 8601 (`YYYY-MM-DD`). If not found, return `null`.
- `invoice_total` is the **grand total** of the invoice including tax and shipping.
  This is critical for the cost allocation step. Return `null` if not found.
- All cost values are plain numbers — no currency symbols, no commas.

#### LLM output handling

LLMs occasionally wrap JSON in markdown code fences (` ```json ... ``` `). Strip these
before parsing. Use a regex to find the first `{...}` block in the response as a
fallback if the model returns preamble text. In JS:

```js
const fenceStripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
const match = fenceStripped.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(match[0]);
```

---

### Stage 3 — Validation

Abort processing of the file (do not insert anything) if any of these checks fail:

- `line_items` array is present and non-empty
- Every line item has a non-empty `manufacturer_model`
- Every line item has a non-empty `category`

These correspond to the `NOT NULL` constraints on `assets.manufacturer_model` and
`assets.category` in the database schema. Surfacing the error before hitting the DB
gives a cleaner failure message.

---

### Stage 4 — Row Expansion and Cost Allocation

This stage converts the LLM's line item list into the final array of database rows,
handling two things: serial number expansion and invoice total allocation.

#### 4a. Serial number expansion

For each line item:

- If `serial_numbers.length === quantity` and `quantity > 1`: create one row per serial
  number, each with `quantity: 1`. This represents individual, uniquely-trackable assets.
- Otherwise: create a single row with the full `quantity`. If there is exactly one serial
  number, assign it; if there are multiple but they don't match the quantity count,
  join them as a comma-separated string in the `serial_number` field.

#### 4b. Cost allocation factor (Pro-rata)

Invoices from audio/AV vendors (Sweetwater, B&H, etc.) always include tax and often
shipping. Those charges apply to the purchase as a whole but are not broken out per
line item — they inflate the invoice total above the sum of the line item prices.

To give each asset an accurate true cost, we compute a single allocation factor and
apply it to every line item's unit cost. This factor represents the "true dollar cost"
per "invoice dollar spent."

**Calculation:**
```
Factor = Invoice Total / Sum(Unit Cost × Quantity for every line item)
```

**Application:**
For each resulting database row (Asset or Expense):
```
Allocated Cost = Unit Cost × Factor
```

**Penny reconciliation:**
Due to floating-point rounding across multiple rows, the sum of `Allocated Cost × Quantity` 
will often differ from `Invoice Total` by a few cents. To ensure accounting parity:
1. Process all rows except the last one using the factor.
2. Maintain a `Running Total` of all allocated costs.
3. For the final row, use: `Final Cost = (Invoice Total - Running Total) / Final Row Quantity`.

This guarantees `Sum(Allocated Cost × Quantity) === Invoice Total` exactly.

**Skip conditions:** If `Invoice Total` is null, or if the sum of line item costs is
zero, skip allocation entirely and use the raw LLM-extracted unit costs as-is.

---

### Stage 5 — Supabase Insert

**Table:** `public.assets`
**Auth:** service role key (bypasses RLS). The anon key will be rejected by the
`"Admins and Managers can manage assets"` RLS policy unless the request carries a valid
user JWT with the right org role. For a server-side implementation, service role is simpler.
For a client-side UI flow, use the user's session JWT instead.

**Insert method:** batch insert all rows for a given invoice in a single call.
Roll back (don't insert any rows) if the insert fails.

#### Field mapping

| DB column | Source | Notes |
|---|---|---|
| `organization_id` | Config / UI context | UUID; required |
| `acquisition_date` | `invoice_date` from LLM | Fall back to today's date if null |
| `vendor` | `vendor` from LLM | Nullable |
| `cost` | Allocated unit cost | Nullable if LLM didn't extract a price |
| `category` | `category` from LLM | Required; use "Misc" as last resort |
| `sub_category` | `sub_category` from LLM | Nullable |
| `insurance_policy_added` | Hardcoded `false` | User sets this in the UI later |
| `manufacturer_model` | `manufacturer_model` from LLM | Required; NOT NULL in schema |
| `type` | `type` from LLM | Nullable; short practical label |
| `serial_number` | From serial expansion | Nullable |
| `description` | `description` from LLM | Nullable |
| `replacement_value` | Not available at import time | Leave `null`; user fills in UI |
| `insurance_class` | Not available at import time | Leave `null`; user fills in UI |
| `quantity` | From serial expansion | Integer; defaults to 1 |
| `status` | Hardcoded `"Active"` | From `assets.status` default (mobile v1 schema) |
| `tag_number` | Not on invoices | Leave `null` |
| `created_by` | Authenticated user UUID | Required; NOT NULL |
| `updated_by` | Authenticated user UUID | Required; NOT NULL |

`replacement_value` and `insurance_class` are intentionally left null — they require
judgment that isn't available from a purchase invoice and are better filled in the UI.

---

### Stage 6 — File Archival (optional)

After a successful insert, move the source PDF to a `Processed/` subdirectory alongside
the source directory. This prevents re-processing on the next run.

In a native app context this stage would likely become an audit log entry or a status
flag on an `invoice_imports` table rather than a filesystem move.

---

### Suggested Native Integration Points

**UI entry point:** An "Import from Invoice" button on the Assets list page. Accepts one
or more PDF file uploads.

**Processing:** A Supabase Edge Function (`/functions/server/invoice-import`) that accepts
the PDF bytes, runs stages 1–4, returns the proposed rows as JSON for the user to review
in a preview table before confirming the insert (stage 5). This makes dry-run the default
and puts the user in control before anything hits the database.

**Preview UI:** Show the extracted rows in an editable table — the user can correct the
LLM's category/type guesses, adjust costs, or remove rows before confirming.

**Post-import:** Tag the resulting asset records with the source filename and import
timestamp (add an `import_source` column or a separate `asset_imports` table) so there's
an audit trail back to the original PDF.

---

## Quick-start (Python CLI)

### Dependencies

```bash
pip3 install pdfplumber anthropic supabase --break-system-packages
```

### Environment variables

| Variable | Source | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` (already present) | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API | **Service role** key — not the anon key |
| `ANTHROPIC_API_KEY` | Anthropic console | Skip if using `--ollama` |
| `GIGMANAGER_ORG_ID` | Supabase `organizations` table | UUID of the org to assign assets to |
| `GIGMANAGER_USER_ID` | Supabase auth.users | UUID for `created_by` / `updated_by` |

```bash
export $(grep -v '^#' .env.local | xargs)
export SUPABASE_SERVICE_KEY=your_service_role_key
export ANTHROPIC_API_KEY=your_key
export GIGMANAGER_ORG_ID=your_org_uuid
export GIGMANAGER_USER_ID=your_user_uuid
```

### Usage

```bash
# Dry run first — always recommended
python3 scripts/invoice_import.py --dir ~/Downloads/Invoices --dry-run

# Single file
python3 scripts/invoice_import.py ~/Downloads/sweetwater_invoice.pdf

# Whole directory, move successes to Processed/
python3 scripts/invoice_import.py --dir ~/Downloads/Invoices --move-processed

# Use local Ollama when Anthropic credits are unavailable
python3 scripts/invoice_import.py --dir ~/Downloads/Invoices --ollama qwen2.5:7b-instruct --dry-run
```

The dry-run output shows the allocation factor, the raw line-item sum, and the
post-allocation sum so you can verify the math before committing anything to the database.
