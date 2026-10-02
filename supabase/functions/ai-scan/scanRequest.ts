// The Claude request behind an invoice scan, and how its reply is read. Kept free of
// Deno imports so Vitest can test it.

export const SCAN_MODEL = 'claude-sonnet-5-5' as const;

// Anthropic's suggested starting point for extraction. Raise to 'medium' if scans
// start missing line items on messy invoices.
export const SCAN_EFFORT = 'low' as const;

export function buildScanParams<Block>(fileContent: Block[], prompt: string) {
  return {
    model: SCAN_MODEL,
    max_tokens: 16384,
    output_config: { effort: SCAN_EFFORT },
    // If a safety check declines the scan, the API retries it on a suitable model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    messages: [{ role: 'user' as const, content: [...fileContent, { type: 'text' as const, text: prompt }] }],
  };
}

interface ScanResponse {
  stop_reason: string | null;
  content: Array<{ type: string; text?: string }>;
}

/** The reply's text. Sonnet 5.5 thinks first, so the answer isn't always the first block. */
export function readScanResponse(response: ScanResponse): string {
  if (response.stop_reason === 'refusal') {
    throw new Error('The AI declined to read this file. Enter the purchase manually.');
  }
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
  if (!text.trim()) throw new Error('The AI returned no text for this file.');
  return text;
}
