import { describe, it, expect } from 'vitest';
import { buildScanParams, readScanResponse, SCAN_MODEL } from './scanRequest';

const pdf = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' } }];

describe('invoice scan request', () => {
  it('asks Claude Sonnet 5.5 at low effort, with refusal fallback and no sampling parameters', () => {
    const params = buildScanParams(pdf, 'Extract the invoice.');
    expect(SCAN_MODEL).toBe('claude-sonnet-5-5');
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.output_config).toEqual({ effort: 'low' });
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('thinking');
    const [message] = params.messages;
    expect(message.content).toEqual([...pdf, { type: 'text', text: 'Extract the invoice.' }]);
  });

  it('reads the answer from the text block, after any thinking blocks', () => {
    const text = readScanResponse({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '', signature: 'sig' },
        { type: 'text', text: '{"vendor":"Sweetwater","items":[]}' },
      ],
    });
    expect(text).toBe('{"vendor":"Sweetwater","items":[]}');
  });

  it('reports a declined scan instead of reading its content', () => {
    expect(() => readScanResponse({ stop_reason: 'refusal', content: [] })).toThrow(/declined/i);
  });

  it('reports a reply with no text', () => {
    expect(() => readScanResponse({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }] })).toThrow(/no text/i);
  });
});
