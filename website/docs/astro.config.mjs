// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GigWrangler user documentation.
// Deploy target: docs.gigwrangler.com (its own Cloudflare Pages project).
// To serve under gigwrangler.com/docs instead, set `base: '/docs'` here and
// point the Pages project's build output at this directory.
export default defineConfig({
  site: 'https://docs.gigwrangler.com',
  outDir: './dist',
  integrations: [
    starlight({
      title: 'GigWrangler Docs',
      description:
        'User guide for GigWrangler — production and labor management for AV, sound, lighting, and events.',
      // Astro/Starlight look for a repo-hosted logo; using text title for now.
      social: [
        { icon: 'external', label: 'gigwrangler.com', href: 'https://gigwrangler.com' },
      ],
      editLink: {
        // Update `main` if docs move to a different default branch.
        baseUrl: 'https://github.com/corourke/GigManager/edit/main/website/docs/',
      },
      // Pagefind full-text search is on by default. No config needed.
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'What is GigWrangler?', slug: 'getting-started/what-is-gigwrangler' },
            { label: 'Signing up', slug: 'getting-started/onboarding' },
            { label: 'Getting into an organization', slug: 'getting-started/organizations' },
            { label: 'The dashboard', slug: 'getting-started/the-dashboard' },
          ],
        },
        {
          label: 'Gigs',
          items: [
            { label: 'Overview', slug: 'gigs/overview' },
            { label: 'Creating a gig', slug: 'gigs/creating-a-gig' },
            { label: 'Staffing & participants', slug: 'gigs/staffing-and-participants' },
            { label: 'Schedule / run of day', slug: 'gigs/schedule' },
            { label: 'Change history', slug: 'gigs/change-history' },
          ],
        },
        {
          label: 'Equipment & Inventory',
          items: [{ label: 'Overview', slug: 'equipment/overview' }],
        },
        {
          label: 'Financials',
          items: [{ label: 'Overview', slug: 'financials/overview' }],
        },
        {
          label: 'Calendar & Integrations',
          items: [{ label: 'Google Calendar', slug: 'calendar/google-calendar' }],
        },
        {
          label: 'Reference',
          items: [{ label: 'Roles & access', slug: 'reference/roles-and-access' }],
        },
      ],
    }),
  ],
});
