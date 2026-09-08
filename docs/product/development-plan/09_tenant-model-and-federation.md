# Tenant Model & Federation — Direction and Plan

**Last Updated**: 2026-09-07
**Status**: Direction agreed; several decisions still open (see §9)

Records the chosen direction for how organizations run GigWrangler and how the
little they share crosses between them. The full options analysis behind this is
[tenant-isolation-architecture.md](../../technical/tenant-isolation-architecture.md);
this doc is the decision, the collaboration-model redesign, and the build plan.

For current functional requirements see [requirements.md](../requirements.md);
those will need edits once this lands (§8).

---

## 1. The direction

**Primary model: self-serve self-hosting (Option I).** Each organization creates
and owns its own Supabase project — their account, their billing, their
credentials — and installs GigWrangler against it. Cameron never has access to
any organization's data. The trust guarantee is *structural* (no credentials, no
access path) and *verifiable* (source-available, reproducible builds).

**Secondary model, later: a hosted convenience tier.** Same codebase, operated by
Cameron for organizations that would rather not run infrastructure. Built after
the self-hosted path is solid. See §3 for sequencing.

**Cross-organization coordination: an opt-in federation layer** carrying only a
thin scheduling / busy-free signal plus a deliberately minimal shared gig core.
Nothing federates unless an organization explicitly turns it on, per gig. See §5.

### What this is chosen over

