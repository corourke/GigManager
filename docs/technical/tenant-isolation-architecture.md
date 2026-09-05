# Tenant Isolation Architecture — Options Analysis

**Purpose**: Evaluate realistic architectures for giving each organization a *credible, verifiable guarantee that the operator (Cameron) cannot read its data*, while preserving a narrow cross‑org sharing layer (shared gig core + busy/free availability). Architecture exploration to inform a direction decision. **No implementation.**

**Status**: Draft for discussion
**Last Updated**: 2026-09-04
**Related**: [security-scheme.md](./security-scheme.md), [database.md](./database.md), [tech-stack.md](./tech-stack.md), [server-endpoint-inventory.md](./server-endpoint-inventory.md), and the 2026‑09‑02 schema‑verification report (scratchpad).

---

## Executive summary

**The reframe changes the question from "how separate" to "what guarantee, and can the org check it."** Every "operator can't read it" mechanism sits on a trust ladder: **level 1 — policy promise** ("we don't look"), undoable unilaterally and often invisibly by anyone with DB credentials and deploy rights — how essentially all SaaS runs; **level 2 — structural**, where access is still possible but leaves evidence or needs collusion (break‑glass workflows, externally‑held audit logs, SOC 2 controls an auditor checks yearly); **level 3 — cryptographic / hardware‑enforced**, where the operator doesn't hold the keys, or can only decrypt inside an environment it can't observe, or only with the customer's live, logged cooperation — the only level that survives a hostile operator with full infrastructure control. The requirement is asking for level 3, or a level‑2 arrangement the target customer actually believes. Almost every *topology* option on its own — shared DB, schema‑per‑tenant, database‑per‑tenant, project‑per‑tenant on Supabase — is **level 1**: physical separation under infrastructure Cameron runs still means Cameron holds the credentials. Separation alone doesn't deliver the guarantee; a mechanism from §3 has to be layered on top.

**The mechanisms that attack this directly, with honest costs:**

- **Client‑side E2E encryption, tenant‑held keys** — true level 3, verifiable by reading the client code. But Postgres can't index, filter, sort, join, or aggregate ciphertext, so concretely: financial totals and per‑gig P&L break (aggregation is SQL today), sorting/filtering lists by amount/vendor/notes breaks, full‑text search breaks, and **the AI receipt scan breaks by design** (it needs the image, returns plaintext). Plus a real key‑management system where a lost key means unrecoverable data. Not a bolt‑on — only viable if the product is repositioned around it.
- **Searchable field‑level encryption (CipherStash‑style), key in the org's KMS** — the practical middle. Encrypted values carry blind‑index metadata so equality/range queries, sorts, and joins still work server‑side; lists still sort and filter, foreign keys work. **Aggregates still break** (totals move client‑side), and the AI scan still needs plaintext. The org holds the key and audits every decrypt; disable the key and Cameron's copy is ciphertext. Best fit for "don't make the product unbuildable."
- **BYOK / hold‑your‑own‑key in the org's KMS** — real revocation and org‑held audit, but **it's level 2 dressed as crypto**: if Cameron's app decrypts to serve requests, plaintext is in Cameron's memory at decrypt time. Protects data at rest and gives a clean exit; does not blind the running operator.
- **Confidential computing / TEEs** — the only approach where the operator running the compute genuinely can't read it. Production‑grade primitives exist at all three major clouds, but the tooling assumes a team that can build reproducible enclave images and run attestation verifiers. Disproportionate for a solo/small‑team product unless operator‑exclusion becomes the entire pitch.
- **Escrow / split‑key** — a governance layer for "no single party can act alone," not a primary mechanism.
- **The boring answer — SOC 2 + DPA + immutable operator‑access logs + reputation** — level 1/2, and it's how Stripe, Salesforce, and QuickBooks hold financial data for millions of businesses. Legitimately enough if customers compare GigWrangler to other cloud SaaS. Not enough when a customer is a known competitor of another customer, or when the pitch is explicitly "unlike the others, we can't see your data."

**Federation gets harder under encryption, not easier.** If org A's data is under A's key and B's under B's, a shared gig row can't use either. The answer: draw the encryption boundary around the *private* data only and keep the shared core (dates, status, participants, explicitly‑shared attachments) as a small cleartext hub projection — it's the data multiple orgs see by definition, so nothing new leaks. Busy/free across encrypted stores is its own problem, solved the same way calendaring has solved it for decades (RFC 7953 / Exchange free/busy federation): each org's spoke computes a redacted "P is busy [range]" from its own locally‑decrypted data and publishes only that. Firm rule: *nothing tenant‑encrypted ever needs to federate; anything that must federate was never private.*

