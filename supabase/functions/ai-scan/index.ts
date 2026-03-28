import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.32.1";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSET_CATEGORY_HINTS = `
ASSET categories (for durable equipment):
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
`;

const EXPENSE_CATEGORY_HINTS = `
EXPENSE categories (IRS Schedule C Part II — use for non-durable / consumable items):
Advertising                   → Promo flyers, social media ads, event listings, graphic design, sponsorship materials
Commissions                   → Booking agent fees, ticketing platform cuts, credit card processing fees
Depreciation                  → Annual write-down of PA systems, lighting rigs, road cases, vehicles
Insurance                     → Event liability, equipment floater, performer insurance, venue insurance
Labor                         → Stagehands, riggers, freelance engineers, day-of crew, security, photographers
Legal/Accounting              → Performance contracts, rider reviews, accountant/CPA fees, legal counsel
Meals                         → Crew meals, hospitality rider food, catering buyouts, craft services
Office                        → Scheduling software, DAW subscriptions, cloud storage, office supplies
Rentals                       → Venue rental, backline rentals, generator rental, tent/staging rental, speaker/lighting rig rental
Repairs                       → Blown driver replacement, fixture re-lamping, cable repair, console servicing, tuning
Supplies                      → Gaffer tape, batteries, lamps/bulbs, consumable cables, cleaning supplies, zip ties, expendables
Taxes/Licenses                → Music licenses (ASCAP/BMI/SESAC), business licenses, venue permits, noise permits
Transportation                → Mileage/fuel for load-in/out, van/truck rentals, tolls, parking
Travel                        → Airfare, hotels, per diem for touring crew, ground transport, ride-shares
Utilities                     → Generator fuel, temporary power drops, internet/comms at venue, water/sanitation
Wages                         → W-2 employees — full-time crew, office staff, salaried production managers
Other                         → Misc production costs not fitting above
`;

const EXTRACTION_PROMPT = `
You are an inventory assistant for a professional audio/video/lighting production company.
Extract structured data from the invoice or receipt document below and return ONLY a JSON object
with no explanation, markdown, or code fences.

${ASSET_CATEGORY_HINTS}

${EXPENSE_CATEGORY_HINTS}

JSON schema to return:
{
  "purchase_date": "YYYY-MM-DD or null",
  "vendor": "Vendor name or null",
  "total_inv_amount": <number or null>,
  "payment_method": "Payment method or null",
  "invoice_number": "<invoice number, receipt number, order number, or PO number if present, else null>",
  "items": [
    {
      "manufacturer_model": "<Brand + Model string — this is the primary identifier>",
      "description": "<full line description including accessories or bundle notes>",
      "quantity": <integer, default 1>,
      "item_price": <number or null — the unit price as printed on the invoice>,
      "item_cost": <number or null — set to the unit price if present, or null — the burdened cost per item if you can calculate it based on header fees (tax/shipping)>,
      "line_amount": <number or null — the total amount for this line as printed on the invoice>,
      "serial_numbers": ["SN1", "SN2"],
      "category": "<if is_durable: use ASSET category; if is_consumable or not durable: use EXPENSE (IRS Schedule C) category>",
      "sub_category": "<only for assets: use the sub-category from ASSET category hints; null for expenses>",
      "type": "<short practical label, e.g. 'Powered Speaker', 'Dynamic Microphone'>",
      "is_durable": <boolean, true for durable equipment (e.g. gear, cases, tools)>,
      "is_consumable": <boolean, true for short-lived items (e.g. batteries, tape, cleaning supplies)>
    }
  ]
}

Rules:
- manufacturer_model is REQUIRED for every line item. If the invoice has no clear make/model, use the best descriptive label available.
- DO NOT calculate any values. Extract them exactly as they appear. If a field isn't present, return null.
- Omit line items that are purely shipping, tax, or fees (these costs will be allocated later).
- If a line shows qty > 1 and lists individual serial numbers, expand into one item per serial number (quantity=1 each) rather than grouping.
- Dates must be ISO 8601 (YYYY-MM-DD).
- Costs and prices are numeric only (no currency symbols).
- total_inv_amount must be the ABSOLUTE GRAND TOTAL of the invoice (all items + tax + shipping - discounts). This is critical.

