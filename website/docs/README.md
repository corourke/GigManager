# GigWrangler user documentation

Public user guide for GigWrangler, built with [Astro](https://astro.build) +
[Starlight](https://starlight.astro.build). Separate from the app (`/src`) and
from the internal docs (`/docs`).

## Develop

```bash
cd website/docs
npm install
npm run dev        # http://localhost:4321
```

## Build

```bash
npm run build      # static site → website/docs/dist/
npm run preview    # serve the build locally
```

## Content

Pages are Markdown / MDX under `src/content/docs/`. The URL is the path under that
folder (`getting-started/onboarding.md` → `/getting-started/onboarding/`). The
left-hand nav is defined explicitly in `astro.config.mjs` (`sidebar`), so new
pages must be added there to appear.

Frontmatter uses Starlight's schema — `title` and `description` at minimum;
`sidebar.order` controls ordering within a group. Full-text search (Pagefind) is
automatic.

Source outline and priorities: [`docs/development/user-documentation-plan.md`](../../docs/development/user-documentation-plan.md).

## Deploy

Intended as its own Cloudflare Pages project on **docs.gigwrangler.com**:

| Setting | Value |
| --- | --- |
| Root directory | `website/docs` |
| Build command | `npm run build` |
| Build output directory | `website/docs/dist` |
| Node version | 20 or 22 (`NODE_VERSION` env var) |

To serve under `gigwrangler.com/docs` instead, set `base: '/docs'` in
`astro.config.mjs` and route that path to this project.

> Node: this repo's root currently runs a newer Node than Astro officially
> supports. Pin the Pages build (and local `nvm`) to Node 20 or 22 for the docs
> build.