**Automatic provisioning is real but doesn't solve the read problem by itself.** Supabase's Management API creates projects programmatically; Neon is better built for per‑tenant fleets (scale‑to‑zero, a PostgREST‑compatible Data API so GigWrangler's 232 data‑layer calls would survive a move). But **if Cameron's automation creates the project under Cameron's account and stores the credentials, Cameron can read all of them** — provisioning just multiplies the problem. For provisioning to also deliver the guarantee, the project must live in the *org's own* cloud account with Cameron connecting via org‑issued revocable credentials (bring‑your‑own‑database, automated), or the data must be encrypted with keys Cameron never holds. Applying migrations to N projects needs a fleet migration runner with per‑project version tracking, canary rollout, and code that tolerates version skew — a failed migration partway through leaves the fleet in several schema versions at once.

**Recommendation — tiered, because the tiers stack:**

- **Tier 0 (now, everyone):** SOC 2 Type II + DPA + least‑privilege prod access + externally‑held immutable logs of every operator query. Clears the default market bar; prerequisite for selling anything stronger credibly.
- **Tier 1 (the recommended core investment):** searchable field‑level encryption on the sensitive columns with the key in the org's own KMS. Keeps the product buildable; costs server‑side financial aggregation and the AI scan in their current form. Guarantee: "operator can't read the DB, can only decrypt transiently in‑request with your audited key" — honestly level 2.5, not level 3.
- **Tier 2 (premium, for orgs that won't accept shared infra):** automated provisioning of a per‑tenant Neon/Supabase project *in the org's own account*, Cameron connecting via revocable credentials. Their cloud, their keys, their logs. Costs onboarding friction, roughly linear ops, and the fleet‑migration machinery.
- **Tier 3 (only if operator‑exclusion becomes the product):** confidential‑computing enclaves or trimmed client‑only E2EE. Defer.
- **Federation across all tiers:** hub‑and‑spoke; the hub holds only the minimized cleartext shared core + opt‑in busy/free projection; private data never crosses.

**The honest bottom line:** nothing here is free. Verifiable operator‑exclusion costs either features (Tier 1), onboarding friction and ops (Tier 2), or a disproportionate engineering investment (Tier 3). Tier 1 is the smallest thing that gives a target org a guarantee it would believe while keeping the product shippable.

**The questions that would most change the recommendation:** (1) Are server‑side financial aggregation and the AI receipt scan non‑negotiable? (2) Will target orgs connect their own cloud account / KMS? (3) Is the bar "better than the other cloud SaaS" or "provably can't see it, like a password manager"? (4) How many orgs, what size? (5) Is "Cameron cannot read it" truly hard, or is "not commingled, revocable, portable on exit" enough? See §10 for the full list.

---

## 1. The requirement, restated

The goal is **not** physical separation for its own sake. Cameron's framing:

> "If there was a reliable and verifiable way to keep me from being able to read their data, maybe we would not need tenants to spin up their own instance."

So separate instances are one *means*; the *end* is an operator‑exclusion guarantee an org would actually believe and could actually check. A pooled or shared architecture stays on the table if it can deliver that.

Two things still have to hold no matter which architecture wins:

1. **Narrow federation.** Even with the operator excluded:
   - **Shared gig core** — one logical gig several orgs participate in: dates, status, title, tags, hierarchy, and only the attachments/notes each participant explicitly marks shared. Participating orgs read; participating managers write.
   - **Availability signal** — "person P (or org O) is busy on range D," optionally "…for org O," with **no gig details**, potentially visible to orgs *not* on the gig.
   Encryption makes this *harder*, not easier (§4.2).

2. **Identity.** One person often works for several orgs. Today that's one `auth.users` row and one login. Splitting auth systems fractures that unless identity stays centralized.

### 1.1 The trust ladder — what a "guarantee" is actually worth

Every "Cameron can't read it" mechanism sits at one of three levels. **Be honest about which level each option delivers**, because a level‑1 promise dressed in security language is still a promise.

| Level | What it is | Can an operator with DB creds + deploy rights undo it? | Example |
|---|---|---|---|
| **1 — Policy promise** | "We don't look." Contract, privacy policy, internal access rules, "only two employees have prod access." | **Yes, unilaterally, often invisibly.** | How essentially all SaaS runs. |
| **2 — Structural / procedural** | Access is technically possible but leaves evidence or needs cooperation: break‑glass workflows, append‑only audit logs held off‑box / by a third party, separation of duties, SOC 2 controls checked yearly by an auditor. | **Yes, but not silently and usually not alone** (needs collusion or leaves a trail). | AWS/GCP internal access controls; SOC 2 Type II. |
| **3 — Cryptographic / hardware‑enforced** | The operator doesn't hold the keys, or holds them only inside an environment it can't observe (TEE + attestation), or can only decrypt with the customer's live, logged cooperation (HYOK/EKM). | **No** — undoing it means breaking crypto, compromising the customer's KMS, or defeating hardware attestation. | Client‑side E2EE; confidential computing with remote attestation; hold‑your‑own‑key. |

The requirement is asking for **level 3**, or a **level‑2 arrangement strong enough that the target customer believes it**. Most options in §3–§5 land at level 1 or 2 unless explicitly paired with a mechanism from §3.

### 1.2 Verification — the other half

A guarantee the org can't check is a nicer‑sounding policy promise. Verification paths, strongest first:

- **Hold your own key, watch your own KMS logs.** Every decryption is a line item in *the org's* audit log; the org can deny any unwrap. Self‑verifying by construction. (Level 3.)
- **Open source + reproducible build + runtime attestation** that the running binary is that source. The org (or a researcher) can verify without trusting the operator. (Level 3; see [AWS: reproducible builds + Nitro Enclaves](https://aws.amazon.com/blogs/web3/establishing-verifiable-security-reproducible-builds-and-aws-nitro-enclaves/), [Kettle / attestable builds](https://arxiv.org/pdf/2505.02521v1).)
- **Independent audit / SOC 2 Type II / pentest report.** You trust the auditor, not the operator. (Level 2.)
- **Published IaC + immutable, externally‑held operator‑access logs** the org can subscribe to. (Level 2.)
- **Run it yourself.** Verification by ownership — but that's the "spin up your own instance" path Cameron wants to avoid.

---

## 2. What GigWrangler is today (grounding for the estimates)

| Layer | Implementation | Coupling / portability |
|---|---|---|
| Frontend | React 18 + Vite → **Cloudflare Pages** (`wrangler pages deploy`) | Backend URL baked at build time (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). One backend per build. |
| Data API | Supabase **PostgREST** — **232 `.from()` + ~20 `.rpc()` call sites across 16 service modules** | Portable to any PostgREST‑dialect endpoint (self‑hosted Supabase, Neon Data API). A rewrite to a SQL client otherwise. |
| Tenancy | **RLS: 61 policies, 43 SECURITY DEFINER functions**; `organization_members` = join + RBAC; `gig_participants` = gig↔org M:N | The product's security model. Collapses to near‑nothing in a one‑tenant‑per‑DB world; the *shared‑core* tables still need policies. |
| Auth | Supabase Auth — **42 call sites**, centralized in `src/contexts/AuthContext.tsx`; Google OAuth + email/password + magic link; JWT drives RLS via `auth.uid()` | **The lock‑in.** OAuth wiring + JWT issuance + `auth.users` are Supabase‑platform logic. Biggest single lift to replace. |
| Storage | Supabase Storage — **3 call sites**, one private bucket `attachments`, `{org_id}/{file}` paths, 1‑hour signed URLs | Light. An `AttachmentStore` interface over S3/R2/MinIO is days. |
| Realtime | `postgres_changes` — **2 subscriptions** (`AuthContext` user row, `useTeamData` org members) | Light. Droppable / pollable. |
| Edge functions | **2** Deno: `server` (Hono, service‑role, ~6 route groups, re‑implements the intersection check) and `ai-scan` (Anthropic receipt OCR proxy) | Portable to Deno Deploy / containers. |
| Migrations | **42**, linear, `supabase db push`. `deploy_prod.sh`: gate on CI‑green + `origin/main` sync → schema+data backup → `db push` (expand‑only) → `functions deploy` → Pages deploy → smoke check. **One target.** | Single‑target script; no fleet concept. |
| Schema | ~25 public tables, ~70 FKs, 17 enums. Every tenant table has `organization_id → organizations(id) ON DELETE CASCADE` (two nullable: `gig_financials`, `gig_staff_slots`). | Small. |

**Takeaways:** the data layer is portable *iff* a PostgREST endpoint is preserved. Auth is the lock‑in. Storage/realtime are noise. The ops machinery assumes exactly one backend. Nothing today encrypts anything above the disk — Supabase (and thus Cameron) can read every byte.

---

## 3. Operator‑exclusion approaches

These are mechanisms, not topologies. Any one can be layered onto the topologies in §5. Each is scored on the guarantee it gives, how an org verifies it, and what it costs GigWrangler concretely.

### 3.1 Client‑side / end‑to‑end encryption, tenant‑held keys

**Mechanism.** The frontend encrypts sensitive fields before they reach PostgREST, with a key the server never sees. The DB stores ciphertext. Edge functions and Cameron see ciphertext only.

**Guarantee / verification.** Level 3. Verifiable by reading the client code (which runs on the org's machines) and confirming keys never leave.

**What breaks in GigWrangler — concretely.** Postgres can't index, filter, sort, join, or aggregate ciphertext. Everything that relies on the database doing work on a *value* moves to the client or dies:

| Feature | Under naive E2EE | Path forward |
|---|---|---|
| Financial totals, per‑gig P&L, org Financials reporting (`gig_financials`/`purchases` SUM/GROUP BY, `create_purchase_transaction_v1`) | **Breaks.** Aggregation is SQL today. | Pull rows to client and total there (fine at 100s, bad at 10,000s), or maintain a client‑written encrypted running total. Conflicts with the [reporting‑gap](../product/reporting-gap-202608.md) roadmap, which wants *more* server aggregation. |
| Sort/filter lists by amount/category/vendor/notes | **Breaks for encrypted columns** (`.order()`, `.eq()`, range filters over PostgREST). | Dates/status/ids stay cleartext (low‑sensitivity, shared anyway); sensitive columns need client‑side sort/filter or searchable encryption (§3.2). |
| Full‑text search (vendor, description, notes) | **Breaks** — no `ilike`, no `tsvector`. | Client‑side search, or blind‑index equality via §3.2. |
| **AI receipt scan** (`ai-scan` → Anthropic) | **Breaks by design** — needs the image, returns plaintext fields. | Run fully client‑side (browser → Anthropic with the *org's own* API key, never touching Cameron's server), or make receipt‑scan an explicit plaintext‑in‑transit opt‑in. The sharpest "needs plaintext" example. |
| `server` intersection authz | **Survives** — checks ids/membership, not payloads. Ids stay cleartext. |
| Conflict detection | **Survives** — already client‑side, operates on ids + dates. |
| Realtime | **Survives** — notifications carry ids; client decrypts. |
| Google Calendar sync of gig title | **Partially breaks** — needs plaintext title server‑side unless sync moves client‑side. |

**Key management is the real project.** A tenant key only the org holds means solving: where it lives (admin password‑derived? key file every user imports? org KMS?), how new users get it (wrap the data key to each user's public key on invite), offboarding (rotate + re‑encrypt), and loss (**data is gone; Cameron cannot help** — that's the point and the liability). This is a cryptographic access‑control system, not a library call. Months, plus a permanent "we lost our key" support channel that ends in data loss.

**Verdict.** Real level‑3 guarantee. Costs server‑side reporting, search, and the AI scan in their current form, plus a key‑management system. Viable only if the product is *repositioned* around "encrypted, we genuinely can't see it" and the feature set is trimmed to match. Not a bolt‑on.

### 3.2 Searchable / queryable field‑level encryption (CipherStash‑style)

**Mechanism.** Fields encrypted at the app layer with per‑value keys, stored *with* searchable encrypted metadata (blind indexes, order‑revealing tokens) that let Postgres filter/sort/join without decrypting. Decryption only in the authorized client. **[CipherStash ships this for Postgres with a Supabase integration](https://supabase.com/blog/searchable-field-level-encryption-with-cipherstash)**; keys held in the org's own KMS ("ZeroKMS"). [MongoDB Queryable Encryption](https://www.mongodb.com/company/blog/product-release-announcements/queryable-encryption-expands-search-power) is the analogue (GA targeted 2026 — not production‑ready before then).

**Guarantee / verification.** Level 3 for confidentiality of the encrypted columns (server sees ciphertext + metadata, never plaintext), with a caveat: blind indexes leak *some* structure (equality patterns, order). Keys in the org's KMS → the org audits every key op.

**What survives vs §3.1.** Equality + range queries, sorts, and joins work on encrypted columns — gig/purchase lists still sort by amount server‑side, category filters work, FKs work. Full‑text is partial (blind‑index equality, not `ilike`). **Aggregates (SUM/AVG) still break** — order‑revealing metadata doesn't let the server add ciphertexts — so financial totals still move client‑side or to a client‑maintained rollup. The `ai-scan` problem is unchanged.

**Costs.** A Postgres proxy or client lib in the data path, per‑column encryption config, org‑KMS integration, added latency, and a dependency on a third‑party crypto product (or its OSS core).

**Verdict.** The most practical way to remove operator read access from the sensitive columns while keeping GigWrangler feeling like a normal app. Best fit for "don't make the product unbuildable."

### 3.3 Tenant‑managed keys in the org's KMS (BYOK / HYOK / EKM)

**Mechanism.** Data encrypted at rest with a key in a KMS the **org** controls — AWS KMS in their account, or an external HSM via [AWS XKS](https://cpl.thalesgroup.com/encryption/amazon-web-services-aws/external-key-store-xks) / [Google Cloud EKM](https://cloud.google.com/blog/ja/products/identity-security/hold-your-own-key-with-google-cloud-external-key-manager). Cameron's infra calls the org's KMS to decrypt. The org can rotate/disable/delete the key (killing access) and sees every unwrap **in its own logs**. Precedent: Salesforce Shield, Snowflake Tri‑Secret Secure.

**Guarantee / verification.** **Level 2 dressed as crypto — say this plainly.** BYOK/EKM protects data *at rest* and makes revocation + audit real and org‑held. But if Cameron's app decrypts to run queries / render pages / aggregate, the plaintext is in Cameron's memory at decrypt time, where a hostile operator could log it. It does **not** blind the running operator. To get level 3 from this, the decrypt must happen where Cameron can't observe → §3.4.

**Costs.** KMS integration, per‑request or per‑session unwrap latency, and it only bites if paired with app‑layer field encryption (BYOK on just the disk protects against a stolen disk, not against Cameron).

**Verdict.** Honest enterprise middle. Real value: revocability, org‑held audit, "the DB dump is useless without our key." Pair with §3.2 so the KMS key actually gates the sensitive data. Sells well to security teams who know exactly what it does and doesn't do.

### 3.4 Confidential computing / TEEs

**Mechanism.** Cameron's decrypt/query path (edge functions, or a small service) runs in a hardware enclave — [AWS Nitro Enclaves](https://aws.amazon.com/blogs/web3/establishing-verifiable-security-reproducible-builds-and-aws-nitro-enclaves/), Azure Confidential VMs, GCP Confidential Space. The enclave *attests* (proves which code image it runs) to the org's KMS, which releases the key only to a build the org has vetted. The host operator sees ciphertext in, ciphertext out, and an attestation quote — not plaintext, not keys.

**Guarantee / verification.** Level 3, and the only approach where "the operator running the compute still can't read it" is true. Verified via reproducible enclave image + attestation. Caveat: you still trust the CPU vendor and cloud; recent research ([SoK: a cloudy view on trust relationships of CVMs](https://arxiv.org/pdf/2503.08256)) argues public‑cloud CVMs fall short of the marketing.

**Maturity (2026), honestly.** Primitives are production‑grade at all three major clouds; overhead <5% ([backend confidential computing 2026](https://thebackenddevelopers.substack.com/p/confidential-computing-for-backends), [AWS/Azure/GCP guide](https://cloudandclear.uk/confidential-computing-aws-azure-gcp/)). But the tooling assumes a team that can build reproducible enclave images, run an attestation verifier, manage KMS release policy, and debug workloads with no shell and no persistent storage (Nitro Enclaves have no disk, no network by design). **For a solo/small‑team product this size, disproportionate** unless operator‑exclusion becomes *the* product.

**What still doesn't work.** Postgres isn't in the enclave. Either the DB stores ciphertext and the enclave is a decrypt/query gateway (back to §3.2's constraints for anything the DB must filter/sort/aggregate), or you run confidential Postgres and accept the operational strangeness. `ai-scan` from inside an enclave needs an attested outbound proxy — more plumbing.

**Verdict.** Right tool for a confidentiality‑is‑the‑pitch company. Premature here. Revisit if the market demands level 3 and §3.2 + §3.3 prove insufficient.

### 3.5 Escrow / split‑key / threshold

**Mechanism.** Shamir‑split the data key so decryption needs k‑of‑n parties (org + Cameron + independent escrow agent), or a neutral third party releases the key only under defined, logged conditions ("break‑glass").

**Guarantee / verification.** Governance layer, not a standalone answer. Gives "no single party, including Cameron, can act alone" and a business‑continuity path ("if the org disappears, a defined process recovers their data").

**Costs.** Legal + operational: who's the third party, what triggers release, who pays, what's the SLA.

**Verdict.** Worth it only for specific continuity/compliance demands. Layer onto §3.1–3.3; not primary.

### 3.6 The boring answer: contracts + audits + reputation

**Mechanism.** Level 1/2. A DPA legally barring data access except for defined support; **SOC 2 Type II** with an access‑control section a third party tests yearly; least‑privilege prod access with break‑glass; **immutable, externally‑held audit logs of every operator query**; annual pentest; cyber‑insurance.

**When it's legitimately enough.** This is how Stripe, Salesforce, QuickBooks, and essentially every vertical SaaS holds financial + operational data for millions of businesses. If GigWrangler's customers compare it to *other cloud SaaS* (not to self‑hosting), a credible SOC 2 + DPA + a clear access‑log story clears the bar for most of them.

**When it isn't.** When a customer is a known competitor of another customer (the scenario in the brief), when a large customer's security team runs a real vendor review, or when the pitch is explicitly "unlike the others, we can't see your data." Then level‑1/2 reads as "trust me" and loses to a competitor offering BYOK or self‑hosting.

**Verdict.** The right *first* move regardless — table stakes, unlocks most of the market. Necessary, not sufficient, for the orgs that triggered this requirement.

---

## 4. Federation

### 4.1 Federation primitives (the menu every topology picks from)

| # | Mechanism | Shape | Good for | Bad at |
|---|---|---|---|---|
| F1 | **Central shared table** — gig core in one DB all parties reach | Sync, single copy | Simplicity, strong consistency | That DB is an availability + trust chokepoint |
| F2 | **Replication / event stream** — authored in a "home" DB, CDC‑streamed to participants | Async, N copies | Local readable copy; survives hub outage for reads | Eventual consistency; must define the writer; schema changes don't replicate |
| F3 | **`postgres_fdw` foreign tables** — spokes mount hub gig‑core tables | Sync, transparent SQL | No app changes; joins "just work" | Cross‑DB joins over the internet are slow/fragile; pins spokes to hub uptime; Supabase pooler makes inbound FDW awkward |
| F4 | **API federation** — hub exposes REST/RPC; spokes call it | Async or sync, explicit | Portable, versionable, auditable, firewall‑friendly | Most code; you're building a mini‑protocol |
| F5 | **Free/busy publish‑subscribe** — each side publishes a redacted availability feed. Precedent: **[RFC 7953 Calendar Availability](https://www.rfc-editor.org/rfc/rfc7953.html)**, **[Microsoft Exchange federation trust](https://learn.microsoft.com/en-us/exchange/shared-free-busy)** for cross‑org free/busy | Async, redacted by construction | Exactly the availability requirement; mature, standardized | Solves availability only, not the shared gig core |

The availability layer maps almost perfectly onto **F5** — cross‑org free/busy has been a solved calendaring problem for 20 years. The shared gig core is the harder half and needs F1–F4.

### 4.2 Federation *under encryption* — the new hard part

Encryption makes federation worse. Two sub‑problems:

**Shared gig core.** If org A's data is under A's key and B's under B's key, a shared row can't be encrypted with either. Options:

- **Draw the encryption boundary around the private data only; the shared core stays cleartext** (or platform‑encrypted, protecting against outside attackers but not the hub operator). The shared fields are *by definition* the ones multiple orgs see — dates, status, title, participants, explicitly‑shared attachments — so this exposes nothing that wasn't already destined to be cross‑org. **Recommended.** Cost: the hub operator sees the participant graph + timing + shared titles (the residual disclosure — minimize with opaque gig ids and per‑participant titles kept spoke‑side).
- **Group encryption.** The shared row is encrypted to a key shared by exactly the participating orgs (key‑agreement when a participant joins). Hub stores ciphertext it can't read. Strong, but: re‑key on every participant change, the hub can't index or validate anything, and it's a real protocol to build and support. Overkill unless shared‑core confidentiality *from the hub operator* is itself a hard requirement.

**Busy/free across encrypted stores.** A non‑participating org can't query person P's home org's encrypted staffing table. Realistic approaches:

- **Each org publishes a redacted cleartext feed.** The home spoke computes "P busy [range], org=O (optional)" from its own locally‑decrypted data and pushes that minimal projection to the hub. This is the **F5 / RFC 7953** model and it sidesteps encryption entirely — the only thing crossing is the busy bit the org chose to publish. **Recommended.** Tradeoff: the hub sees a bare busy calendar (no details). Make it opt‑in per org, with a "publish busy without identity" mode.
- **Secure two‑party computation** ("do our calendars overlap" without revealing them). [Real academic protocols exist](https://encrypto.de/papers/KSS19.pdf); heavy, high‑latency, hard to operate at N‑org scale. Not warranted for a busy/free indicator.
- **Token‑scoped pull.** Home org exposes an authenticated endpoint; a consumer with a "considering booking P" token gets yes/no for a date range, rate‑limited and logged. Data stays home, no standing hub copy — but more moving parts and the home org must be online.

**The firm rule this yields:** *nothing tenant‑encrypted ever needs to be federated; anything that must be federated was never in the private set.* Keep the shared + availability layer a small, cleartext, opt‑in, minimized projection.

---

## 5. Topology options

Ordered least→most isolation. Each now carries an **operator‑read guarantee** line (what stops Cameron reading it, at which trust level) and a **skeptic's verification** line.

### A — Shared DB + RLS (status quo, policies fixed)

- **Isolation:** logical only. One Postgres, `organization_id` + 61 RLS policies.
- **Operator‑read guarantee:** **none / level 1.** Service‑role key and DB password give full read. RLS doesn't apply to Cameron.
- **Skeptic's verification:** nothing to verify — it's a policy promise.
- **Shared core / availability:** trivial, it's the current model; derived availability table with its own RLS.
- **Cost / burden / upgrades / auth / failure:** lowest / zero / one `db push` / unchanged / single blast radius.
- **Verdict:** correct + cheap for trust‑the‑vendor SaaS; fails the requirement outright. Baseline and likely the offering for orgs that don't care.

### B — Schema‑per‑tenant (one Postgres, one schema per org)

- **Isolation:** medium‑logical. `search_path` + `GRANT`s.
- **Operator‑read guarantee:** **level 1.** Superuser (Cameron, Supabase) still sees all schemas.
- **Skeptic's verification:** none.
- **Shared core / availability:** a `shared` schema, read directly (same DB); write gated by a membership function.
- **Cost / upgrades:** still one instance, but 42 migrations × N schemas with partial‑failure handling, and PostgREST per‑schema exposure fights Supabase's model.
- **Verdict:** weak middle — keeps every shared‑instance drawback, harder migrations, swims against Supabase. Most of B's isolation is also in C with real physical separation.

### C — Database‑per‑tenant on infra Cameron runs

- **Isolation:** strong, physical. One managed Postgres cluster, `CREATE DATABASE` per tenant.
- **Operator‑read guarantee:** **level 1** (Cameron runs the cluster and can connect) — *unless* combined with §3.2/§3.3 so the sensitive columns are ciphertext under the org's KMS key, which lifts it to level 2–3.
- **Skeptic's verification:** none by itself; with org‑KMS field encryption, the org's KMS logs.
- **Shared core:** separate `shared` DB, reached via F3 (FDW, all on one private network) or F4.
- **Availability:** `shared.availability` fed by F2/F4 (trigger → outbox → worker upserts redacted projection).
- **Cost:** linear‑ish per tenant (backups, monitoring, tuning, migrations, a provisioning service); you're the DBA. No Supabase platform fee.
- **Upgrades:** fleet migration runner, canary, per‑DB version tracking. Real but well‑trodden.
- **Auth:** central IdP (self‑hosted Supabase Auth, Ory, Auth0, Clerk); `auth.users` leaves the tenant DB.
- **Failure:** cluster outage = everyone (unless multi‑AZ); one tenant's runaway query is well‑isolated; `shared` down = degrade (no new shared gigs / stale availability), private data keeps working.
- **Supabase coupling:** drops the platform; must replace Auth (big), Storage/Realtime (small), run your own PostgREST (the 232 `.from()` calls survive).
- **Verdict:** strongest option that keeps Cameron operating everything centrally. **Only meets the guarantee when paired with §3.2/§3.3.**

### D — Project‑per‑tenant on Supabase (N projects under Cameron's org)

- **Isolation:** strong, physical (each project = dedicated Postgres + isolated Auth/Storage/Functions/Realtime).
- **Operator‑read guarantee:** **level 1.** All projects sit in Cameron's Supabase org; Cameron's account opens any of them; Cameron holds each service‑role key. Provisioning 50 readable DBs instead of one. *Only* rises above level 1 if the project is created **in the org's own Supabase account** (→ becomes F‑style) or the data is encrypted with keys Cameron never holds.
- **Skeptic's verification:** none, unless the project is in the org's account (then their console + logs).
- **Shared core:** no shared network; **inbound `postgres_fdw` to a Supabase project isn't supported** → F4 (a hub project/service holds gig core + participants + shared attachments; every tenant calls its API) or F2 (hub writes, tenants subscribe via hub Realtime/webhooks and cache).
- **Availability:** hub project holds `availability`; tenants push redacted updates on staffing change; F5.
- **Cost:** additional projects **~$10/mo each + usage** ([Supabase pricing](https://schematichq.com/blog/supabase-pricing)); ~$525+/mo at 50 tenants, linear; Neon's scale‑to‑zero is materially cheaper for a long tail.
- **Upgrades:** worst of the hosted options — 42 migrations × N via per‑project `link` + `db push`, no "all projects" command; functions deploy N times; frontend rebuilds per tenant or resolves backend at runtime.
- **Auth:** each project has its own `auth.users` + JWT keys → a 3‑org contractor has 3 accounts unless a central IdP fronts every project (custom JWT secret / JWKS) — which bypasses the reason to use Supabase Auth.
- **Failure:** excellent per‑tenant blast radius + managed backups/PITR per project; hub project is the federation SPOF; Supabase‑wide incidents hit all; a billing lapse pauses tenants.
- **Verdict:** sounds clean, provisioning is a documented API, but linear $ that scales badly, worst fleet‑migration ergonomics, forces a central IdP anyway. Viable for **tens**, not hundreds. See §6.

### E — Fully self‑hosted instances the org owns

- **Isolation:** maximal. Org runs the stack on its own cloud/hardware.
- **Operator‑read guarantee:** **level 3 by ownership.** Cameron has no access and no credentials.
- **Skeptic's verification:** the org runs it — nothing to take on trust. (Plus open source + reproducible build if Cameron wants third‑party verifiability of the *code*.)
- **Shared core / availability:** pure cross‑instance federation (F4 + F5) against a hub all instances trust; mutually authenticated (mTLS / signed tokens, like Exchange federation trust). No shared network, no shared credentials.
- **Cost:** low infra for Cameron (hub + release pipeline + docs); **high support** — every install a snowflake, "an afternoon bug fix becomes a coordinated rollout across dozens of independent deployments," and Cameron can't force upgrades.
- **Org burden:** **high, disqualifying for most.** Self‑hosting Supabase = no managed backups/PITR, DIY upgrades the Supabase team itself calls "very tedious" ([community: multi‑week upgrades](https://queryglow.com/blog/supabase-self-hosted), [is Supabase production‑ready](https://unicoconnect.com/blogs/is-supabase-production-ready)), you own hardening/monitoring/HA. Typical GigWrangler customer is a venue or production company, not a team with a platform engineer.
- **Upgrades:** Cameron publishes versioned releases; orgs apply on their own schedule; **skew is permanent and unbounded** → strict forward/backward‑compatible schema + API contracts forever.
- **Auth:** each instance's own auth → a multi‑org contractor has N logins unless the hub is also an **identity broker** (OIDC), which concentrates auth trust in the hub.
- **Failure:** one org's instance dying is fully contained (shared gigs with it go stale). Hub outage freezes new federation + availability, touches no private data. Big risk: **fleet fragmentation** — unsupportable version spread, unpatched installs.
- **Verdict:** the only model that meets the strong requirement with zero cryptography. Operationally the most expensive to *support*, hardest sell. Right for a **few large security‑motivated orgs**; wrong as the only model.

### F — Bring‑your‑own‑database (Cameron hosts the app; org supplies Postgres)

- **Isolation:** high at rest — the org's Postgres (their Neon/RDS/Cloud SQL/on‑prem) is the system of record; Cameron's app connects with an org‑issued, revocable credential.
- **Operator‑read guarantee:** **level 2** — the org can revoke access, audit queries on its side, hold backups. But Cameron's app tier decrypts/handles plaintext in memory to serve requests, so a hostile operator could log there. **Level 3 only if combined with §3.2 (searchable field encryption, org KMS) so the app never sees sensitive plaintext,** or §3.4.
- **Skeptic's verification:** the org's own DB logs (every statement Cameron's app runs); with org‑KMS field encryption, the org's KMS logs.
- **Shared core:** Cameron's multi‑tenant app writes the shared row to a hub DB and mirrors references into each participant's BYO DB (F4 inside the app boundary + F2 out). The app tier is the coordination point — it *transiently* sees cross‑tenant data, a real caveat.
- **Availability:** app computes the redacted projection from each BYO DB's staffing tables → hub; or each BYO DB runs a Cameron‑provided function emitting the feed.
- **Cost:** run the app + functions + hub + a **connection‑management layer** (per‑tenant pools, secret storage, health checks, migration runner reaching into DBs you don't own). No per‑tenant DB hosting cost. Migration complexity ≈ C, plus "their DB was unreachable during the window."
- **Org burden:** medium — a Postgres they'll expose to Cameron's app (network path, credentials, PostgREST‑or‑direct decision) and consent to schema migrations.
- **Auth:** central (Cameron's app owns it) — good for multi‑org identity, but `auth.users` lives in Cameron's tier.
- **Failure:** org's DB unreachable = that org down (+ messy mid‑migration states); others fine. App‑tier compromise is cross‑tenant (mitigate: per‑tenant creds, least privilege, no master key). Hub down = federation degrades.
- **Supabase coupling:** same re‑platforming as C; the 232 `.from()` calls survive **only if** every BYO DB is fronted by PostgREST.
- **Verdict:** pragmatic — strong "our data, our DB, revocable" without asking the org to run the app. Cost: app tier stays a cross‑tenant trust point; PostgREST‑everywhere is load‑bearing. Pairs naturally with **Neon** (org makes a Neon project, enables its Data API, shares a scoped key). **Automated, this is the most attainable path to a believable guarantee** (§6).

### G — Hub‑and‑spoke: thin shared coordination service + private spokes

Not a fourth isolation point — **the federation backbone that makes B/C/D/E/F work.** Spoke topology is a *per‑org* choice.

- **Spoke (per org):** all private data + the org's own copy of each gig it's on. Runs anywhere on the spectrum, with any §3 mechanism.
- **Hub (one, shared):** the minimum cross‑org data, API‑first (F4) + free/busy feed (F5).
- **Operator‑read guarantee:** the *spoke* carries the guarantee (per its topology + §3 mechanism). The *hub* holds only federation data and gives a guarantee only about that — and only if minimized/encrypted/neutrally governed.
- **Skeptic's verification:** per spoke. For the hub: open source + minimized dataset the org can inspect.

**Minimum hub dataset — the honest list:**

| Hub data | Why unavoidable | Disclosure |
|---|---|---|
| **Org registry** (id, name, public profile, federation endpoint + public key) | Spokes must discover + authenticate each other | Which orgs exist |
| **Gig core** (id, status, start/end/tz, tags, hierarchy) | Row co‑owned by ≥2 orgs; must be neutral or replicated from a home | A dated engagement exists |
| **Gig title** — *optional* | Hub‑side ⇒ hub reads it; spoke‑side ⇒ hub sees only an opaque id | Nature of the engagement (avoidable) |
| **Participants** (gig → {org, role, is_client}) | Inherently multi‑party; drives shared authz | **Who works with whom, and when** — the main residual leak |
| **Shared attachments/notes** (only explicitly‑shared) | Feature requires cross‑org visibility of these items | Contents of explicitly‑shared items only |
| **Availability projection** (subject, busy_range, org?) | The non‑participant busy/free lookup | A person/org is busy on a date (optionally for whom) |
| **Identity + membership** (if centralized here) | Shared authz needs "is U a manager of a participating org?"; multi‑org login needs one identity | Who belongs to which org |
| **Federation handshakes** (invites, accept/decline, revocations) | The join protocol | — |

**Does the hub reintroduce the trust problem?** Partially — say it plainly. The hub learns **which orgs collaborate, on which dates, and who is busy when**. For competitors that's real signal, though far less than today (no financials, staffing names/rates, kits, purchasing, or non‑shared documents). And **Cameron operates the hub**, so "don't want to share with the creator" isn't fully solved by G alone. Three ways to close it, increasing effort:

1. **Minimize** — opaque gig ids (titles spoke‑side), availability as bare busy/free with org identity opt‑in, shared attachments as client‑encrypted blobs the hub can't read. Hub → near‑zero‑knowledge relay. Residual: the participant graph + timing.
2. **Neutralize governance** — hub is open source, run by a neutral entity (industry association, customer consortium, non‑profit), not Cameron. Cameron ships code; someone else holds keys.
3. **Federate the hub too** — no central hub; spokes exchange shared‑core rows peer‑to‑peer with a shared discovery/identity root (like DNS/email or Exchange federation). Max decentralization, max protocol complexity, hardest identity story.

- **Cost:** build + run one small, well‑scoped service (hub API + free/busy endpoint + directory + identity broker) — not another GigWrangler. Plus the chosen spoke model's cost.
- **Upgrades:** two streams — hub (single deploy, **versioned, backward‑compatible API** because spokes upgrade independently) and the spoke fleet (per model).
- **Auth:** cleanest with the hub as OIDC identity broker (one identity per person; spokes trust hub tokens). Concentrates auth trust in the hub — acceptable if minimized/neutralized.
- **Failure:** hub down → no new shared gigs, stale availability, logins may fail if hub brokers auth (mitigate: cached tokens / long TTL) — **every spoke's private data keeps working.** Spoke down → that org dark; its shared gigs stale for others. No single breach exposes private data (hub never holds it).
- **Verdict:** the architecture that takes the requirements seriously — "shared" and "private" are different systems with different owners; size the shared one to the smallest thing that works. **Recommended target**, spoke model chosen per‑org.

---

## 6. Automatic provisioning — how real is it

**The mechanism exists.** Supabase Management API: [`POST /v1/projects`](https://supabase.com/docs/reference/api/v1-create-a-project) (PAT auth, [120 req/min per org](https://supabase.com/docs/guides/auth/rate-limits)). One org holds many projects. So "org signs up → project auto‑created" is a real, documented flow. **Neon's provisioning API is better‑suited** — designed for per‑tenant fleets, scale‑to‑zero, Terraform provider, a [PostgREST‑compatible Data API](https://neon.com/blog/a-postgrest-compatible-data-api-now-on-neon); [Retool reportedly runs 300k+ Neon projects with one engineer](https://neon.com/use-cases/database-per-tenant).

**Cost.** Supabase: ~$10/mo/project beyond the first + usage; paid‑org projects don't pause but still bill; ~$525+/mo floor at 50 tenants, linear. Neon: scale‑to‑zero makes idle tenants near‑free — much better for a long tail of small orgs.

**Applying the 42 migrations to a *new* project.** Create → wait for ready (minutes) → run the migration bundle (`supabase link && supabase db push` in a per‑project CI job, or execute SQL via the Management API query endpoint, or `psql` the files) → deploy the 2 edge functions → **register the project (ref, URL, keys) in a tenant registry** the app routes from.

**Applying a *new* migration to all existing projects.** No "push to all" command. Build a **fleet migration runner**: iterate the registry; per project apply pending migrations transactionally; record the new schema version; stop on failure; **canary** (1 → 5% → rest) with health checks between waves — the documented norm for per‑tenant fleets.

**Failed mid‑rollout.** Migration `0043` fails on project 27 of 50: projects 1–26 on v43, 27 half‑migrated (rolled back if the migration was transactional), 28–50 on v42, and v43‑expecting code is deploying. You need (a) **per‑project version in the registry** so the app serves the right behavior per tenant, (b) every migration wrapped so failure leaves the project cleanly on the prior version, (c) code that tolerates both versions during the window (expand‑only, feature‑flagged reads — a stricter `deploy_prod.sh`), (d) an alert + runbook to fix 27 and resume. Weeks to build well; permanent operational surface.

**When tenant 50 is three versions behind tenant 3.** The shared contract surfaces — hub API, edge‑function endpoints, the frontend if it's one build — must support a *range* of schema versions. Practically: (a) force‑upgrade on a bounded schedule (allow ≤ N versions of skew, then mandatory upgrade windows), (b) each tenant pins its own frontend + function versions to its schema (N deployments — the single‑tenant burden), or (c) version the contract and every consumer handles vN..vN‑3. Most teams pick (a) with a tight bound.

**Provisioning does not by itself solve the read problem.** If the automation creates the project under **Cameron's** Supabase org and stores the service‑role key + DB password in **Cameron's** registry, **Cameron can read every tenant** — now 50 readable DBs instead of one. For provisioning to *also* deliver operator‑exclusion, one must be true:

1. **The project lives in the org's own Supabase/Neon account.** Automation uses OAuth‑delegated, org‑scoped credentials to create it *in the customer's account*; Cameron's app connects with a key the customer issues and can revoke; Cameron never stores the DB password. Verifiable: the org sees the project in *their* console and every access in *their* logs. (This is **F, automated** — BYO‑database with the friction removed.)
2. **The sensitive data is encrypted with a key Cameron's automation never holds** (§3.1–3.3), so holding project credentials doesn't grant read access.
3. **Decryption happens only in an attested enclave** (§3.4).

Automated provisioning + (1) is the most attainable: it converts the guarantee from "trust Cameron's policy" to "you hold the keys to your own cloud project." Cost: onboarding now requires the org to connect a cloud account (or accept a project in their name) — more friction than "enter email, go" — and support gets harder (debugging in infra you don't own).

---

## 7. Postgres substrates

| Substrate | Fit | Notes |
|---|---|---|
| **Supabase (managed)** | A, D, hub | Best DX; Auth/Storage/Realtime bundled; per‑project pricing + fleet‑migration ergonomics cap D past tens of tenants. Management API provisioning is real. |
| **Supabase (self‑hosted)** | E | Afternoon to stand up, expensive to own; no multi‑project, no managed PITR, brutal upgrades. Only for orgs that insist on owning everything. |
| **Neon** | C, D, F, G, hub | Purpose‑built for database‑per‑tenant: API/Terraform provisioning, scale‑to‑zero, **PostgREST‑compatible Data API** (the 232 `.from()` calls could survive). No bundled Auth/Storage/Realtime. Strong spoke and/or hub substrate. |
| **RDS / Cloud SQL / Crunchy Bridge** | C | Boring, reliable, you're the DBA. No Data API — run PostgREST yourself. |
| **Plain Postgres on a VM** | E reference stack | Cheapest per unit, most ops. Viable as the "here's the bundle to self‑host" reference. |

**PostgREST is the portability pivot.** As long as every private DB is fronted by PostgREST (Supabase's, Neon's Data API, or self‑run), the frontend data layer is unchanged. Drop it and the 232 call sites become a query‑builder rewrite. Weight substrate choice on this. §3.2 (CipherStash) also runs as a Postgres proxy — compatible with this pivot.

---

## 8. Cross‑cutting consequences

**Auth is the fork.** A/B keep Supabase Auth. Everything else needs a **central IdP** (self‑hosted Supabase Auth used only for auth, Ory Hydra/Kratos, Auth0, Clerk, WorkOS) issuing JWTs all spokes + the hub trust via shared JWKS. Largest single work item past B: 42 `auth.*` call sites + RLS's `auth.uid()` dependency + OAuth re‑wiring. **Extract a thin `AuthProvider` interface over `AuthContext.tsx` first** — prerequisite for everything, worth doing regardless.

**RLS mostly goes away, then partly returns.** One‑tenant‑per‑DB: the 61 policies + intersection helpers collapse to "authenticated + a member." The **hub's** shared‑core tables need their own smaller policy set ("participant orgs read; participant managers write; availability returns busy/free only"). The prior report's Phase‑1 RLS fixes are only worth doing *in place* if A stays the near‑term reality.

**The migration pipeline must become fleet‑aware** for C/D/E/F: a tenant registry, a runner that iterates it with per‑target status + canary + rollback, and two schema streams (spoke, hub) with a compatibility contract. `deploy_prod.sh` is single‑target today — this is a new component, weeks not days.

**Frontend backend‑resolution.** B/C keep one URL. D/E/F need the frontend to resolve *which* backend per logged‑in org — per‑tenant build (env swap) or a post‑login bootstrap call to the hub returning the spoke endpoint. The latter is cleaner and hub‑native.

**Edge functions.** `server` and `ai-scan` are small and Deno‑portable. In G, `server`'s intersection checks *are* federation logic → move to the hub; `ai-scan` is stateless, lives anywhere (and under §3.1 moves client‑side).

---

## 9. Recommendation

**Frame the decision as: the minimum architecture that gives a target org a guarantee it would believe, without making the product unbuildable or unaffordable to run.** Tiered, because different customers need different levels and the tiers stack.

### Tier 0 — now, for everyone (necessary regardless)
SOC 2 Type II + DPA + least‑privilege prod access with break‑glass + **immutable, externally‑held audit logs of every operator query**. This is level 1/2 and it clears the default bar for a venue/production‑company market comparing GigWrangler to other cloud SaaS. Do this first; it unlocks most of the market and is a prerequisite for selling the higher tiers credibly.

### Tier 1 — the believable guarantee, most attainable (the recommended core investment)
**App‑layer searchable field‑level encryption (§3.2, CipherStash‑style) on the sensitive columns, with the data key in the org's own KMS (§3.3).** Cameron's servers can query (sort, filter, join) but the sensitive plaintext exists only in the authenticated client and transiently at decrypt; the org holds and audits the key; **revocation is real** (disable the key → Cameron's copy is ciphertext). Shared core + availability stay as a small **cleartext, minimized, opt‑in hub projection** (§4.2) — nothing encrypted ever needs to federate.

- **Keeps the product buildable:** lists still sort/filter server‑side, FKs work, realtime works.
- **Costs, stated as tradeoffs:**
  - **Server‑side financial aggregation** (totals, P&L) moves client‑side or to a client‑maintained encrypted rollup. If rich server‑side reporting is core to the product's value, Tier 1 costs a redesign there, not just a library.
  - **The AI receipt scan** runs client‑side with the org's own Anthropic key, or becomes an explicit plaintext‑in‑transit opt‑in.
  - **The guarantee is "operator can't read the DB and can only decrypt transiently in‑request with your audited key"** — much stronger than a promise, not as absolute as an enclave or client‑only E2EE. A security team will note plaintext exists in Cameron's process memory at decrypt time. Say so up front.
- **Verification:** the org's KMS logs every decrypt; the encryption client is open‑source and inspectable.

### Tier 2 — for orgs that won't accept shared infrastructure at all
**Automated provisioning of a per‑tenant Neon (or Supabase) project in the org's own account** (§6 path 1), Cameron's app connecting via org‑issued, revocable credentials. This is **Option F, automated** — BYO‑database without the manual setup. Guarantee: their cloud, their keys, their logs, revoke anytime — an org will believe it. Costs: more onboarding friction (connect a cloud account), roughly linear ops, and the fleet‑migration machinery from §6 is mandatory. Price it as the premium tier.

### Tier 3 — only if operator‑exclusion becomes *the* product
**Confidential‑computing enclaves (§3.4)** for the decrypt/query path, or **client‑only E2EE (§3.1)** with the feature set trimmed to match. Defer until the market clearly demands level 3 *and* Tier 1 is proven insufficient. Disproportionate to the current stage.

### Federation, held constant across all tiers
**Hub‑and‑spoke (Option G).** The hub holds only the minimized cleartext shared core + opt‑in busy/free projection; private data (encrypted per Tier 1, or isolated per Tier 2) never crosses. Design the hub API + free/busy feed now (lean on RFC 7953 / Exchange‑federation prior art) — it's buildable and valuable even while every tenant is still one row in one database.

### Sequencing
1. **Tier 0** (SOC 2 groundwork, operator‑access audit logging) — start now.
2. **Extract `AuthProvider`; stand up a central IdP** — on the path for every tier past status quo.
3. **Design the hub** (API, free/busy feed, minimum dataset, minimization choices) — independent of tier.
4. **Prototype Tier 1** (searchable field encryption on `gig_financials` + `purchases` sensitive columns, org‑KMS key) — the make‑or‑break question is whether the reporting + scan tradeoffs are acceptable.
5. **Build the fleet migration runner** before onboarding the second Tier‑2 tenant.
6. Skip the prior report's in‑place Phase‑1 RLS fixes unless a split is > ~2 quarters out.

### Where the honest answer is a tradeoff, not a solution
- Tier 1 removes operator DB read access but not operator process memory access at decrypt time. Level 2.5, not level 3.
- Tier 1 costs current‑form server‑side financial reporting and the server‑side AI scan.
- Tier 2 gives a stronger guarantee but reintroduces per‑tenant ops cost, migration complexity, and harder support.
- The hub still sees the collaboration graph + busy/free calendar under every tier. Minimization (opaque ids, identity‑optional availability) reduces but doesn't eliminate that; a truly zero‑knowledge hub is a research‑grade build.
- Nothing here is free. "Verifiable operator exclusion" costs either features (Tier 1), onboarding friction + ops (Tier 2), or a disproportionate engineering investment (Tier 3).

---

## 10. The questions that would most change this

1. **Which sensitive features are non‑negotiable — server‑side financial aggregation? the AI receipt scan as‑is?** If both, Tier 1 needs those redesigned, not just an encryption layer wrapped around them. This is the pivotal product question.
2. **Will target orgs connect their own cloud account / KMS?** Yes → Tier 1 and Tier 2 are viable. "Just let me sign up with an email" → you're capped at Tier 0 + platform‑managed encryption (level 2), and the strong guarantee isn't on the table.
3. **Is the bar "better than the other cloud SaaS" or "provably can't see it, like a password manager"?** The former is Tier 0 (+ maybe Tier 1); the latter is Tier 3 / client‑only E2EE. Different products, different roadmaps.
4. **How many orgs, and of what size?** ~20–50 mostly‑small → Tier 0 + Tier 1 is plenty and the hub stays minimal. Hundreds including large security‑driven orgs that will pay for isolation → Tier 2 fleet machinery (and maybe Tier 3) is justified. Changes the budget by an order of magnitude.
5. **Is "Cameron cannot read it" hard, or is "not commingled with competitors, revocable, portable on exit" enough?** The former eventually forces Tier 3; the latter is met by Tier 1 or Tier 2 at far lower cost and support load. Product/positioning decision, not technical.
6. **Long‑term shared surface — ever more than {dates, status, participants, explicitly‑shared attachments/notes, busy/free}?** Stable and small → thin hub, F5 carries it. Roadmap toward richer cross‑org collaboration (shared schedules/docs/messaging/joint settlements) → the hub grows toward a real shared database and the calculus shifts back toward a well‑isolated *shared* store with private extensions.

Secondary: must identity be one login per person across orgs (if not, Tier 2 / Option D get easier)? What staleness is acceptable for the shared gig core — seconds (F2/F5) or immediate (F1/F4)?
