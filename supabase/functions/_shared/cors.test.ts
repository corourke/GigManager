import { describe, it, expect } from 'vitest';
import { resolveAllowedOrigin, corsHeaders, ALLOWED_ORIGINS } from './cors';

describe('resolveAllowedOrigin', () => {
  it('returns the origin when allow-listed', () => {
    expect(resolveAllowedOrigin('https://gigwrangler.com')).toBe('https://gigwrangler.com');
    expect(resolveAllowedOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('returns null for unknown, null, or empty origins', () => {
    expect(resolveAllowedOrigin('https://evil.example')).toBeNull();
    expect(resolveAllowedOrigin(null)).toBeNull();
    expect(resolveAllowedOrigin(undefined)).toBeNull();
    expect(resolveAllowedOrigin('')).toBeNull();
  });

  it('does not allow-list a substring or scheme mismatch', () => {
    expect(resolveAllowedOrigin('https://gigwrangler.com.evil.com')).toBeNull();
    expect(resolveAllowedOrigin('http://gigwrangler.com')).toBeNull();
  });
});

describe('corsHeaders', () => {
  const opts = { allowMethods: 'POST, GET, OPTIONS', allowHeaders: 'authorization, content-type' };

  it('emits Access-Control-Allow-Origin only for allow-listed origins', () => {
    const ok = corsHeaders('https://gigwrangler.com', opts);
    expect(ok['Access-Control-Allow-Origin']).toBe('https://gigwrangler.com');

    const blocked = corsHeaders('https://evil.example', opts);
    expect(blocked['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('never sets credentials and always varies on Origin', () => {
    const headers = corsHeaders('https://gigwrangler.com', opts);
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    expect(headers['Vary']).toBe('Origin');
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, GET, OPTIONS');
  });

  it('allow-list contains prod and dev origins', () => {
    expect(ALLOWED_ORIGINS).toContain('https://gigwrangler.com');
    expect(ALLOWED_ORIGINS).toContain('http://localhost:3000');
  });
});
