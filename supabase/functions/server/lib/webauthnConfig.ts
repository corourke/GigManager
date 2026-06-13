// WebAuthn relying-party config. RP_NAME defaults to the real product name
// (was the Figma Make scaffolding 'Field Ops Mobile'); override via env.
export const RP_NAME = Deno.env.get('RP_NAME') || 'GigWrangler';
export const RP_ID = Deno.env.get('RP_ID') || 'localhost';
export const ORIGIN = Deno.env.get('ORIGIN') || 'http://localhost:3000';

export function base64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
  return new Uint8Array(atob(padded).split('').map((c) => c.charCodeAt(0)));
}
