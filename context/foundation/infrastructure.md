---
project: baza
researched_at: 2026-09-04
recommended_platform: Railway
runner_up: Render
context_type: mvp
tech_stack:
  language: TypeScript
  framework: NestJS 11 + Angular 22 (Nx monorepo)
  runtime: Node.js
---

## Recommendation

**Deploy on Railway (API) + Cloudflare Pages (Angular) + Supabase (Auth/Postgres) + Cloudflare R2 (files).**

This matches platforms you already know and the lock in `@context/foundation/tech-stack.md`. Nest needs a real Node host — Railway is first-class for that; Cloudflare Pages hosts the SPA cheaply; Supabase/R2 stay external (interview: external providers OK). Cost soft-weight preferred Render Free, but anti-bias cold-starts + familiarity pushed the swap to Railway (Hobby ≈ $5/mo floor for always-on Nest).

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Notes |
|---|---|---|---|---|---|---|
| Cloudflare | Pass | Partial | Pass | Pass | Pass | Pages/R2 excellent; Nest needs Containers (Paid) or adapters — not sole API host |
| Vercel | Pass | Partial | Pass | Pass | Partial (MCP beta) | Nest Fluid + Angular SPA; Hobby ~$0; weak familiarity |
| Netlify | Pass | Fail | Partial | Pass | Pass | **Dropped** — Nest only via ephemeral Functions |
| Fly.io | Pass | Pass | Pass | Pass | Partial (experimental MCP) | Nest OK; no free tier for new orgs (~$2–6+/mo) |
| Railway | Pass | Pass | Pass | Pass | Pass | Nest guide; Hobby $5; familiar; monorepo docs |
| Render | Pass | Pass | Partial | Pass | Pass | Cost leader (Free spin-down or ~$7); less familiar |

Interview weights: minimize cost → Render/Vercel ahead on paper; familiarity → Railway/Cloudflare; single region + external OK → no edge/co-location bonus.

### Shortlisted Platforms

#### 1. Railway (Recommended)

Won after swap from Render: known ops surface, official Nest guide, MCP at `mcp.railway.com`, Nx treated as shared monorepo (root `/`, custom build/start, watch `apps/` + `libs/`). Pair with Cloudflare Pages for Angular CDN instead of a second Railway static container.

#### 2. Render

Original cost leader (Free Web Service + free Static Site). Lost on anti-bias: 15‑min idle spin-down / ~1 min cold start clashes with after-hours MVP demos; outbound to Supabase/R2 on Free is a suspend risk; paid Starter (~$7) erases the gap vs Railway Hobby.

#### 3. Vercel

Nest as one Fluid Function + Angular static on Hobby (~$0) is compelling on cost. Gaps: unfamiliar, Nest DI cold starts / 250MB bundle, Nx 20+ remote cache caveats, WebSockets/MCP still beta (WS not needed for MVP).

## Anti-Bias Cross-Check: Railway

### Devil's Advocate — Weaknesses

1. **Hobby $5 floor** — Free plan’s $1/mo credit cannot sustain always-on Nest; “minimize cost” still means ~$5+/mo once you leave trial.
2. **Nx shared monorepo footgun** — Setting `rootDirectory` to `apps/baza-api` breaks `@baza/*` libs; must build from repo root with watch paths covering `libs/`.
3. **No native SPA CDN** — Angular on Railway needs Caddy/`serve` (extra compute) or the chosen split to Cloudflare Pages (CORS, public API URL, separate secrets).
4. **Usage surprises** — Billing is CPU/RAM/egress, not requests; Nest memory + egress to Supabase/R2 can push past the $5 included credit.
5. **Rollback UX** — Meaningful rollback is dashboard/redeploy of a prior deploy; CLI is weaker than `vercel rollback` for agents.

### Pre-Mortem — How This Could Fail

The team put Nest on Railway Free after the $5 trial. Always-on API burned the $1 credit; production went dark during a company-signup demo. They upgraded to Hobby but left Angular on a second Railway service “to keep one vendor,” doubling idle RAM. Later they moved the FE to Cloudflare Pages without updating CORS and the browser API base URL — drivers saw an empty map and failed applies. Someone committed a Supabase service-role key into Pages env as if it were `anon`. CV uploads hit Railway’s filesystem instead of R2 and vanished on redeploy. Six months in, the bill was still modest, but trust was gone: every outage was “Railway,” while the real failure was Free-tier assumptions plus a half-migrated FE/API split.

