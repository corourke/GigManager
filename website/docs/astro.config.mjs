// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GigWrangler user documentation → docs.gigwrangler.com (Cloudflare Workers).
// See wrangler.jsonc for deploy config and README.md for the workflow.
export default defineConfig({
  site: 'https://docs.gigwrangler.com',
  outDir: './dist',
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
      // Sidebar is AUTO-GENERATED per directory. To add a page: create the .md
      // file under src/content/docs/<dir>/ — it appears automatically. Control
      // position with `sidebar.order` in frontmatter; label defaults to `title`.
      //
      // Pages with `draft: true` in frontmatter are shown by `npm run dev` (and
      // `npm run build:staging`) but EXCLUDED from `npm run build` (production /
      // Cloudflare), so unfinished pages never reach docs.gigwrangler.com.
      sidebar: [
        { label: 'Getting Started', items: [{ autogenerate: { directory: 'getting-started' } }] },
        { label: 'Organizations & Team', items: [{ autogenerate: { directory: 'organizations' } }] },
        { label: 'Gigs', items: [{ autogenerate: { directory: 'gigs' } }] },
        { label: 'Equipment & Inventory', items: [{ autogenerate: { directory: 'equipment' } }] },
        { label: 'Financials', items: [{ autogenerate: { directory: 'financials' } }] },
        { label: 'Data Import & AI Scanning', items: [{ autogenerate: { directory: 'import' } }] },
        { label: 'Calendar & Integrations', items: [{ autogenerate: { directory: 'calendar' } }] },
        { label: 'Mobile & Field Operations', items: [{ autogenerate: { directory: 'mobile' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
    }),
  ],
});
