# GigWrangler user documentation

Public user guide for GigWrangler, built with [Astro](https://astro.build) +
[Starlight](https://starlight.astro.build). Separate from the app (`/src`) and
from the internal docs (`/docs`).

/ **Content outline and priorities:** [`docs/development/user-documentation-plan.md`](../../docs/development/user-documentation-plan.md)

---

## Run it locally

```bash
cd website/docs
npm install          # first time only (Node 20 or 22 — see "A note on Node")
npm run dev          # http://localhost:4321, hot-reloads as you edit
```

To check the real production build (what Cloudflare serves):

```bash
npm run build        # static site → website/docs/dist/
npm run preview      # serve dist/ at http://localhost:4321
```

You do **not** commit `dist/` — Cloudflare runs `npm run build` itself.

---

## Write content

Pages are Markdown / MDX files under `src/content/docs/`. The file path is the
URL: `getting-started/onboarding.md` → `/getting-started/onboarding/`.

Every page needs frontmatter (Starlight's schema):

```md
---
title: Signing up
description: One sentence for search results and social cards.
sidebar:
  order: 2        # position within its sidebar group
---
```

The left-hand navigation is **defined explicitly** in `astro.config.mjs`
(`sidebar: [...]`). A new page does not appear in the nav until you add an entry
there:

```js
{ label: 'Signing up', slug: 'getting-started/onboarding' }
```

Callouts: `:::note`, `:::tip`, `:::caution`, `:::danger`. Components like `<Card>`
need an MDX file (`.mdx`) and an import. Full-text search (Pagefind) is automatic.

---

## Day-to-day: edit and publish

Once Cloudflare Pages is connected to this repo (see below), **you never push to
Cloudflare directly** — pushing to GitHub builds and deploys the site.

1. Edit or add a file under `src/content/docs/`. New page → also add it to the
   `sidebar` in `astro.config.mjs`.
2. Preview with `npm run dev` (or `npm run build && npm run preview` for the exact
   production output).
3. Commit and push:
   ```bash
   git add website/docs
   git commit -m "docs: <what changed>"
   git push
   ```
4. Cloudflare Pages reacts automatically:
   - push a branch / open a PR → a **preview deployment** at a `*.pages.dev` URL
     (also commented on the PR),
   - merge to `main` → the **production deployment** at `docs.gigwrangler.com`.

To roll back, in the Cloudflare Pages dashboard open **Deployments**, find a good
one, and choose **Rollback to this deployment**.

---

## First-time Cloudflare Pages setup

Do this once. Needs a Cloudflare account with access to the `gigwrangler.com` zone
and permission to authorize the GitHub repo.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorize GitHub and pick **`corourke/GigManager`**. Production branch: **`main`**.
3. Build settings:
   | Setting | Value |
   | --- | --- |
   | Framework preset | Astro |
   | Root directory (advanced) | `website/docs` |
   | Build command | `npm run build` |
   | Build output directory | `dist` *(relative to root directory)* |
   | Environment variable | `NODE_VERSION` = `22` |
4. **Save and Deploy**. First build runs; you get a `https://<project>.pages.dev`
   URL. Open it and confirm the site looks right.
5. Custom domain: project → **Custom domains** → **Set up a domain** →
   `docs.gigwrangler.com`. Cloudflare adds the DNS record automatically when the
   zone is on the same account; otherwise add a `CNAME docs → <project>.pages.dev`.
6. (Optional) **Settings → Builds & deployments** → enable preview deployments for
   all branches / PRs so drafts get a shareable URL.

After this, the "Day-to-day" flow above is all that's needed.

---

## A note on Node

The repo root runs a newer Node than Astro officially supports. Pin the docs build
to **Node 20 or 22**:

- Cloudflare: the `NODE_VERSION=22` env var above.
- Locally: `nvm use 22` (or `fnm`, `asdf`, …) before `npm install` / `npm run dev`
  in this directory. `.nvmrc` here sets `22` so `nvm use` picks it up.

---

## Where things live

| Path | What |
| --- | --- |
| `astro.config.mjs` | Site config + the sidebar tree |
| `src/content/docs/**` | The pages (Markdown / MDX) |
| `src/content.config.ts` | Content collection schema (rarely touched) |
| `public/` | Static files served as-is (favicon, images) |
| `dist/` | Build output (git-ignored) |
