# Phase 7 Migration Plan — Router + TanStack Query + Component Splits

**Source:** Remediation plan Phase 7 (Review §1, §3). This is the multi-session migration strategy to execute. Each step ends with `npm run typecheck && npm run lint && npm run test:run` green and a **STOP** for approval. **Do not big-bang `App.tsx`.**

## Goals
1. **URL routing** — every screen deep-linkable, refresh-safe, back-button-safe (a collaboration product needs shareable links). Replace the hand-rolled `Route` union + `localStorage` `currentRoute`/`selectedGigId` with react-router v7 (library mode).
2. **Server-state layer** — `@tanstack/react-query` for reads/mutations (caching, dedup, retries), replacing hand-rolled `useState`/`useEffect`/loading-flag plumbing.
3. **Shrink mega-components** to the <500-line guideline by extracting data hooks.

## New dependencies (named/approved in the remediation plan)
`react-router@7`, `@tanstack/react-query`. No others without proposing.

## Sequencing

### Step 0 — Deps & providers (no behavior change)
- Install both deps. Add `QueryClientProvider` in `src/main.tsx` (inside the Sentry `ErrorBoundary`, wrapping `AuthProvider`/`App`).
- Acceptance: app builds/runs identically; gates green.

### Step 1 — Router foundation (highest risk — `App.tsx` is the state machine) · **STOP**
- Map the `Route` union (~30 values) to URLs: `/gigs`, `/gigs/:gigId`, `/assets`, `/assets/:assetId`, `/kits`, `/kits/:kitId`, `/calendar`, `/team`, `/team/:memberId`, `/financials`, `/settings`, `/import`, `/inventory`, plus the special paths already handled: `/accept-invitation`, `/reset-password`, `/auth/google-calendar/callback`, `/org-selection`, `/create-org`, and `/dev-demo` (gate behind `import.meta.env.DEV`).
- Replace `localStorage` `currentRoute`/`selectedGigId` with URL state (`useParams`/`useNavigate`/`useSearchParams`). **Keep** `selectedOrganization` in context + `localStorage` (cross-cutting, not URL-bound for now).
- Preserve the mobile/desktop split (render mobile layout per-route when `isMobile`).
- Update `public/_redirects` SPA fallback so deep links resolve.
- **Preserve** the role-gating (`canManage`/`NavigationMenu`), the Viewer→gig-list dashboard guard, reset-password/invite flows, and Google-calendar/WebAuthn behavior.
- Acceptance: every screen deep-linkable + refresh/back-safe; `/dev-demo` DEV-only.

### Step 2 — TanStack Query foundation
- One `queryKeys` module: `['gigs', orgId]`, `['gig', gigId]`, `['assets', orgId]`, `['asset', assetId]`, `['kits', orgId]`, `['team', orgId]`, `['financials', gigId]`, etc.
- Services remain the single Supabase access layer; hooks wrap them with `useQuery`/`useMutation`.

### Step 3 — Migrate reads screen-by-screen (worst offenders first) · **STOP after each group**
Order (the mega-components the review named): **`TeamScreen.tsx`** → **`gig/GigFinancialsSection.tsx`** → **`ImportScreen.tsx`** → **`AssetScreen.tsx`**.
For each: replace `useState`/`useEffect`/loading-flag with `useQuery`; mutations → `useMutation` + invalidation; extract a data hook (`useTeamMembers`, `useGigFinancials`, …); split the component toward <500 lines. Tests green after each.

### Step 4 — Service + component splits
- Split `src/services/gig.service.ts` (~1,588 lines) per the coding guide: `gigParticipant.service.ts`, `gigFinancial.service.ts`, `gigStaff.service.ts`, `gigKit.service.ts`.
- Extract data hooks from the remaining large screens.

## Guardrails
- Gates green after **every** screen migration (incremental, not big-bang).
- Preserve all auth/role behavior added in this engagement (canManage gating, the silent-delete fix, the security migrations).
- Match existing patterns: services layer, Zod, sonner toasts, shadcn.

## STOP gates
After this plan (approved to start) · after Step 1 (router) · after each screen group in Step 3.
