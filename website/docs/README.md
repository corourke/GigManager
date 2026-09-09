# GigWrangler user documentation

Public user guide for GigWrangler, built with [Astro](https://astro.build) +
[Starlight](https://starlight.astro.build). Separate from the app (`/src`) and
from the internal docs (`/docs`).

> **Content outline and priorities:** [`docs/development/user-documentation-plan.md`](../../docs/development/user-documentation-plan.md)

Hosting: a **Cloudflare Workers** project (Workers Builds), `gigwrangler-docs`,
serving the static `dist/` as assets — separate from the marketing site
(`gigwrangler` Worker) and from the app.

---

## Run it locally

```bash
cd website/docs
npm install          # first time only (needs Node >= 22.12 — see "A note on Node")
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
draft: true        # optional — see "Hiding unfinished pages" below
sidebar:
  order: 2         # position within its section
---
```

The left-hand nav is **auto-generated per directory** (`astro.config.mjs` →
`sidebar` → one `autogenerate` group per folder under `src/content/docs/`). So:

- **New page** → just create the `.md` file in the right folder; it shows up in
  the nav automatically. No config edit.
- **Order** within a section comes from `sidebar.order`; the label defaults to
  `title` (override with `sidebar.label`).
- **New top-level section** → add one line to the `sidebar` array in
  `astro.config.mjs` and create the folder.

Callouts: `:::note`, `:::tip`, `:::caution`, `:::danger`. Components like `<Card>`
need an MDX file (`.mdx`) and an import. Full-text search (Pagefind) is automatic.

### Hiding unfinished pages

Put **`draft: true`** in a page's frontmatter. Then:

| | `npm run dev` | `npm run build:staging` | `npm run build` (production / Cloudflare) |
| --- | --- | --- | --- |
| Draft page | shown, with a "draft" banner | shown | **excluded** — no route, no nav entry, not in search or sitemap |

So drafts are fully editable and previewable locally, but never reach
`docs.gigwrangler.com`. Remove the `draft: true` line when a page is ready.

> Cloudflare preview deployments (non-`main` branches) also run `npm run build`,
> so they **don't** show drafts either. To share a draft-visible build, run
> `npm run build:staging` and deploy `dist/` somewhere yourself, or just use
> `npm run dev`.

Most pages in this repo are currently `draft: true` stubs — each has a
"## Cover" / "## Screenshots" / "## Source" checklist drawn from
`docs/development/user-documentation-plan.md`. Written pages carry `<!-- TODO -->`
comments for what's still missing.

---

## Day-to-day: edit and publish

Once the Cloudflare Worker is connected to this repo (see below), **you never
deploy by hand** — pushing to GitHub triggers a Cloudflare build + deploy.

1. Edit or add a file under `src/content/docs/` (a new file appears in the nav
   automatically). Not ready for readers? Add `draft: true` — see
   "Hiding unfinished pages".
2. Preview with `npm run dev` (or `npm run build && npm run preview` for the exact
   production output; `npm run build:staging` to preview *with* drafts).
3. Commit and push:
   ```bash
   git add website/docs
   git commit -m "docs: <what changed>"
   git push
   ```
4. Cloudflare Workers Builds reacts automatically:
   - push to **`main`** → runs `npm run build` then `npx wrangler deploy` →
     **production** at `docs.gigwrangler.com`,
   - push any **other branch** / open a PR → `npx wrangler versions upload` →
     a **preview** URL (`<version>-gigwrangler-docs.<subdomain>.workers.dev`),
     also posted on the PR.

To roll back: the Worker's **Deployments** tab in the dashboard → pick a known-good
deployment → **Rollback**, or locally `npx wrangler rollback` from `website/docs/`.

---

## First-time Cloudflare setup (Workers Builds)

Do this once. Needs a Cloudflare account with access to the `gigwrangler.com` zone
and permission to authorize the GitHub repo. Deploy config lives in
[`wrangler.jsonc`](./wrangler.jsonc) (project name, `./dist` as the asset
directory) — the dashboard only supplies the build/deploy commands and the repo
path.

1. Dashboard → **Workers & Pages** → **Create** → **Import a repository** →
   authorize GitHub → pick **`corourke/GigManager`**.
2. On **Set up your application**:
   | Field | Value |
   | --- | --- |
   | Project name | `gigwrangler-docs` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploy command | `npx wrangler versions upload` |
   | Path *(Advanced settings)* | `website/docs` |
   | Build variable *(optional)* | `NODE_VERSION` = `22` — only if the build fails on a Node error; `.nvmrc` in this folder already pins it |
   Leave the API token on **"a new token will be created automatically"**.
3. **Deploy**. First build runs; you get `https://gigwrangler-docs.<subdomain>.workers.dev`.
   Open it and confirm the site looks right.
4. Custom domain: the Worker → **Settings** → **Domains & Routes** → **Add** →
   **Custom domain** → `docs.gigwrangler.com`. Cloudflare creates the DNS record
   and certificate automatically (the zone is on the same account).
   *(Alternative: uncomment the `routes` line in `wrangler.jsonc` and redeploy.)*
5. Production branch is **`main`** by default; confirm under the Worker's build
   settings. Non-production branch builds (previews) are enabled by the
   **"Builds for non-production branches"** checkbox during setup.

After this, the "Day-to-day" flow above is all that's needed.

---

## A note on Node

Astro 7 requires **Node >= 22.12** (`astro`'s `engines` field). Anything from
Node 22 upward works — the site has been installed, built, and served on **Node 26**
with no issues. You do **not** need a version manager for local development; use
whatever Node you already have, as long as it's 22.12 or newer. (Node 20 and older
are *not* supported by Astro 7.)

What actually matters is the **Cloudflare build environment**: it runs on whatever
Node version it picks up, so pin it for reproducibility. Cloudflare Workers Builds
reads **`.nvmrc`** (set to `22` in this folder), so that's usually enough. If a
build ever fails on a Node error, also add a `NODE_VERSION` = `22` build variable
in the dashboard. Locally, use any Node ≥ 22.12.

---

## Where things live

| Path | What |
| --- | --- |
| `astro.config.mjs` | Site config + the sidebar tree |
| `src/content/docs/**` | The pages (Markdown / MDX) |
| `src/content.config.ts` | Content collection schema (rarely touched) |
| `public/` | Static files served as-is (favicon, images) |
| `wrangler.jsonc` | Cloudflare Worker deploy config (name, `./dist` assets) |
| `.nvmrc` | Node version pin for the Cloudflare build |
| `dist/` | Build output (git-ignored) |
