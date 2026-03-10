#!/usr/bin/env python3
"""GigManager Invoice Import
Reads PDF purchase receipts/invoices, extracts structured line items via
Claude API, and inserts asset records into the GigManager Supabase database.

Adapted from the Act4Audio inventory pipeline (act4inventory/extract_pdfs.py
and the act4-daily-scan cron job logic).

Usage:
  python3 invoice_import.py invoice.pdf [invoice2.pdf ...]
  python3 invoice_import.py --dir ~/Downloads/Invoices
  python3 invoice_import.py --dir ~/Downloads/Invoices --dry-run
  python3 invoice_import.py --dir ~/Downloads/Invoices --move-processed

Required environment variables:
  VITE_SUPABASE_URL       Supabase project URL (already in .env.local)
  SUPABASE_SERVICE_KEY    Service role key (bypasses RLS; NOT the anon key)
  ANTHROPIC_API_KEY       Claude API key
  GIGMANAGER_ORG_ID       UUID of the organization to assign assets to
  GIGMANAGER_USER_ID      UUID of the user for created_by / updated_by

Optional:
  GIGMANAGER_INVOICE_DIR  Default PDF source directory
  GIGMANAGER_PROCESSED_DIR  Where to move PDFs after successful import
                            (default: <source_dir>/Processed)

Options:
  --dir PATH          Directory to scan for *.pdf files (root only)
  --dry-run           Parse and validate but do not insert into Supabase
  --move-processed    Move successfully imported PDFs to Processed/ subdir
  --model MODEL       Anthropic model to use (default: claude-haiku-4-5-20251001)
  --ollama MODEL      Use local Ollama instead of Anthropic (e.g. qwen2.5:7b-instruct)
  --max-chars N       Max characters to send per PDF (default: 4000)
"""

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

try:
    import pdfplumber
except ImportError:
    sys.exit("Error: pdfplumber not installed.  Run: pip3 install pdfplumber --break-system-packages")

try:
    import anthropic as _anthropic_mod
    _HAS_ANTHROPIC = True
except ImportError:
    _HAS_ANTHROPIC = False

try:
    from supabase import create_client as _create_supabase
    _HAS_SUPABASE = True
except ImportError:
    _HAS_SUPABASE = False


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_MODEL   = "claude-haiku-4-5-20251001"
DEFAULT_MAX_CHARS = 4000
PROCESSED_SUBDIR  = "Processed"

# Audio/AV category taxonomy drawn from the Act4 classification system
# and the GigManager seed data. The LLM is guided toward these but can
# go off-list when nothing fits.
CATEGORY_HINTS = """
Known categories and sub-categories for audio/AV production gear:
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
"""


# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------

def extract_text(path: str, max_chars: int) -> str:
    """Extract text from a PDF using pdfplumber. Returns text or EXTRACT_ERROR:..."""
    try:
        with pdfplumber.open(path) as pdf:
            pages = [p.extract_text() for p in pdf.pages if p.extract_text()]
        return "\n".join(pages)[:max_chars]
    except Exception as exc:
        return f"EXTRACT_ERROR: {exc}"


# ---------------------------------------------------------------------------
# LLM parsing
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = """\
You are an inventory assistant for a professional audio/video/lighting production company.
Extract structured data from the invoice or receipt text below and return ONLY a JSON object
with no explanation, markdown, or code fences.

{category_hints}

JSON schema to return:
{{
  "invoice_date": "YYYY-MM-DD or null",
  "vendor": "Vendor name or null",
  "invoice_total": <number or null>,
  "line_items": [
    {{
      "manufacturer_model": "<Brand + Model string — this is the primary identifier>",
      "description": "<full line description including accessories or bundle notes>",
      "quantity": <integer, default 1>,
      "unit_cost": <number or null — cost per individual unit>,
      "serial_numbers": ["SN1", "SN2"],
      "category": "<from category hints above>",
      "sub_category": "<from category hints above>",
      "type": "<short practical label, e.g. 'Powered Speaker', 'Dynamic Microphone'>"
    }}
  ]
}}

Rules:
- manufacturer_model is REQUIRED for every line item. If the invoice has no clear make/model,
  use the best descriptive label available.
- Omit consumables (batteries, gaff tape, packaging, shipping charges, taxes).
- If a line shows qty > 1 and lists individual serial numbers, expand into one item per serial
  number (quantity=1 each) rather than grouping.
- Dates must be ISO 8601 (YYYY-MM-DD).
- Costs are numeric only (no currency symbols).

Invoice text:
---
{invoice_text}
---
"""


