// Helpers for scripts/check-deployed-assets.mjs, the post-deploy check that
// every JS/CSS build file the live site loads is really there. fetch, the
// clock and sleep are passed in so they can be unit-tested.
import { findEntryChunk } from './bundleSize.mjs';

const BUILD_FILE = /\.(?:m?js|css)$/i;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The build directory (from the entry `<script type="module">`, e.g. "static")
 * and the absolute URLs of the same-origin JS/CSS files in it that index.html
 * loads, in document order. Root files such as /registerSW.js are skipped.
 */
export function findIndexAssetUrls(indexHtml, baseUrl) {
  const entry = findEntryChunk(indexHtml);
  if (!entry || !entry.includes('/')) return { assetsDir: null, urls: [] };
  const assetsDir = entry.slice(0, entry.lastIndexOf('/'));
  const origin = new URL(baseUrl).origin;
  const urls = [];
  for (const tag of indexHtml.match(/<(?:script|link)\b[^>]*>/gi) ?? []) {
    const ref = tag.match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!ref) continue;
    const url = new URL(ref, `${origin}/`);
    if (url.origin !== origin || !BUILD_FILE.test(url.pathname)) continue;
    if (!url.pathname.startsWith(`/${assetsDir}/`)) continue;
    if (!urls.includes(url.href)) urls.push(url.href);
  }
  return { assetsDir, urls };
}

/**
 * Build files a JS or CSS file refers to: quoted "./Name-hash.js" (a sibling
 * chunk) or "static/Name-hash.js" / "/static/Name-hash.js" (Vite's preload
 * map, root-relative). Only names with Vite's 8-character content hash count,
 * so a library's own default such as pdf.js's "./pdf.worker.mjs" is skipped.
 * Returns absolute URLs without duplicates.
 */
export function findReferencedAssetUrls(source, fileUrl, assetsDir) {
  const dir = escapeRegExp(assetsDir);
  const pattern = new RegExp(`["'\`]((?:\\./|/?${dir}/)[\\w.-]+-[\\w-]{8}\\.(?:m?js|css))["'\`]`, 'g');
  const origin = new URL(fileUrl).origin;
  const urls = new Set();
  for (const [, ref] of source.matchAll(pattern)) {
    const url = ref.startsWith('./') ? new URL(ref, fileUrl) : new URL(`/${ref.replace(/^\//, '')}`, origin);
    urls.add(url.href);
  }
  return [...urls];
}

/** Null when a build file response is good; otherwise what is wrong with it. */
export function checkAssetResponse(status, contentType) {
  if (status !== 200) return `HTTP ${status} (expected 200)`;
  if (/text\/html/i.test(contentType ?? '')) {
    return 'served as text/html, i.e. the SPA index.html instead of the file';
  }
  return null;
}

async function get(fetchImpl, url, timeoutMs) {
  const response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  return { response, contentType: response.headers.get('content-type') ?? '' };
}

/**
 * One pass over the live site: index.html, then every build file reachable
 * from it, wave by wave (a lazy screen's chunks are only named inside other
 * chunks). Finally a made-up build file must get a real 404, not index.html.
 * @returns {Promise<{ checked: number, failures: string[] }>}
 */
export async function checkDeployedAssets({
  baseUrl,
  fetchImpl = fetch,
  probeName = `deploy-check-missing-${Date.now()}.js`,
  concurrency = 8,
  requestTimeoutMs = 15_000,
}) {
  const base = baseUrl.replace(/\/+$/, '');
  const failures = [];

  let indexHtml;
  try {
    const { response, contentType } = await get(fetchImpl, `${base}/`, requestTimeoutMs);
    if (response.status !== 200) {
      return { checked: 0, failures: [`index.html: HTTP ${response.status} ${contentType}`.trim()] };
    }
    indexHtml = await response.text();
  } catch (err) {
    return { checked: 0, failures: [`index.html: ${err.message}`] };
  }

  const { assetsDir, urls } = findIndexAssetUrls(indexHtml, base);
  if (!assetsDir || urls.length === 0) {
    return { checked: 0, failures: ['index.html: no <script type="module" src=...> build files found'] };
  }

  const seen = new Set(urls);
  let frontier = urls;
  let checked = 0;
  const checkOne = async (url) => {
    const path = new URL(url).pathname;
    try {
      const { response, contentType } = await get(fetchImpl, url, requestTimeoutMs);
      const problem = checkAssetResponse(response.status, contentType);
      if (problem) {
        failures.push(`${path}: ${problem}`);
        return [];
      }
      return findReferencedAssetUrls(await response.text(), url, assetsDir);
    } catch (err) {
      failures.push(`${path}: ${err.message}`);
      return [];
    }
  };
  while (frontier.length) {
    const next = [];
    for (let i = 0; i < frontier.length; i += concurrency) {
      const batch = frontier.slice(i, i + concurrency);
      checked += batch.length;
      for (const refs of await Promise.all(batch.map(checkOne))) {
        for (const ref of refs) {
          if (!seen.has(ref)) {
            seen.add(ref);
            next.push(ref);
          }
        }
      }
    }
    frontier = next;
  }

  const probePath = `/${assetsDir}/${probeName}`;
  try {
    const { response, contentType } = await get(fetchImpl, `${base}${probePath}`, requestTimeoutMs);
    if (response.status !== 404) {
      failures.push(
        `${probePath}: expected 404 for a missing build file, got ${response.status} ${contentType}`.trim(),
      );
    }
  } catch (err) {
    failures.push(`${probePath}: ${err.message}`);
  }

  return { checked, failures };
}

/**
 * Runs `check` until it reports no failures or `timeoutMs` has passed (the
 * CDN can take a little while to serve a new deploy everywhere).
 */
export async function retryUntilOk(
  check,
  {
    timeoutMs = 60_000,
    intervalMs = 5_000,
    now = Date.now,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log = console.log,
  } = {},
) {
  const start = now();
  for (let attempts = 1; ; attempts++) {
    const { failures } = await check(attempts);
    if (failures.length === 0) return { ok: true, attempts, failures: [] };
    if (now() - start >= timeoutMs) return { ok: false, attempts, failures };
    log(`  attempt ${attempts}: ${failures.length} problem(s), e.g. ${failures[0]}; retrying in ${intervalMs / 1000}s`);
    await sleep(intervalMs);
  }
}
