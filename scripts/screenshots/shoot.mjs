#!/usr/bin/env node
// Reproducible screenshot harness for the GigWrangler user guide.
// Usage: node scripts/screenshots/shoot.mjs [--only <id-prefix>]
// See README.md in this folder.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const outRoot = path.join(repoRoot, 'website/docs/src/assets/screenshots');
const authDir = path.join(here, '.auth');
const BASE_URL = process.env.SHOT_BASE_URL || 'http://localhost:3000';
const EXEC = process.env.SHOT_CHROMIUM || '/opt/pw-browsers/chromium';
const PASSWORD = 'DemoPass!2026';

const USERS = {
  admin: 'demo-admin@gigwrangler.test',
  manager: 'demo-manager@gigwrangler.test',
  staff: 'demo-staff@gigwrangler.test',
  newuser: 'demo-newuser@gigwrangler.test', // throwaway account with no organization
};

const VIEWPORT = { width: 1440, height: 900 };

// ---------------------------------------------------------------- helpers
const signIn = async (page, email) => {
  await page.goto(BASE_URL);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).last().click();
  await page.waitForURL((u) => !/\/(login)?$/.test(u.pathname), { timeout: 30000 });
  await page.waitForLoadState('networkidle');
};

const settle = async (page) => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
};

// ---------------------------------------------------------------- shots
// Each shot: id, file (relative to the screenshots folder), user (null = signed out),
// prepare(page) navigates/opens UI, target(page) returns a Locator to crop to,
// or clip: {x,y,width,height} in CSS pixels. Optional pad = CSS px around the locator.
const shots = [
  {
    id: 'getting-started/onboarding-sign-up',
    file: 'getting-started/onboarding-sign-up.png',
    user: null,
    prepare: async (page) => {
      await page.goto(BASE_URL);
      await page.getByRole('tab', { name: 'Sign Up' }).click();
      await page.locator('#signup-firstname').fill('Casey');
      await page.locator('#signup-lastname').fill('Rivera');
      await page.locator('#signup-email').fill(USERS.newuser);
      await page.locator('#signup-password').fill(PASSWORD);
      await page.locator('#signup-confirm-password').fill(PASSWORD);
      await page.locator('body').click({ position: { x: 5, y: 5 } }); // drop focus ring
    },
    clip: { x: 496, y: 196, width: 448, height: 634 },
  },
  {
    id: 'getting-started/onboarding-select-organization',
    file: 'getting-started/onboarding-select-organization.png',
    user: 'newuser',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/org-selection`);
      await page.getByText('No organizations yet').waitFor();
    },
    clip: { x: 0, y: 0, width: 1440, height: 650 },
  },
  {
    id: 'getting-started/onboarding-edit-profile',
    file: 'getting-started/onboarding-edit-profile.png',
    user: 'admin',
    viewport: { width: 1440, height: 1300 }, // tall enough to show the whole dialog
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.locator('button[aria-haspopup="menu"]').last().click();
      await page.getByRole('menuitem', { name: 'Edit Profile' }).click();
      await page.getByRole('dialog').waitFor();
      await page.evaluate(() => document.activeElement?.blur());
    },
    target: (page) => page.getByRole('dialog'),
    pad: 0,
  },
  {
    id: 'getting-started/the-dashboard-overview',
    file: 'getting-started/the-dashboard-overview.png',
    user: 'admin',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.getByText('Upcoming Gigs (Next 30 Days)').waitFor();
    },
    clip: { x: 0, y: 0, width: 1440, height: 640 },
  },
  {
    id: 'getting-started/the-dashboard-avatar-menu',
    file: 'getting-started/the-dashboard-avatar-menu.png',
    user: 'admin',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.getByText('Upcoming Gigs (Next 30 Days)').waitFor();
      await page.locator('button[aria-haspopup="menu"]').last().click();
      await page.getByRole('menuitem', { name: 'Edit Profile' }).waitFor();
    },
    clip: { x: 1100, y: 0, width: 240, height: 290 },
  },
];

// ---------------------------------------------------------------- runner
const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : '';
const selected = shots.filter((s) => s.id.startsWith(only));
if (!selected.length) {
  console.error(`No shots match --only "${only}". Known ids:\n  ${shots.map((s) => s.id).join('\n  ')}`);
  process.exit(1);
}

fs.mkdirSync(authDir, { recursive: true });
const browser = await chromium.launch({ executablePath: EXEC });
const contextFor = (state, viewport = VIEWPORT) =>
  browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    ...(state ? { storageState: state } : {}),
  });

// One storage state per demo user, created through the real login form.
const stateFor = async (user) => {
  if (!user) return undefined;
  const file = path.join(authDir, `${user}.json`);
  if (!fs.existsSync(file)) {
    const ctx = await contextFor();
    const page = await ctx.newPage();
    await signIn(page, USERS[user]);
    await ctx.storageState({ path: file });
    await ctx.close();
  }
  return file;
};

let failed = 0;
for (const shot of selected) {
  const ctx = await contextFor(await stateFor(shot.user), shot.viewport);
  const page = await ctx.newPage();
  try {
    await shot.prepare(page);
    await settle(page);
    const out = path.join(outRoot, shot.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (shot.clip) {
      await page.screenshot({ path: out, clip: shot.clip });
    } else {
      const box = await shot.target(page).boundingBox();
      const pad = shot.pad ?? 0;
      await page.screenshot({
        path: out,
        clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad },
      });
    }
    console.log(`ok   ${shot.id} -> ${path.relative(repoRoot, out)}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${shot.id}: ${err.message.split('\n')[0]}`);
  }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
