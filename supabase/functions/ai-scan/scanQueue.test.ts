import { describe, it, expect } from 'vitest';
import { mediaTypeFor, queueUpdateFor, staleScanCutoff } from './scanQueue';

describe('scan queue helpers', () => {
  it('takes the media type from the file, or from its extension when the type is generic', () => {
    expect(mediaTypeFor('application/pdf', 'x.bin')).toBe('application/pdf');
    expect(mediaTypeFor('application/octet-stream', 'Invoice.PDF')).toBe('application/pdf');
    expect(mediaTypeFor('', 'receipt.jpg')).toBe('image/jpeg');
    expect(mediaTypeFor('', 'receipt.heic')).toBeNull();
  });

  it('records a scan on the queue row: ready with the data, or failed with the reason', () => {
    expect(queueUpdateFor({ status: 200, body: { vendor: 'Sweetwater', items: [] } }))
      .toEqual({ status: 'ready', scanned_data: { vendor: 'Sweetwater', items: [] }, error: null });
    expect(queueUpdateFor({ status: 429, body: { error: 'Scan limit reached (60/hour). Try again later.' } }))
      .toEqual({ status: 'failed', scanned_data: null, error: 'Scan limit reached (60/hour). Try again later.' });
    expect(queueUpdateFor({ status: 403, body: { error: 'SCAN_ACCESS_REQUIRED', message: 'Anthropic model access denied.' } }))
      .toEqual({ status: 'failed', scanned_data: null, error: 'Anthropic model access denied.' });
  });

  it('treats a scan stuck for five minutes as abandoned', () => {
    expect(staleScanCutoff(new Date('2026-10-02T12:00:00Z'))).toBe('2026-10-02T11:55:00.000Z');
  });
});