def parse_with_anthropic(text: str, model: str, api_key: str) -> dict:
    """Call Anthropic Claude to parse invoice text. Returns parsed dict."""
    client = _anthropic_mod.Anthropic(api_key=api_key)
    prompt = _EXTRACTION_PROMPT.format(
        category_hints=CATEGORY_HINTS,
        invoice_text=text,
    )
    msg = client.messages.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    return _safe_json_parse(raw)


def parse_with_ollama(text: str, model: str) -> dict:
    """Call local Ollama to parse invoice text. Returns parsed dict."""
    prompt = _EXTRACTION_PROMPT.format(
        category_hints=CATEGORY_HINTS,
        invoice_text=text,
    )
    result = subprocess.run(
        ["ollama", "run", model, prompt],
        capture_output=True, text=True, timeout=60,
    )
    return _safe_json_parse(result.stdout.strip())


def _safe_json_parse(raw: str) -> dict:
    """Extract and parse the first JSON object from raw LLM output."""
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM output:\n{raw[:400]}")
    return json.loads(match.group())


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_parsed(parsed: dict) -> list[str]:
    """Return a list of validation error strings (empty = ok)."""
    errors = []
    if not parsed.get("line_items"):
        errors.append("No line_items extracted")
        return errors
    for i, item in enumerate(parsed["line_items"], start=1):
        if not item.get("manufacturer_model", "").strip():
            errors.append(f"Line item {i}: missing manufacturer_model")
        if not item.get("category", "").strip():
            errors.append(f"Line item {i}: missing category")
    return errors


# ---------------------------------------------------------------------------
# Cost allocation
# ---------------------------------------------------------------------------

def allocate_costs(rows: list[dict], invoice_total: float | None) -> list[dict]:
    """Proportionally allocate the invoice total (which includes tax/shipping)
    across all rows using a factor = invoice_total / sum(row costs).

    The last row is nudged by ±$0.01 so that the sum of allocated costs
    reconciles exactly to the invoice total.

    Rows without a cost are left untouched (factor cannot be applied).
    If invoice_total is unknown or the sum of row costs is zero, returns
    rows unchanged.
    """
    if not invoice_total:
        return rows

    # Sum of pre-factor costs, weighted by quantity for multi-unit rows
    cost_rows = [(i, r) for i, r in enumerate(rows) if r.get("cost") is not None]
    if not cost_rows:
        return rows

    line_sum = sum(r["cost"] * r["quantity"] for _, r in cost_rows)
    if line_sum == 0:
        return rows

    factor = invoice_total / line_sum

    # Apply factor to each costed row (round to cents)
    running_total = 0.0
    for i, r in cost_rows[:-1]:
        adjusted = round(r["cost"] * factor, 2)
        rows[i] = {**r, "cost": adjusted}
        running_total += adjusted * r["quantity"]

    # Last costed row: adjust so the grand total reconciles exactly
    last_idx, last_row = cost_rows[-1]
    remaining = round(invoice_total - running_total, 2)
    adjusted_last = round(remaining / last_row["quantity"], 2)
    rows[last_idx] = {**last_row, "cost": adjusted_last}

    return rows


# ---------------------------------------------------------------------------
# Schema mapping → Supabase rows
# ---------------------------------------------------------------------------

