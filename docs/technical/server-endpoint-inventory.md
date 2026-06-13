# `server` Edge Function — Endpoint Inventory & Authorization Spec

**Purpose**: This is the security specification for the Phase 6 Hono refactor. Every endpoint below must behave identically after the refactor, *except* where a gap is flagged and you approve a fix. The "Intended" column is what the new `requireUser` / `requireOrgRole` middleware will enforce — **please confirm or correct each one**.

Source: `supabase/functions/server/index.ts` (3,322 lines, all running with the service-role key). All paths are relative to the `/server` (or legacy `/make-server-de012ad4`) prefix.

Legend — **Auth**: 🔓 public · 🔑 any authenticated user · 👤 self only · 🏢 org member · 🛡️ org Admin/Manager · 👑 org Admin.

## Users

| # | Method | Path | Current enforcement | Intended | Notes |
|---|--------|------|---------------------|----------|-------|
| 1 | GET | `/health` | 🔓 none | 🔓 public | Health check. |
| 2 | POST | `/users` | 🔑 + writes own row | 👤 self | Creates the caller's profile row. |
| 3 | GET | `/users/:id` | 🔑 only | 🔑 (keep — defer) | Returns **any** user's full row. Tightening deferred → Future Considerations. |
| 4 | PUT | `/users/:id` | 🔑 + `user.id===:id` (403 otherwise) | 👤 self | Correct. |
| 5 | GET | `/users?search=` | 🔑 only | 🔑 (keep — defer) | Searches **all** users; returns PII. Tightening deferred → Future Considerations. |
| 6 | GET | `/users/:id/organizations` | 🔑 only | 🔑 (keep — defer) | Returns **any** user's org memberships. Tightening deferred → Future Considerations. |

## Organizations & Members

| # | Method | Path | Current enforcement | Intended | Notes |
|---|--------|------|---------------------|----------|-------|
| 7 | GET | `/organizations` | 🔑 only | 🔑 (by design) | World-readable to authed users — documented org-discovery model (security-scheme §4). |
| 8 | POST | `/organizations` | 🔑 only | 🔑 (keep open) | Any authed user can create an org (becomes its Admin). Confirmed intended (self-serve onboarding). |
| 9 | PUT | `/organizations/:id` | 🔑 + (global admin OR org 👑) | 👑 | `user_is_admin` RPC short-circuit, else `verifyOrgMembership(['Admin'])`. |
| 10 | DELETE | `/organizations/:id` | 🔑 + (global admin OR org 👑) | 👑 | Same pattern. |
| 11 | POST | `/organizations/:id/members` | 🛡️ (Admin/Manager); 👑 required to grant Admin | 🛡️ | Self-add path also present. |
| 12 | GET | `/organizations/:id/members` | 🔑 + (global admin OR 🏢) | 🏢 | Lists members. |
| 13 | GET | `/organizations/:id/members/:uid` | 🏢 | 🏢 | Single member detail. |
| 14 | PUT | `/organizations/:id/members/:uid` | 🛡️; 👑 required to change to/from Admin | 🛡️ | Role/profile update. |
| 15 | DELETE | `/organizations/:id/members/:uid` | 🛡️; 👑 required to remove an Admin | 🛡️ | Remove member. |
| 16 | DELETE | `/invitations/:id` | 🛡️ of the invitation's org | 🛡️ | Cancel/decline an invite. |
| 17 | POST | `/organizations/:id/invitations` | 🛡️ | 🛡️ | Create invite. |
| 18 | POST | `/organizations/:id/members/create` | 🛡️ | 🛡️ | Create-and-add member. |

## Gigs

| # | Method | Path | Current enforcement | Intended | Notes |
|---|--------|------|---------------------|----------|-------|
| 19 | GET | `/gigs?organization_id=` | 🏢 of the query org | 🏢 | Lists gigs for an org the caller belongs to. |
| 20 | GET | `/gigs/:id` | 🏢 of any participant org (intersection) | 🏢 (intersection) | Correct intersection check. |
| 21 | POST | `/gigs` | 🛡️ of `primary_organization_id` **only if that field is present** | 🛡️ (FIX — always) | **Bug.** Refactor requires `primary_organization_id` and always enforces 🛡️. Failing test first. |
| 22 | PUT | `/gigs/:id` | 🛡️ of a participant org (intersection) | 🛡️ (intersection) | Correct. |
| 23 | DELETE | `/gigs/:id` | 🛡️ of a participant org (intersection) | 🛡️ (intersection) | Correct. |
| 24 | GET | `/organizations/:id/dashboard` | 🏢 (Admin/Manager/Staff) | 🏢 | Staff allowed (read-only dashboard). |

