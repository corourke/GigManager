// Small pieces of the invoice scan and its queue (10-01), kept free of Deno
// imports so Vitest can test them.

export const ALLOWED_MEDIA_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** The file's media type, falling back to its extension; null if Claude can't read it. */
export function mediaTypeFor(type: string, fileName: string): string | null {
  if (ALLOWED_MEDIA_TYPES.has(type)) return type;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return BY_EXTENSION[ext] ?? null;
}

/** What to store on the queue row after a scan. */
export function queueUpdateFor(result: { status: number; body: Record<string, unknown> }) {
  if (result.status === 200) return { status: 'ready', scanned_data: result.body, error: null };
  const reason = (result.body.message ?? result.body.error ?? 'Scan failed') as string;
  return { status: 'failed', scanned_data: null, error: reason };
}

/** A row left in 'scanning' since before this (the scan died) may be claimed again. */
export function staleScanCutoff(now: Date): string {
  return new Date(now.getTime() - 5 * 60 * 1000).toISOString();
}