def build_asset_rows(parsed: dict, org_id: str, user_id: str) -> list[dict]:
    """Convert parsed invoice dict into a list of assets table row dicts."""
    rows = []
    invoice_date  = parsed.get("invoice_date") or str(date.today())
    vendor        = parsed.get("vendor") or ""
    invoice_total = parsed.get("invoice_total")
    if invoice_total is not None:
        invoice_total = float(invoice_total)

    for item in parsed.get("line_items", []):
        serials = item.get("serial_numbers") or []
        qty     = int(item.get("quantity") or 1)

        # If individual serial numbers are enumerated and match quantity,
        # create one row per serial; otherwise create a single row with qty.
        if serials and len(serials) == qty and qty > 1:
            for serial in serials:
                rows.append(_build_row(item, invoice_date, vendor, org_id, user_id,
                                       serial_number=serial, quantity=1))
        else:
            sn = serials[0] if len(serials) == 1 else (", ".join(serials) if serials else None)
            rows.append(_build_row(item, invoice_date, vendor, org_id, user_id,
                                   serial_number=sn, quantity=qty))

    rows = allocate_costs(rows, invoice_total)
    return rows


def _build_row(item: dict, invoice_date: str, vendor: str,
               org_id: str, user_id: str,
               serial_number: str | None, quantity: int) -> dict:
    unit_cost = item.get("unit_cost")
    return {
        "organization_id":      org_id,
        "acquisition_date":     invoice_date,
        "vendor":               vendor or None,
        "cost":                 float(unit_cost) if unit_cost is not None else None,
        "category":             item.get("category", "Misc"),
        "sub_category":         item.get("sub_category") or None,
        "insurance_policy_added": False,
        "manufacturer_model":   item["manufacturer_model"],
        "type":                 item.get("type") or None,
        "serial_number":        serial_number or None,
        "description":          item.get("description") or None,
        "replacement_value":    None,   # not available from purchase invoices
        "insurance_class":      None,
        "quantity":             quantity,
        "status":               "Active",
        "created_by":           user_id,
        "updated_by":           user_id,
    }


# ---------------------------------------------------------------------------
# Supabase insert
# ---------------------------------------------------------------------------

def insert_assets(rows: list[dict], supabase_url: str, service_key: str) -> list[dict]:
    """Insert asset rows into Supabase. Returns the inserted records."""
    client = _create_supabase(supabase_url, service_key)
    result = client.table("assets").insert(rows).execute()
    return result.data


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(
        description="Import PDF invoices/receipts into GigManager assets table."
    )
    p.add_argument("files", nargs="*", help="PDF file path(s) to import")
    p.add_argument("--dir", help="Directory to scan for *.pdf files (root only)")
    p.add_argument("--dry-run", action="store_true",
                   help="Parse and validate without inserting into Supabase")
    p.add_argument("--move-processed", action="store_true",
                   help="Move successfully imported PDFs to Processed/ subdirectory")
    p.add_argument("--model", default=DEFAULT_MODEL,
                   help=f"Anthropic model (default: {DEFAULT_MODEL})")
    p.add_argument("--ollama", metavar="MODEL",
                   help="Use local Ollama instead of Anthropic Claude")
    p.add_argument("--max-chars", type=int, default=DEFAULT_MAX_CHARS,
                   help=f"Max PDF text chars to send to LLM (default: {DEFAULT_MAX_CHARS})")
    return p.parse_args()


