// The screenshot manifest: every user-guide screenshot, defined once.
//
// Each shot:
//   id        '<section>/<page>-<what>', also the PNG path under
//             website/docs/src/assets/screenshots/
//   page      the guide page that shows it (under website/docs/src/content/docs/)
//   user      demo login key from USERS in shoot.mjs, or null for signed out
//   sources   app files whose UI the shot shows, so a change to them flags the
//             shot as possibly stale
//   prepare   async (page, ctx) => navigate and set up the screen
//   target    (page) => Locator, or an array of Locators, to crop to (their
//             combined box; optional pad, CSS px), or
//   clip      { x, y, width, height } in CSS px
//   viewport  optional override of the default 1200 x 900
//
// ctx.base is the app URL; ctx.users holds the demo emails.

// The demo gig most shots use: Harvest Gala Dinner & Dance, this Saturday.
const HARVEST_GALA = 'de000000-0000-4000-8000-000300000007';

const pick = async (page, trigger, option) => {
  await page.getByLabel(trigger).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

export const shots = [
  {
    id: 'getting-started/onboarding-sign-up',
    page: 'getting-started/onboarding.md',
    user: null,
    sources: ['src/components/LoginScreen.tsx'],
    prepare: async (page, ctx) => {
      await page.goto(ctx.base);
      await page.getByRole('tab', { name: 'Sign Up' }).click();
      await page.locator('#signup-firstname').fill('Nina');
      await page.locator('#signup-lastname').fill('Newman');
      await page.locator('#signup-email').fill(ctx.users.newuser);
      await page.locator('#signup-password').fill(ctx.password);
      await page.locator('#signup-confirm-password').fill(ctx.password);
      await page.evaluate(() => document.activeElement?.blur());
    },
    target: (page) => page.getByRole('tablist').locator('xpath=ancestor::div[contains(@class,"shadow-lg")][1]'),
    pad: 12,
  },
  {
    id: 'getting-started/onboarding-select-organization',
    page: 'getting-started/onboarding.md',
    user: 'newuser',
    sources: ['src/components/OrganizationSelectionScreen.tsx'],
    prepare: async (page, ctx) => {
      await page.goto(`${ctx.base}/org-selection`);
      await page.getByText('No organizations yet').waitFor();
    },
    clip: { x: 0, y: 0, width: 1200, height: 650 },
  },
  {
    id: 'getting-started/onboarding-edit-profile',
    page: 'getting-started/onboarding.md',
    user: 'admin',
    sources: ['src/components/EditUserProfileDialog.tsx'],
    viewport: { width: 1200, height: 1300 }, // tall enough for the whole dialog
    prepare: async (page, ctx) => {
      await page.goto(`${ctx.base}/dashboard`);
      await page.locator('button[aria-haspopup="menu"]').last().click();
      await page.getByRole('menuitem', { name: 'Edit Profile' }).click();
      await page.getByRole('dialog').waitFor();
      await page.evaluate(() => document.activeElement?.blur());
    },
    target: (page) => page.getByRole('dialog'),
  },
  {
    id: 'getting-started/the-dashboard-avatar-menu',
    page: 'getting-started/the-dashboard.md',
    user: 'admin',
    sources: ['src/components/AppHeader.tsx'],
    prepare: async (page, ctx) => {
      await page.goto(`${ctx.base}/dashboard`);
      await page.getByText('Upcoming Gigs (Next 30 Days)').waitFor();
      await page.locator('button[aria-haspopup="menu"]').last().click();
      await page.getByRole('menuitem', { name: 'Edit Profile' }).waitFor();
    },
    // The menu plus the avatar button above it.
    target: (page) => [page.getByRole('menu'), page.locator('button[aria-haspopup="menu"]').last()],
    pad: 12,
  },
  {
    id: 'gigs/overview-gig-list',
    page: 'gigs/overview.md',
    user: 'admin',
    sources: ['src/components/GigListScreen.tsx', 'src/components/tables/SmartDataTable.tsx'],
    prepare: async (page, ctx) => {
      await page.goto(`${ctx.base}/gigs`);
      await page.getByText('Harvest Gala Dinner & Dance').first().waitFor();
    },
    // Ends on a row boundary (the sixth upcoming gig).
    clip: { x: 0, y: 0, width: 1200, height: 592 },
  },
  {
    id: 'gigs/overview-gig-page',
    page: 'gigs/overview.md',
    user: 'admin',
    sources: ['src/components/gig/GigPage.tsx', 'src/components/layout/PageHeader.tsx'],
    prepare: async (page, ctx) => {
      await page.goto(`${ctx.base}/gigs/${HARVEST_GALA}`);
      await page.getByText('Load-Out').first().waitFor();
    },
    // Header, tabs, Schedule, Venue and the notes; Participants and Staffing are below.
    clip: { x: 0, y: 56, width: 1200, height: 620 },
  },
  {
    id: 'gigs/creating-a-gig-form',
    page: 'gigs/creating-a-gig.md',
    user: 'admin',
    sources: ['src/components/gig/basicInfo/GigBasicInfoFields.tsx', 'src/components/TagsInput.tsx'],
    viewport: { width: 1200, height: 1250 },
    prepare: async (page, ctx) => {
      // Fill the form but never select Create Gig.
      await page.goto(`${ctx.base}/gigs/new`);
      await page.locator('#title').fill('Winter Wonderland Gala');
      await page.locator('#start_time').fill('2026-12-05');
      await pick(page, 'start_time hour', '16');
      await pick(page, 'start_time minute', '00');
      await page.locator('#end_time').fill('2026-12-05');
      await pick(page, 'end_time hour', '23');
      await pick(page, 'end_time minute', '30');
      // The placeholder disappears after the first tag, so find the input by its label.
      const tags = page.getByText('Tags', { exact: true }).locator('xpath=following::input[1]');
      await tags.fill('Gala');
      await tags.press('Enter');
      await tags.fill('Holiday');
      await tags.press('Enter');
      await page.evaluate(() => document.activeElement?.blur());
    },
    target: (page) => page.getByText('Basic Information', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded")][1]'),
    pad: 8,
  },
  {
    id: 'gigs/change-history-history-tab',
    page: 'gigs/change-history.md',
    user: 'admin',
    sources: ['src/components/gig/GigPage.tsx', 'src/services/activityLog.service.ts'],
    prepare: async (page, ctx) => {
      await page.goto(`${ctx.base}/gigs/${HARVEST_GALA}`);
      await page.getByRole('tab', { name: 'History' }).click();
      await page.getByText('Gig created').waitFor();
    },
    // The tabs and the History card.
    target: (page) => [
      page.getByRole('tab', { name: 'Overview' }),
      page.getByText('Gig created').locator('xpath=ancestor::div[contains(@class,"rounded")][1]'),
    ],
    pad: 6,
  },
  // Held: getting-started/the-dashboard-overview waits for #157 (the Equipment
  // card's Total Value ignores quantity), so the guide doesn't show a wrong figure.
];
