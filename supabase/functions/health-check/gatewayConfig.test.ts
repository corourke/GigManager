import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Issue #52: the daily pg_cron job authenticates with its own random bearer
// token, not a Supabase JWT. With the platform default verify_jwt = true the
// gateway rejects that token (401 UNAUTHORIZED_INVALID_JWT_FORMAT) before any
// of our code runs — so the health check must live in its own function with
// JWT verification off, and only that function.

const configToml = readFileSync(resolve(__dirname, '../../config.toml'), 'utf8');

function functionSection(name: string): string | null {
  const match = configToml.match(new RegExp(`^\\[functions\\.${name}\\]\\n((?:(?!\\[).*\\n?)*)`, 'm'));
  return match ? match[1] : null;
}

describe('edge-function gateway JWT verification (supabase/config.toml)', () => {
  it('turns verify_jwt off for health-check, so the cron bearer token reaches the function', () => {
    expect(functionSection('health-check')).toMatch(/^verify_jwt\s*=\s*false\s*$/m);
  });

  it('leaves verify_jwt at its default for server and ai-scan', () => {
    for (const name of ['server', 'ai-scan']) {
      expect(functionSection(name) ?? '').not.toMatch(/verify_jwt\s*=\s*false/);
    }
  });
});
