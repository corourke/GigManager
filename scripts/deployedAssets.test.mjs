import { describe, it, expect, vi } from 'vitest';
import {
  findIndexAssetUrls,
  findReferencedAssetUrls,
  checkAssetResponse,
  checkDeployedAssets,
  retryUntilOk,
} from './deployedAssets.mjs';

const BASE = 'https://example.test';

const indexHtml =
  '<!doctype html><html><head>' +
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />' +
  '<script type="module" crossorigin src="/static/index-AbC12345.js"></script>' +
  '<link rel="modulepreload" crossorigin href="/static/vendor-Zz9_xY01.js">' +
  '<link rel="stylesheet" crossorigin href="/static/index-DF-S4Cb4.css">' +
  '<link rel="manifest" href="/manifest.webmanifest">' +
  '<script id="vite-plugin-pwa:register-sw" src="/registerSW.js"></script>' +
  '<script src="https://cdn.other.test/lib.js"></script>' +
  '</head><body><div id="root"></div></body></html>';

describe('findIndexAssetUrls', () => {
  it('returns the same-origin JS and CSS files index.html loads from the build directory', () => {
    expect(findIndexAssetUrls(indexHtml, BASE)).toEqual({
      assetsDir: 'static',
      urls: [
        `${BASE}/static/index-AbC12345.js`,
        `${BASE}/static/vendor-Zz9_xY01.js`,
        `${BASE}/static/index-DF-S4Cb4.css`,
      ],
    });
  });

  it('returns no build directory when index.html has no module entry script', () => {
    expect(findIndexAssetUrls('<html><body>Maintenance</body></html>', BASE)).toEqual({ assetsDir: null, urls: [] });
  });
});

describe('findReferencedAssetUrls', () => {
  const fileUrl = `${BASE}/static/index-AbC12345.js`;

  it('finds sibling chunk imports and Vite preload-map entries', () => {
    const source =
      'import{a}from"./react-B1cD2eF3.js";' +
      'const m=["static/Dashboard-BftGGrk2.js","static/Dashboard-x1y2z3w4.css"];' +
      'import("./ItemDetailScreen-CwctrODI.js");' +
      "new URL('/static/pdf.worker-Q1w2E3r4.mjs',import.meta.url);" +
      'import(`./gig.service-CF9akeJC.js`)';
    expect(findReferencedAssetUrls(source, fileUrl, 'static').sort()).toEqual(
      [
        `${BASE}/static/react-B1cD2eF3.js`,
        `${BASE}/static/Dashboard-BftGGrk2.js`,
        `${BASE}/static/Dashboard-x1y2z3w4.css`,
        `${BASE}/static/ItemDetailScreen-CwctrODI.js`,
        `${BASE}/static/pdf.worker-Q1w2E3r4.mjs`,
        `${BASE}/static/gig.service-CF9akeJC.js`,
      ].sort(),
    );
  });

  it('ignores app routes, other directories, other file types and duplicates', () => {
    const source =
      'navigate("/assets/new");fetch("/api/x.js");"./logo.png";"other/x.js";' +
      '"./a-11111111.js";"./a-11111111.js";"https://cdn.other.test/static/x.js"';
    expect(findReferencedAssetUrls(source, fileUrl, 'static')).toEqual([`${BASE}/static/a-11111111.js`]);
  });

  it("ignores a library's own unhashed default such as pdf.js's \"./pdf.worker.mjs\"", () => {
    const source = 'le.workerSrc||="./pdf.worker.mjs";u="/static/pdf.worker.min-B_fnEKel.mjs"';
    expect(findReferencedAssetUrls(source, fileUrl, 'static')).toEqual([`${BASE}/static/pdf.worker.min-B_fnEKel.mjs`]);
  });
});

describe('checkAssetResponse', () => {
  it('accepts a 200 JavaScript or CSS response', () => {
    expect(checkAssetResponse(200, 'application/javascript')).toBeNull();
    expect(checkAssetResponse(200, 'text/css; charset=utf-8')).toBeNull();
  });

  it('rejects a non-200 status', () => {
    expect(checkAssetResponse(404, 'text/html')).toMatch(/HTTP 404/);
  });

  it('rejects the SPA fallback: 200 text/html', () => {
    expect(checkAssetResponse(200, 'text/html; charset=utf-8')).toMatch(/text\/html/);
  });
});