| Rejected | Why |
|---|---|
| Status quo (shared DB + RLS) | Cameron can read everything; fails the core requirement. |
| Searchable field encryption + org KMS (analysis "Tier 1") | Level 2.5 only (plaintext in Cameron's process memory at decrypt); costs server-side financial aggregation and the AI receipt scan in their current form. |
| Cameron-run per-tenant DBs / project-per-tenant ("Tier 2") | Cameron still holds credentials. Option I is the same idea with the org owning the account outright — strictly stronger, similar friction. |
| Confidential computing / enclaves ("Tier 3") | Disproportionate for a solo team at this stage. |
| Local-first desktop app (Option H) | Requires tearing out Supabase, betting on a sync engine, and it gives up multi-user-without-setup, first-class mobile, and unlosable backups. Option I keeps all of that. |

---

## 2. Locked assumptions (decided)

1. **Both models, self-hosted first.** Ship self-hosting; add the hosted tier once
   it is proven and the operational tooling exists.
2. **The organization runs everything.** Their Supabase account, billing, plan
   choice, auth config, secrets, frontend hosting decision. This is a genuine
   heavy lift for a non-technical owner; a provisioning wizard (§7, M1) narrows it
   but does not remove it. Accepted.
3. **Users deploy builds.** Cameron controls neither the schema nor the deploy.
   Every schema change becomes a fleet-compatibility exercise across installs
   Cameron cannot see, permanently. Accepted. (Note: 49 migrations today, +3 in
   the first week of September alone — the schema is still moving quickly. §7 M1
   treats "make every migration skip-safe forever" as a hard gate.)
4. **The collaboration surface is small and opt-in.** See §5. The working
   assumption is that very little is both useful *and* safe to share between
   independent instances owned by potential competitors.

---

## 3. Sequencing

- **Milestone 1 — Self-host without federation (~3 months).** Provisioning wizard,
  hosted-frontend split, in-app migration runner + compatibility gate,
  zero-access support tooling, licensing. Shippable to the security-motivated
  segment on its own. Task breakdown in §7.
- **Milestone 2 — Federation (~3 months).** The relay service and the in-app
  federation client implementing the §5 model.
- **Milestone 3 — Hosted tier (later, unscoped here).** Cameron runs the
  Milestone-1 stack as a service, plus billing, provisioning, and support
  tooling for it. Not a second application.

Permanent costs that begin at Milestone 1 and never stop: the migration /
compatibility tax on every schema change, and a docs-plus-forum support model.

---

## 4. License

**Recommendation: [FSL](https://fsl.software/) (`FSL-1.1-Apache-2.0`) for the
application; Apache-2.0 for the federation protocol.**

Rationale:

- The trust claim ("Cameron can't read your data") is only *verifiable* if the
  source is readable and the build reproducible — so closed-source is out, and so
  is a fully permissive license for the app (it would let a competitor run a
  hosted GigWrangler on day one, and Cameron is committing to a hosted business).
- FSL permits self-hosting for an organization's own use, including paying a
  consultant to set it up — the only prohibited use is running it *as a competing
  commercial product*. It converts automatically to Apache-2.0 **2 years** after
  each release. "Becomes real open source soon, and permanently" is a strong
  signal for exactly the buyer who is self-hosting out of distrust.
- FSL is BSL's lessons distilled: no per-release Change-Date bookkeeping, a
  cleaner "permitted purpose" definition. A 2-year competitive window is ample
  for a solo founder in a niche vertical; after that the network effect, brand,
  and hosted operations are the moat.
- **Split the license:** the federation wire protocol spec, the relay's API
  contract, and a minimal client SDK go under **Apache-2.0**. Reasons: other
  instances must be able to implement compatibility without license friction;
  "federation is an open standard, not lock-in" strengthens the trust pitch; and
  if relays are ever run by a customer consortium (see §5), the code is already
  free to use. The protected value is the app and the hosted service, not the
  bytes on the wire.

**Contributor terms:** adopt a **DCO** (a `Signed-off-by` line, no paperwork) so
Cameron retains the right to offer commercial licenses / dual-license later.

**DECISION NEEDED (§9-A):** confirm FSL, or choose the fallback. The fallback, if
you want the OSI "real open source" badge and can accept a competitor legally
hosting it, is **AGPL-3.0**. Avoid: Elastic License v2 (never converts — worse
optics), SSPL (toxic), BSL (fine, but FSL is the tidier form of the same idea).

---

## 5. Collaboration model (redesigned)

With independent self-hosted instances there is no shared database and no RLS
backstop. Every shared byte is a deliberate transfer into another organization's
database *and* into the relay operator's logs. The test for every field:

> Would the sending organization be comfortable if this exact value showed up in a
> competitor's database and in the relay operator's logs?

Two layers, different rules.

### 5.1 Layer 1 — Availability signal (visible to organizations you are *not* working with)

Purpose: "is organization X available on date D?" for a scheduler who may not be a
participant on anything.

**Shareable (opt-in, publisher's policy):**

- A **busy / free marker** over a date or date range. No time-of-day unless the
  publisher opts into that granularity.
- Optionally, a **tentative vs confirmed** flag (a hold vs a booked engagement).
- Optionally, the publisher's **own identity** — but the default is a pseudonymous
  handle that only organizations already federated with the publisher can
  resolve.

**Never at this layer:** what the engagement is, where, the client, the value,
who else is involved, the role.

**Person-level availability is org-mediated.** "Is this person free" is answered
by their employing organization's instance, never published to a global feed. A
freelancer's calendar aggregated across several organizations is precisely the
dangerous case.

**Mechanism:** each instance computes its own busy/free projection from its
private staffing and gig data and publishes only that. The relay stores it with
short retention — once the date range passes, delete. This is the RFC 7953 /
Exchange free-busy pattern, kept deliberately dumb.

### 5.2 Layer 2 — Shared gig core (participants only, opt-in per gig)

The honest question is which fields are *genuinely shared facts* versus *one
organization's private view of a shared engagement*.

| Field | Share? | Notes |
|---|---|---|
| Schedule: start/end/timezone + run-of-show milestones (load-in, doors, set times, load-out) | **Yes — shared** | Highest value, lowest sensitivity. Everyone on site needs the same run-of-show. |
| Status, **per participant** (hold / confirmed / cancelled / completed) | **Yes — shared, shown side by side, not merged** | Each org's commitment level is a genuinely different fact. |
| A random shared gig identifier | **Yes** | Not either organization's primary key. |
| Participant list — which org handles, which roles | **Yes, to co-participants only** | Inherently mutual; also the single biggest residual disclosure (who works with whom). Relay holds pseudonymous handles only. |
| Location / venue | **Explicit, per gig** | Can imply the client. Off by default; on if the booking org chooses, or automatically if a venue is itself a participant (they already know). |
| One named on-site contact per organization ("day-of lead + phone") | **Explicit, per gig, opt-in** | One person, chosen by that org. **Not** the roster. |
| Notes posted to an explicit shared thread | **Explicit, per item** | A deliberate "everyone on this gig should see this" channel, separate from the org's private gig notes. |
| Attachments explicitly marked shared (stage plot, rider, site map) | **Explicit, per item** | Client-encrypted to the participant set so the relay cannot read them. |
| Financials — fees, budget, margin, staff pay, client invoicing | **Never leaves the instance** | The money is adversarial even on a collaborative gig. |
| Staffing roster — names, rates, roles, contacts of the crew this org is sending | **Never** | Competitive and privacy problem. The single on-site contact above is the only exception. |
| Equipment / kits this org is bringing | **Never** | Coordinate via a shared note, not by exposing the asset database. |
| Client relationship — contacts, terms, history, preferences | **Never** | The organization's crown jewel. |
| The org's own private gig notes, purchasing, activity log | **Never** | — |

### 5.3 Permission model

- **Nothing federates by default.** A gig is private until a Manager or Admin of a
  participating organization explicitly shares it and invites another
  organization's instance.
- **Sharing is per-gig and per-category** — a checklist at share time: schedule?
  location? a named contact (which one)? open a shared notes thread? Attachments
  and notes are shared one at a time.
- **Each organization publishes its own view** of the shared fields (its status,
  its confirmed schedule, its contact) and consumes the others'. There is no
  single authored "shared gig" row that one organization owns and the rest read.
- **Conflicts are shown, not merged.** If org A says confirmed and org B says
  hold, both are displayed — they are different facts.
- **Revocation:** an organization can un-share a gig or leave. Its published data
  is deleted from the relay and, best-effort, from other participants' caches
  (once seen, it has been seen — the same as any shared data anywhere).
- **The relay only ever holds** pseudonymous org/person/gig handles, the shared
  fields, and timing. Minimal retention.

### 5.4 Who runs the relay

- **Cameron-run** (default for launch): simplest, most reliable, Cameron controls
  the protocol version. Holds only the minimal dataset above.
- **Peer-to-peer, no relay:** possible for direct instance-to-instance exchange,
  but loses store-and-forward (an invite cannot land while the peer is offline)
  and still needs *a* discovery / key root; availability lookups fail when the
  source instance is unreachable.
- **Consortium / federation of relays:** a customer association runs it; Cameron
  ships the relay under Apache-2.0. Removes Cameron from the trust question
  entirely; adds governance overhead. A later option, enabled by the license
  split in §4.

### 5.5 Residual leak — stated plainly

Even with all of the above, the relay operator and co-participants can observe:

1. **The collaboration graph over time** — handle A and handle B keep sharing
   gigs. Pseudonymous, but traffic analysis plus known event dates can
   re-identify.
2. **The busy calendar** — a handle is busy on these dates.

For a busy/free scheduling signal among production companies this is a low-stakes
leak. If it is not acceptable to the customer, the only full closes are
consortium/federated relays (no single operator sees the whole graph) or pure P2P
(federation only works when both parties are online). Document this honestly in
the product's security page.

---

## 6. Authentication & identity

- Self-hosted instances use their own Supabase Auth. **Google OAuth cannot be
  automated** (Google has no API to create OAuth clients), so the self-hosted
  default is **email/password + magic link**, which the wizard can fully
  configure. "Sign in with Google" becomes a documented optional manual step.
- A person who works for two organizations has an account on each instance. A
  single federated identity would require the relay (or a separate IdP) to broker
  it. For a busy/free-only federation, **two logins is acceptable** — do not build
  identity brokering for Milestone 2.
- Keep the `server` edge function as-is; it deploys fine to the organization's own
  project and its authorization middleware still applies. Do not move its logic
  into RPCs for the self-hosted path — that is unnecessary work.

---

## 7. Milestone 1 build — task breakdown

Target: a security-motivated organization can self-onboard and run GigWrangler
against its own Supabase project, updated safely over time, supportable by a solo
founder. No federation yet.

| # | Task | Notes | Rough size |
|---|---|---|---|
| 1 | **Provisioning wizard** | OAuth the user into Supabase → create a project via the Management API in *their* org → apply all migrations via the Management API query endpoint (no local Docker/CLI) → deploy the `server` and `ai-scan` functions → set the required secrets → configure auth (site URL, redirect URLs, magic link) → return the project URL + anon key. | 3–5 wk |
| 2 | **Hosted-frontend, multi-backend** | One Cameron-hosted static frontend that takes an organization's project URL + anon key (first-run entry, or a wizard deep link) and talks *directly* to that Supabase. The anon key is public by design and RLS is the boundary, so hosting the frontend leaks nothing. Handles per-org Google client ID and Sentry opt-in. | 1–2 wk |
| 3 | **In-app migration runner + compatibility gate** | Bundle the migration set in the app; on launch, compare the app's version against the project's `supabase_migrations.schema_migrations` and apply pending migrations forward; every migration transactional and leaving the DB on the prior version on failure; the frontend refuses to run against a schema outside its supported range and prompts self-update. | 3–4 wk + permanent tax |
| 4 | **Make all migrations skip-safe, forever** | Audit all ~49 existing migrations so a v1 → vN replay works: no dependency on an object a later migration removes, no calls to external services, no data backfills that assume a live API. Add a CI test that replays v1 → vN on an empty database. **Hard gate before the first external install.** | 1–2 wk + ongoing discipline |
| 5 | **Bounded-skew upgrade policy** | Decide and document the max supported version jump (model on Home Assistant's "≤6 releases", OneUptime's "one major at a time"). Keep and test stepping-stone releases. | 0.5 wk + ongoing |
| 6 | **Zero-access support tooling** | In-app diagnostics screen (schema version, migration history + last failure, per-table row counts, project health checks, build version); one-click redacted support bundle (schema-only dump + migration log + scrubbed recent errors + masked config); preflight health checks on launch (project reachable? migrations current? storage bucket present? auth configured? plan about to pause?). | 2–4 wk |
| 7 | **Error reporting** | Opt-in Sentry pointed at Cameron's project (aggregate error visibility) with clear scoping, or self-hosted collector pointed at the org's. | 0.5–1 wk |
| 8 | **Reproducible builds + published checksums** | So "which build / has it been tampered with" is answerable, and the trust claim is verifiable. | 1–2 wk |
| 9 | **Licensing + docs** | Apply FSL headers; a license-key check if the app is to be gated commercially; a docs site with an install guide and an upgrade guide; a support forum (Discourse-style — a solo founder cannot do 1:1 support at scale). | 2–3 wk + ongoing |
| 10 | **Billing** (Stripe) | For the eventual license / federation tier. Can trail M1. | 1–2 wk |

**Plan-affecting decisions inside M1:** whether "Sign in with Google" is dropped
for self-hosted or kept as a manual step (§9-B); whether SMTP is wizard-guided
(paste a Resend key), Cameron-relayed, or left to Supabase's rate-limited default
(§9-C).

---

## 8. Documentation this direction makes stale

To update once the direction is confirmed (not before — the edits depend on the
§9 decisions):

- **[requirements.md](../requirements.md)** — the Overview "Multi-Organization
  Collaboration" bullet and §2 "Multi-Tenant Architecture" describe the shared-DB
  model. Add: the narrowed cross-org data boundary (§5), Federation / Availability
  as a feature, and Self-Hosted as a deployment model.
- **[security-scheme.md](../../technical/security-scheme.md)** — "Intersection-Based
  Gig Access" is being deliberately narrowed. Describe the target end-state and
  the self-hosted trust model.
- **[tech-stack.md](../../technical/tech-stack.md)** /
  **[deployment.md](../../technical/deployment.md)** — new components: the
  self-hosted delivery model, the provisioning wizard, the federation relay
  service, the hosted-frontend split.
- **[01_roadmap.md](01_roadmap.md)** — "Multi-tenant architecture with RLS … our
  strongest architectural differentiator" is superseded by the self-hosted +
  federation story.
- **Prior schema-remediation work** — the in-place Phase-1 RLS fixes from the
  2026-09-02 schema-verification report are **on hold**: the self-hosted model
  removes the cross-tenant surface they addressed. Revisit only if neither
  Milestone 1 nor a hosted-with-isolation path lands within ~2 quarters.

---

## 9. Open decisions — what to review

| Ref | Decision | Recommendation | Blocks |
|---|---|---|---|
| **9-A** | **License.** Confirm FSL (`FSL-1.1-Apache-2.0`) for the app + Apache-2.0 for the federation protocol, with a DCO for contributors. | FSL as above. Fallback: AGPL-3.0 if the OSI badge matters more than blocking a hosted competitor. | Applying license headers (M1 task 9); public repo. |
| **9-B** | **Google sign-in on self-hosted** — drop it (magic link only) or keep it as a documented manual Google Cloud step. | Drop for self-hosted; magic link only. Keep Google for the future hosted tier. | Wizard scope (M1 task 1). |
| **9-C** | **Transactional email for self-hosted** — wizard-guided Resend key, a Cameron-run relay (email addresses transit Cameron), or Supabase's rate-limited default. | Wizard-guided Resend key; document the default as a fallback for tiny teams. | Wizard scope (M1 task 1). |
| **9-D** | **Relay operator for launch** — Cameron-run, or push straight to a consortium model. | Cameron-run for launch; design the protocol (Apache-2.0) so a consortium can take it over later. | Milestone 2 design. |
| **9-E** | **Person-level availability** — confirm it is org-mediated only (never a global person feed), per §5.1. | Confirm. | Milestone 2 data model. |
| **9-F** | **Collaboration model sign-off** — is the §5.2 share / don't-share table right? In particular: location default-off, one contact not the roster, financials/staffing/kits/clients never shared. | As written. | Milestone 2; requirements.md edits. |
| **9-G** | **Commercial model** — license sale, paid federation tier, paid support, hosted tier: which are in for v1? | Federation tier + license/support; hosted tier is Milestone 3. | Billing (M1 task 10); pricing page. |
| **9-H** | **Bounded-skew policy** — the maximum version jump a self-hosted install may take before stepping through an intermediate release. | Pick a number (e.g. 6 releases or 1 major), model on Home Assistant. | M1 task 5. |

### Also worth your read

- **§2 assumption 3** — the schema is still changing fast (+3 migrations in a
  week). "Users deploy builds" plus a fast-moving schema is the riskiest part of
  this plan. If the schema is *not* close to stabilizing, that is a reason to
  reconsider timing, not direction.
- **§5.5** — the residual leak (collaboration graph + busy calendar visible to the
  relay operator). Confirm it is acceptable for the target customer, or commit to
  the consortium-relay close.
- **§7 task 4** — making 49 migrations replay-safe forever is unglamorous and
  load-bearing. It should be a hard gate, not a "later."
