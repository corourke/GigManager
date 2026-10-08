# User guide screenshots

Retakes the screenshots in `website/docs/src/assets/screenshots/` from the **dev** demo
data, so any shot can be refreshed after the UI changes. The rules for what to shoot
and how to crop are in [`website/docs/STYLE.md`](../../website/docs/STYLE.md#screenshots).

- `shots.mjs` is the manifest: every shot, the guide page that shows it, the demo
  user who takes it, the app files it shows, and how to set up and crop the screen.
- `shoot.mjs` runs them.
- `taken.json` records, per shot, when it was last taken, at which app commit and
  with which anchor date. The script rewrites it; commit it with the PNGs.

## Setup (dev Supabase only, never production)

1. Seed the demo data: `scripts/seed-demo.sh` (see `scripts/README.md`). It creates the
   demo logins, all with the password `demo1pass`.
2. Put the dev `VITE_SUPABASE_URL` and the **anon** key in `.env.development.local` at the repo root.
   Never use the service_role key.
3. Start the app: `npm run dev` (port 3000), or set `SHOT_BASE_URL`.
4. Install once: `cd scripts/screenshots && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`.

## Run

```sh
node scripts/screenshots/shoot.mjs                         # every shot
node scripts/screenshots/shoot.mjs --only getting-started/ # one section, or one shot id
node scripts/screenshots/shoot.mjs --list                  # shot ids and their pages
```

Settings (environment variables):

| Variable | Default | |
|---|---|---|
| `SHOT_BASE_URL` | `http://localhost:3000` | The app |
| `SHOT_ANCHOR` | `2026-10-07` | The browser's frozen "today". Must match the anchor the seed was run with. |
| `SHOT_CHROMIUM` | `/opt/pw-browsers/chromium` | Chromium executable |

Every shot is taken in a 1200 × 900 window at 2× scale, light theme, time zone
`America/Los_Angeles`, with the clock frozen at 10 AM on the anchor date. Each demo
user signs in once per run through the real login form.

## Adding a shot

1. Add an entry to `shots` in `shots.mjs`. Its `id` is `<section>/<page>-<what>` and
   becomes the PNG path. List the app files the screen comes from in `sources`.
   Crop with `target` (a Locator, or an array of them for their combined box, plus an
   optional `pad`) rather than a fixed `clip` where you can, so the crop follows the UI.
2. Run it with `--only <id>` and look at the PNG.
3. Reference it from the page, right after the text it illustrates, with alt text:
   `![What the image shows](../../../assets/screenshots/<id>.png)`.
4. Keep each PNG under about 300 KB.

## Full refresh (each production release)

Re-run the seed (optionally with a new anchor date, then pass the same `SHOT_ANCHOR`),
run every shot, review the changed PNGs, and commit them with `taken.json`.
