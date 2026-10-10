#!/usr/bin/env node
// Post-deploy check (run by deploy_prod.sh after the frontend deploy): fetches
// the live index.html, follows every JS/CSS build file it loads and,
// recursively, the chunks those load, and fails if any is not 200 or comes
// back as text/html (the SPA fallback, which browsers then cache as the
// chunk). Also checks that a made-up build file gets a real 404. Retries for
// about 60 seconds so the CDN can finish propagating the deploy.
//
//   node scripts/check-deployed-assets.mjs https://gigwrangler.com [timeoutSeconds]
import { checkDeployedAssets, retryUntilOk } from './deployedAssets.mjs';

const baseUrl = process.argv[2];
const timeoutSeconds = Number(process.argv[3] ?? 60);
if (!baseUrl || !/^https?:\/\//.test(baseUrl) || !(timeoutSeconds >= 0)) {
  console.error('Usage: node scripts/check-deployed-assets.mjs <https://site> [timeoutSeconds]');
  process.exit(64);
}

let checked = 0;
const result = await retryUntilOk(
  async () => {
    const pass = await checkDeployedAssets({ baseUrl });
    checked = pass.checked;
    return pass;
  },
  { timeoutMs: timeoutSeconds * 1000 },
);

if (!result.ok) {
  console.error(`\nDeployed build files check FAILED for ${baseUrl} (after ${result.attempts} attempt(s)):`);
  for (const f of result.failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `  ${checked} JS/CSS build files OK (200, not HTML) and a missing one gets 404` +
    (result.attempts > 1 ? ` (attempt ${result.attempts})` : ''),
);