Analyze the document and return the JSON.
`;

function classifyItem(item: any) {
  const price = item.item_price || 0;
  
  // Consumables are always expenses regardless of cost
  if (item.is_consumable) return 'Expense';

  // Asset Rule ($100/$50 rule):
  // 1. Durable items >= $50 are Assets.
  // 2. Durable items < $50 are Expenses.
  if (item.is_durable && price >= 50) return 'Asset';
  
  return 'Expense';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check for diagnostic request BEFORE auth
  // This allows verifying the ANTHROPIC_API_KEY without a user session
  const isDiagnostic = req.headers.get('x-diagnostic') === 'true';
  if (isDiagnostic) {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'ANTHROPIC_API_KEY environment variable is not set' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const anthropic = new Anthropic({ apiKey });
      // Attempt a very simple message to verify connectivity and key validity
      const testResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }]
      });
      
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Anthropic connectivity successful',
        apiKeyPrefix: apiKey.substring(0, 7) + '...',
        modelUsed: testResponse.model,
        usageRecorded: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Anthropic connectivity failed',
        error: e.message,
        errorType: e.type,
        statusCode: e.status,
        apiKeyPrefix: apiKey.substring(0, 7) + '...',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Data = encodeBase64(uint8Array);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const anthropic = new Anthropic({
      apiKey,
    });

    const fileType = file.type;
    const isPDF = fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    // Determine content for Anthropic message
    const content: any[] = [];
    
    if (isPDF) {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Data,
        },
      });
    } else {
      // Handle images (Anthropic supports image/jpeg, image/png, image/gif, image/webp)
      let mediaType = fileType;
      if (!mediaType.startsWith('image/')) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'png') mediaType = 'image/png';
        else if (ext === 'webp') mediaType = 'image/webp';
        else if (ext === 'gif') mediaType = 'image/gif';
        else mediaType = 'image/jpeg'; // default fallback
      }

      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as any,
          data: base64Data,
        },
      });
    }

    content.push({
      type: "text",
      text: EXTRACTION_PROMPT,
    });

    let response;
    try {
      // Try the latest model (Claude 3.5 Sonnet / 4.6 ID)
      // PDF support is now stable and does not require beta headers.
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 16384,
        messages: [
          {
            role: "user",
            content: content,
          },
        ],
      });
    } catch (err: any) {
      console.error('Anthropic API Error:', err.status, err.message);
      
      if (err.status === 404 || err.status === 400) {
        return new Response(
          JSON.stringify({ 
            error: 'SCAN_ACCESS_REQUIRED', 
            message: `Anthropic model access denied. Status: ${err.status}. Message: ${err.message}` 
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        throw err;
      }
    }

    if (response.stop_reason === 'max_tokens') {
      console.warn('AI response was truncated (max_tokens reached)');
    }

    const rawOutput = (response.content[0] as any).text;
    
    // Extract JSON from response
    const jsonMatch = rawOutput.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }
    
    let jsonStr = jsonMatch[0];

    // Attempt repair if truncated: close open arrays/objects
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_parseErr) {
      // Try to repair truncated JSON by closing open brackets
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escape = false;
      for (const ch of jsonStr) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
        else if (ch === '[') openBrackets++;
        else if (ch === ']') openBrackets--;
      }

      // Remove trailing comma before closing
      jsonStr = jsonStr.replace(/,\s*$/, '');

      for (let i = 0; i < openBrackets; i++) jsonStr += ']';
      for (let i = 0; i < openBraces; i++) jsonStr += '}';

      try {
        parsed = JSON.parse(jsonStr);
        console.warn('Repaired truncated JSON successfully');
      } catch (repairErr: any) {
        throw new Error(`AI returned malformed JSON that could not be repaired: ${repairErr.message}`);
      }
    }
    
    // Post-process: Apply classification and format for preview
    const processedItems = (parsed.items || []).map((item: any) => ({
      ...item,
      suggested_type: classifyItem(item),
      item_cost: item.item_cost || item.item_price || 0, // Fallback to item_price for cost if not extracted
    }));

    return new Response(
      JSON.stringify({
        ...parsed,
        items: processedItems,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in ai-scan:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
