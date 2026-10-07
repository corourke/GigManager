# User guide screenshots

Playwright harness that retakes the screenshots in `website/docs/src/assets/screenshots/`.
Rules for what to shoot are in `website/docs/STYLE.md` (demo data only, light theme, 1440x900 at 2x, cropped to the subject).

## Setup (dev Supabase only)

1. Seed demo data: `scripts/seed-demo.sh` (dev project `qcrzwsazasaojqoqxwnr`). Demo logins use password `DemoPass!2026`.
2. Put `VITE_SUPABASE_URL` and the **anon** key for dev in `.env.local` at the repo root. Never use the service_role key.
3. The `select-organization` shot needs a throwaway account with no organization, `demo-newuser@gigwrangler.test`
   (same password). Create it once via the auth signup API with the anon key, or from the Sign Up form against dev.
4. Start the app: `npm run dev` (port 3000), or set `SHOT_BASE_URL`.
5. `cd scripts/screenshots && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`

## Run

```
node scripts/screenshots/shoot.mjs                      # all shots
node scripts/screenshots/shoot.mjs --only getting-started/the-dashboard
```

Env: `SHOT_BASE_URL` (default `http://localhost:3000`), `SHOT_CHROMIUM` (default `/opt/pw-browsers/chromium`).

Each user signs in once through the real login form; the session is cached in `.auth/` (git-ignored). Delete it to force a fresh login.

## Adding a shot

Add an entry to `shots` in `shoot.mjs`: `id`, `file` (`<section>/<page>-<what>.png`), `user` (`admin`, `manager`, `staff`, `newuser`, or `null` for signed out), `prepare(page)`, and either `target(page)` (a Locator, optional `pad`) or a `clip` in CSS pixels. Optional `viewport` overrides the size for tall dialogs.
Then reference the PNG from the page with alt text. Keep each PNG under about 300 KB.
