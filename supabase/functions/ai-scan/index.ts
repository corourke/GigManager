import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.18.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORY_HINTS = `
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

const EXTRACTION_PROMPT = `
You are an inventory assistant for a professional audio/video/lighting production company.
Extract structured data from the invoice or receipt text below and return ONLY a JSON object
with no explanation, markdown, or code fences.

${CATEGORY_HINTS}

JSON schema to return:
{
  "invoice_date": "YYYY-MM-DD or null",
  "vendor": "Vendor name or null",
  "invoice_total": <number or null>,
  "payment_method": "Payment method or null",
  "line_items": [
    {
      "manufacturer_model": "<Brand + Model string — this is the primary identifier>",
      "description": "<full line description including accessories or bundle notes>",
      "quantity": <integer, default 1>,
      "unit_price": <number or null — the unit price as printed on the invoice>,
      "line_amount": <number or null — the total amount for this line as printed on the invoice>,
      "serial_numbers": ["SN1", "SN2"],
      "category": "<from category hints above>",
      "sub_category": "<from category hints above>",
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
- invoice_total must be the ABSOLUTE GRAND TOTAL of the invoice (all items + tax + shipping - discounts). This is critical.

Analyze the document and return the JSON.
`;

function classifyItem(item: any) {
  const price = item.unit_price || 0;
  
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
    
    // Convert to base64 for Anthropic API
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    const response = await anthropic.beta.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      betas: ["pdfs-2024-09-25"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawOutput = (response.content[0] as any).text;
    
    // Extract JSON from response
    const jsonMatch = rawOutput.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Post-process: Apply classification and format for preview
    const processedItems = (parsed.line_items || []).map((item: any) => ({
      ...item,
      suggested_type: classifyItem(item),
    }));

    return new Response(
      JSON.stringify({
        ...parsed,
        line_items: processedItems,
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