/** A fake fetch over a map of path -> { status, type, body }. Unknown paths act like the SPA fallback. */
function fakeFetch(site) {
  return vi.fn(async (url) => {
    const { pathname } = new URL(url);
    const entry = site[pathname] ?? { status: 200, type: 'text/html; charset=utf-8', body: '<!doctype html>' };
    return {
      status: entry.status,
      headers: { get: (name) => (name.toLowerCase() === 'content-type' ? entry.type : null) },
      text: async () => entry.body ?? '',
    };
  });
}

const healthySite = () => ({
  '/': { status: 200, type: 'text/html', body: indexHtml },
  '/static/index-AbC12345.js': {
    status: 200,
    type: 'application/javascript',
    body: 'import("./GigPage-UnhYdo9d.js");const d=["static/ItemDetailScreen-CwctrODI.js"]',
  },
  '/static/vendor-Zz9_xY01.js': { status: 200, type: 'application/javascript', body: '' },
  '/static/index-DF-S4Cb4.css': { status: 200, type: 'text/css', body: '.a{}' },
  '/static/GigPage-UnhYdo9d.js': {
    status: 200,
    type: 'application/javascript',
    body: 'import{x}from"./index-AbC12345.js"', // cycles back to the entry
  },
  '/static/ItemDetailScreen-CwctrODI.js': { status: 200, type: 'application/javascript', body: '' },
  '/static/p': { status: 404, type: 'text/html', body: 'Not found' }, // the missing-file probe
});

describe('checkDeployedAssets', () => {
  it('passes when every file index.html reaches, directly or through other chunks, is served', async () => {
    const result = await checkDeployedAssets({ baseUrl: BASE, fetchImpl: fakeFetch(healthySite()), probeName: 'p' });
    expect(result.failures).toEqual([]);
    expect(result.checked).toBe(5);
  });

  it('fails a nested chunk that the CDN answers with index.html', async () => {
    const site = healthySite();
    delete site['/static/ItemDetailScreen-CwctrODI.js'];
    const result = await checkDeployedAssets({ baseUrl: BASE, fetchImpl: fakeFetch(site), probeName: 'p' });
    expect(result.failures).toEqual([expect.stringMatching(/ItemDetailScreen-CwctrODI\.js.*text\/html/)]);
  });

  it('fails a missing file that gets a non-200 status', async () => {
    const site = healthySite();
    site['/static/GigPage-UnhYdo9d.js'] = { status: 404, type: 'text/html', body: 'Not found' };
    const result = await checkDeployedAssets({ baseUrl: BASE, fetchImpl: fakeFetch(site), probeName: 'p' });
    expect(result.failures).toEqual([expect.stringMatching(/GigPage-UnhYdo9d\.js.*HTTP 404/)]);
  });

  it('requires a made-up build file to get a real 404, not the SPA page', async () => {
    const fetchImpl = fakeFetch(healthySite());
    const result = await checkDeployedAssets({ baseUrl: BASE, fetchImpl, probeName: 'deploy-check-1.js' });
    expect(fetchImpl).toHaveBeenCalledWith(`${BASE}/static/deploy-check-1.js`, expect.anything());
    expect(result.failures).toEqual([expect.stringMatching(/deploy-check-1\.js.*expected 404.*got 200 text\/html/)]);
  });

  it('fails when index.html itself is not served', async () => {
    const site = { '/': { status: 503, type: 'text/html', body: 'down' } };
    const result = await checkDeployedAssets({ baseUrl: BASE, fetchImpl: fakeFetch(site), probeName: 'p' });
    expect(result.failures).toEqual([expect.stringMatching(/index\.html.*HTTP 503/)]);
  });

  it('reports a network error instead of throwing', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    const result = await checkDeployedAssets({ baseUrl: BASE, fetchImpl, probeName: 'p' });
    expect(result.failures).toEqual([expect.stringMatching(/ECONNRESET/)]);
  });
});

describe('retryUntilOk', () => {
  it('retries a failing check until it passes', async () => {
    let clock = 0;
    const check = vi
      .fn()
      .mockResolvedValueOnce({ failures: ['x missing'] })
      .mockResolvedValueOnce({ failures: [] });
    const result = await retryUntilOk(check, {
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      log: () => {},
    });
    expect(result).toEqual({ ok: true, attempts: 2, failures: [] });
  });

  it('gives up after the timeout with the last failures', async () => {
    let clock = 0;
    const check = vi.fn(async () => {
      clock += 1_000; // each attempt takes a second
      return { failures: ['x missing'] };
    });
    const result = await retryUntilOk(check, {
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      log: () => {},
    });
    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(['x missing']);
    expect(result.attempts).toBe(11); // 6 s per round: attempts start at 0, 6, ... 60 s
    expect(clock).toBeLessThanOrEqual(66_000);
  });
});
