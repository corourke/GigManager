// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GigWrangler user documentation → docs.gigwrangler.com (Cloudflare Workers).
// See wrangler.jsonc for deploy config and README.md for the workflow.
export default defineConfig({
  site: 'https://docs.gigwrangler.com',
  outDir: './dist',
  // Pages that moved in the 2026-10 restructure. Keep these so old links work.
  // Only published pages need an entry; drafts never had a public URL.
  redirects: {
    '/organizations/overview/': '/team/overview/',
    '/organizations/categories/': '/settings/categories/',
    '/calendar/google-calendar/': '/settings/google-calendar/',
    '/import/overview/': '/financials/receipts-and-invoices/',
  },
  integrations: [
    starlight({
      title: 'GigWrangler Docs',
      description:
        'User guide for GigWrangler — production and labor management for AV, sound, lighting, and events.',
      social: [
        { icon: 'external', label: 'gigwrangler.com', href: 'https://gigwrangler.com' },
      ],
      editLink: {
        baseUrl: 'https://github.com/corourke/GigManager/edit/main/website/docs/',
      },
      // Sections mirror the app's navigation (Dashboard, Gigs, Equipment,
      // Financials, Team, and Settings in the avatar menu).
      // Sidebar is AUTO-GENERATED per directory. To add a page: create the .md
      // file under src/content/docs/<dir>/ — it appears automatically. Control
      // position with `sidebar.order` in frontmatter; label defaults to `title`.
      //
      // Pages with `draft: true` in frontmatter are shown by `npm run dev` (and
      // `npm run build:staging`) but EXCLUDED from `npm run build` (production /
      // Cloudflare), so unfinished pages never reach docs.gigwrangler.com.
      sidebar: [
        { label: 'Getting Started', items: [{ autogenerate: { directory: 'getting-started' } }] },
        { label: 'Gigs', items: [{ autogenerate: { directory: 'gigs' } }] },
        { label: 'Equipment', items: [{ autogenerate: { directory: 'equipment' } }] },
        { label: 'Financials', items: [{ autogenerate: { directory: 'financials' } }] },
        { label: 'Team', items: [{ autogenerate: { directory: 'team' } }] },
        { label: 'Settings & Integrations', items: [{ autogenerate: { directory: 'settings' } }] },
        { label: 'Mobile & Field', items: [{ autogenerate: { directory: 'mobile' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
    }),
  ],
});