### Unknown Unknowns

- Railway **restored a Free plan (Aug 2025)** with only $1/mo credit — easy to assume “free forever always-on.”
- **VM pricing** is marked beta on Railway plans docs (checked 2026-09-04).
- Nest currently listens via `app.listen(port)` without host — Railway expects **`0.0.0.0`** or deploys look “up” but refuse traffic.
- Private `.railway.internal` networking does **not** help Supabase — DB stays on the public internet path.
- Pages vs Workers: dashboard/CLI confusion (`wrangler deploy` vs `wrangler pages deploy`) wastes hours (common CF gotcha).

## Operational Story

- **Preview deploys**: Railway PR/environment deploys for the API service; Cloudflare Pages preview deployments per branch/PR for Angular. Protect previews if the app shows personal data (Access or auth gate) before public driver traffic.
- **Secrets**: Railway Variables for Nest (`SUPABASE_*`, R2 keys, `CORS_ORIGIN`); Cloudflare Pages env for public FE keys only (`anon` / public API URL); never put Supabase **service role** in Pages. Rotate in each vendor’s vault; agents may set non-prod vars, humans rotate production primaries.
- **Rollback**: Railway — redeploy previous deployment from dashboard (or redeploy known good image/commit); Cloudflare Pages — instant rollback to prior deployment in dashboard / wrangler rollback where applicable. DB migrations on Supabase do **not** roll back with a code revert.
- **Approval**: Human-only — production publish first time, custom domain DNS, billing plan upgrade, drop Supabase project, rotate service-role key. Agent may — draft env lists, trigger non-prod deploys, `railway logs` / `wrangler pages deployment tail` read-only.
- **Logs**: `railway logs` (and Railway MCP) for API; `wrangler pages deployment tail` / dashboard for Pages; Supabase dashboard/logs for Auth/DB.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Free $1 credit cannot run always-on Nest | Devil's advocate / Unknown unknowns | H | H | Start on **Hobby ($5)** for API; treat Free as trial only |
| Nx `rootDirectory` breaks shared libs | Devil's advocate / Research finding | M | H | Root `/`; build `npx nx build baza-api`; watch `apps/baza-api/**` + `libs/**` |
| FE/API split CORS + wrong API URL | Pre-mortem | H | H | Document `CORS_ORIGIN` + public API URL in deploy plan; smoke-test signup from Pages URL |
| Nest not binding `0.0.0.0` | Unknown unknowns | H | H | Change `app.listen(port, '0.0.0.0')` before first Railway deploy |
| Service-role key in Pages env | Pre-mortem | M | H | Pages: anon + public URL only; service role only on Railway |
| CV/files on ephemeral disk | Pre-mortem | M | H | All uploads → R2 from day one |
| Usage overage (RAM/egress) | Devil's advocate | M | M | Cap RAM; monitor Railway usage; keep payloads on R2 |
| Render Free cold-start (if revisited) | Research finding | H | M | Do not use Render Free for employer-facing API without always-on |

## Getting Started

1. **Railway (API):** `npm i -g @railway/cli` → `railway login` → create project/service linked to this repo. Service root **`/`** (shared Nx monorepo). Build: `npx nx build baza-api`. Start: `node dist/apps/baza-api/main.js` (confirm path after one local production build). Set `PORT` from Railway; update Nest to `listen(port, '0.0.0.0')`.
2. **Supabase:** Create project; add Auth + Postgres URL/keys as Railway variables (service role server-side only).
3. **Cloudflare Pages (Angular):** Connect repo or `npx wrangler pages deploy dist/apps/baza-frontend/browser --project-name=baza` after `npx nx build baza-frontend`. Set `NODE_VERSION` (≥20) and public API base URL to the Railway domain.
4. **R2:** Create bucket; put access keys only on Railway; wire upload path in the company photo / CV slice.
5. **Smoke:** `GET https://<railway>/api` from the Pages origin; company signup happy path once Auth is wired.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
