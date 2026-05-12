# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: ee2f665d-bb5b-4af9-98c3-58007d713010 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 39193731-cd6f-4ee1-a226-447263097d35 -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: 1de1695b-60ae-4918-b09a-880c420366cd -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Rebrand GigManager → GigWrangler in source code

Update every in-scope source file that still references "GigManager" or "GigMgr".

Files to change (all confirmed to contain the old name):

- `package.json` — `"name": "GigManager"` → `"name": "gigwrangler"`
- `vite.config.ts` — PWA manifest `name: 'GigManager'` → `'GigWrangler'`, `short_name: 'GigMgr'` → `'GigWrnglr'`
- `index.html` — `<title>GigManager</title>` → `<title>GigWrangler</title>` and `apple-mobile-web-app-title` meta content
- `src/components/mobile/MobileLayout.tsx` — fallback string `'GigManager'` → `'GigWrangler'`
- `src/services/googleCalendar.service.ts` — `[View in GigManager]` → `[View in GigWrangler]`
- `src/components/CalendarIntegrationSettings.tsx` — all three user-visible "GigManager" strings → "GigWrangler"
- `src/utils/idb/store.ts` — TypeScript interface `GigManagerDB` → `GigWranglerDB` and all usages of that type

Verification:
- Run `grep -r "GigManager\|GigMgr" src/ index.html package.json vite.config.ts` — expect zero matches
- Run `npm run test:run` — confirm no tests broken by renames

### [x] Step: Add Cloudflare Pages SPA redirect rule, .env.example, and .gitignore update

Three small infrastructure file changes required for production hosting:

1. **`public/_redirects`** (new file) — Vite copies `public/` into `build/` verbatim; Cloudflare Pages reads this to serve `index.html` for all SPA routes:
   ```
   /*    /index.html   200
   ```

2. **`.env.example`** (new file) — committed placeholder documenting required env vars:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

3. **`.gitignore`** — append `backups/` so pre-migration dump files are never committed.

Verification:
- Run `npm run build`
- Confirm `build/_redirects` exists and contains `/* /index.html 200`
- Confirm `build/index.html` `<title>` reads "GigWrangler"
- Confirm `build/manifest.webmanifest` shows `"name": "GigWrangler"`

### [x] Step: Final verification and manual setup instructions
<!-- chat-id: ebb95f5b-b77c-47e4-95e3-653bb05935a1 -->

Run the full verification suite to confirm the codebase is production-ready:

```bash
npm run build && npm run test:run
```

After a green build and tests, enumerate the following **manual** steps the user must complete outside the codebase:

**Supabase production project**
- Create a new Supabase project on the Pro plan; note its `PROD_REF` and database password
- Apply all migrations: `supabase db push --db-url "postgresql://postgres:[password]@db.[PROD_REF].supabase.co:5432/postgres"`
- Deploy edge functions: `supabase functions deploy --project-ref [PROD_REF]`
- Set edge function secrets: `supabase secrets set GOOGLE_PLACES_API_KEY=... --project-ref [PROD_REF]`
- In Supabase dashboard → Authentication → URL Configuration: set Site URL to `https://gigwrangler.com` and add `https://gigwrangler.com/**` to Redirect URLs
- Confirm automated daily backups are active (Dashboard → Database → Backups)

**Cloudflare Pages**
- Create a Cloudflare Pages project named `gigwrangler`
- Set build command `npm run build`, output directory `build`
- Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (production values)
- Add custom domain `gigwrangler.com` and verify HTTPS

**First deploy**
```bash
npm run build
npx wrangler pages deploy build/ --project-name gigwrangler
```

### [x] Step: Debugging runtime issues
<!-- chat-id: 44defebb-ac78-4020-b8df-1c9c2c73afe2 -->