## Integrations — Google Places (API-key proxy)

| # | Method | Path | Current enforcement | Intended | Notes |
|---|--------|------|---------------------|----------|-------|
| 25 | GET | `/integrations/google-places/search` | 🔑 | 🔑 | Proxies Places API; auth gates key abuse. No org concept. |
| 26 | GET | `/integrations/google-places/:rest` | 🔑 | 🔑 | Place details proxy. |

## Integrations — Google Calendar (per-user OAuth)

| # | Method | Path | Current enforcement | Intended | Notes |
|---|--------|------|---------------------|----------|-------|
| 27 | POST | `/integrations/google-calendar/exchange-token` | 🔑, operates on caller's own tokens | 👤 (self tokens) | |
| 28 | POST | `/integrations/google-calendar/refresh-token` | 🔑, self | 👤 | |
| 29 | POST | `/integrations/google-calendar/calendars` | 🔑, self | 👤 | Lists caller's calendars. |
| 30 | POST | `/integrations/google-calendar/events` | 🔑, self | 👤 | Create event on caller's calendar. |
| 31 | DELETE | `/integrations/google-calendar/events` | 🔑, self | 👤 | |
| 32 | POST | `/integrations/google-calendar/sync-gig-all-users` | 🔑 only | 🏢 intersection (FIX) | **Bug.** Refactor requires caller be a member of a participant org of `gig_id`. Failing test first. |

## WebAuthn (mobile device lock)

| # | Method | Path | Current enforcement | Intended | Notes |
|---|--------|------|---------------------|----------|-------|
| 33 | POST | `/webauthn/register/options` | 🔑, self | 👤 | Enroll a device for the caller. |
| 34 | POST | `/webauthn/register/verify` | 🔑, self | 👤 | |
| 35 | POST | `/webauthn/authenticate/options` | 🔓 (identifies by email) | 🔓 (confirmed) | Unlock flow — confirmed public by design. |
| 36 | POST | `/webauthn/authenticate/verify` | 🔓 (identifies by email) | 🔓 (confirmed) | Unlock flow — confirmed public by design. |

---

## Authorization decisions (resolved 2026-06-12)

The review (§5) flagged this audit as outstanding — these are the resolutions, now baked into the refactor spec above.

- **Q-A — User directory exposure (#3, #5, #6).** ✅ **Decision: keep open for now**, preserve exact behavior during the refactor. Tightening to shared-org/gig is tracked in Future Considerations below.
- **Q-B — Open org creation (#8).** ✅ **Decision: keep open** — self-serve onboarding. Revisit with rate-limiting/abuse controls before public launch.
- **Q-C — Gig creation check bypass (#21).** ✅ **Decision: FIX** — require `primary_organization_id`, always enforce Admin/Manager membership of it. Failing test first.
- **Q-D — Calendar sync access check (#32).** ✅ **Decision: FIX** — require caller be a member of a participant org of `gig_id` (intersection). Failing test first.
- **Q-E — WebAuthn unlock endpoints (#35, #36).** ✅ **Decision: keep public** — unlock flow, gates only the cosmetic UI lock (the Supabase session in localStorage stays valid regardless), not data access.

## Future Considerations (deferred, not in this refactor)

- **User-directory PII scoping (from Q-A).** Tighten `/users/:id`, `/users?search=`, and `/users/:id/organizations` to only return users who share an organization or participating gig with the caller — matching security-scheme §4. Deferred to keep the refactor behavior-preserving; requires a regression pass on the app's people-pickers (team invite, gig staffing) since result sets will narrow.
- **Org-creation abuse controls (from Q-B).** Pair open org creation with rate-limiting and an abuse plan before any public launch.

---

## Refactor notes (not authorization, but in scope)

- **CORS**: the handler currently reflects any `Origin` *and* sets `Access-Control-Allow-Credentials: true` (review §5.4). The refactor replaces this with the pinned-origin allowlist (shared with `ai-scan`).
- **`RP_NAME = 'Field Ops Mobile'`** (Figma Make scaffolding) — rename via env-var default to the real product.
- **`kv_store` / `kv_store_de012ad4`**: used by the WebAuthn challenge flow. Has data behind it → will confirm with you before any change (Phase 6 task 4).
- **500 responses**: now route through Sentry (Phase 5) and return a clean body; two WebAuthn `details: error.message` leaks remain and will be cleaned up here.