def env_require(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val:
        sys.exit(f"Error: environment variable {name} is not set.")
    return val


def main():
    args = parse_args()

    # Collect PDF paths
    pdf_paths = list(args.files)
    if args.dir:
        pdf_paths += sorted(glob.glob(os.path.join(args.dir, "*.pdf")))
    if not pdf_paths:
        sys.exit("No PDFs specified. Use --dir or pass file paths as arguments.")

    # Validate environment
    supabase_url = env_require("VITE_SUPABASE_URL")
    org_id       = env_require("GIGMANAGER_ORG_ID")
    user_id      = env_require("GIGMANAGER_USER_ID")

    if not args.dry_run:
        if not _HAS_SUPABASE:
            sys.exit("Error: supabase-py not installed.  Run: pip3 install supabase --break-system-packages")
        service_key = env_require("SUPABASE_SERVICE_KEY")
    else:
        service_key = ""

    use_ollama = bool(args.ollama)
    if not use_ollama:
        if not _HAS_ANTHROPIC:
            sys.exit("Error: anthropic not installed.  Run: pip3 install anthropic --break-system-packages")
        api_key = env_require("ANTHROPIC_API_KEY")
    else:
        api_key = ""

    # Process each PDF
    total_rows = 0
    succeeded  = []
    failed     = []

    for path in pdf_paths:
        filename = os.path.basename(path)
        print(f"\n── {filename}")

        # 1. Extract text
        text = extract_text(path, args.max_chars)
        if text.startswith("EXTRACT_ERROR"):
            print(f"   FAILED (extraction): {text}")
            failed.append(filename)
            continue
        print(f"   Extracted {len(text)} chars")

        # 2. Parse with LLM
        try:
            if use_ollama:
                parsed = parse_with_ollama(text, args.ollama)
            else:
                parsed = parse_with_anthropic(text, args.model, api_key)
        except Exception as exc:
            print(f"   FAILED (LLM parse): {exc}")
            failed.append(filename)
            continue

        # 3. Validate
        errors = validate_parsed(parsed)
        if errors:
            print(f"   FAILED (validation):")
            for e in errors:
                print(f"     • {e}")
            failed.append(filename)
            continue

        # 4. Build rows
        rows = build_asset_rows(parsed, org_id, user_id)
        invoice_total = parsed.get("invoice_total")
        # Raw sum of line items before allocation (from LLM-extracted unit costs)
        raw_line_sum = sum(
            float(it.get("unit_cost") or 0) * int(it.get("quantity") or 1)
            for it in parsed.get("line_items", [])
        )
        # Post-allocation sum (what will actually land in the DB)
        alloc_sum = round(sum((r["cost"] or 0) * r["quantity"] for r in rows), 2)
        factor_str = ""
        if invoice_total and raw_line_sum:
            factor_str = f"  (factor={float(invoice_total)/raw_line_sum:.6f})"
        print(f"   Invoice date : {parsed.get('invoice_date', 'unknown')}")
        print(f"   Vendor       : {parsed.get('vendor', 'unknown')}")
        print(f"   Invoice total: {invoice_total or 'N/A'}{factor_str}")
        print(f"   Line items   : {round(raw_line_sum, 2)} → allocated {alloc_sum}")
        print(f"   Asset rows   : {len(rows)}")
        for r in rows:
            sn_str = f"  SN:{r['serial_number']}" if r["serial_number"] else ""
            print(f"     [{r['category']}] {r['manufacturer_model']}"
                  f"  qty={r['quantity']}  cost={r['cost']}{sn_str}")

        if args.dry_run:
            print("   (dry-run — not inserted)")
            succeeded.append(filename)
            total_rows += len(rows)
            continue

        # 5. Insert into Supabase
        try:
            inserted = insert_assets(rows, supabase_url, service_key)
            print(f"   ✓ Inserted {len(inserted)} row(s)")
            succeeded.append(filename)
            total_rows += len(inserted)
        except Exception as exc:
            print(f"   FAILED (Supabase insert): {exc}")
            failed.append(filename)
            continue

        # 6. Optionally move processed file
        if args.move_processed and not args.dry_run:
            processed_dir = os.environ.get("GIGMANAGER_PROCESSED_DIR") or \
                            os.path.join(os.path.dirname(os.path.abspath(path)), PROCESSED_SUBDIR)
            os.makedirs(processed_dir, exist_ok=True)
            dest = os.path.join(processed_dir, filename)
            shutil.move(path, dest)
            print(f"   Moved → {os.path.relpath(dest)}")

    # Summary
    print(f"\n{'='*50}")
    tag = "(dry-run)" if args.dry_run else ""
    print(f"Done {tag}. {len(succeeded)} succeeded, {len(failed)} failed. "
          f"{total_rows} asset rows {'would be ' if args.dry_run else ''}inserted.")
    if failed:
        print("Failed files:")
        for f in failed:
            print(f"  • {f}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
