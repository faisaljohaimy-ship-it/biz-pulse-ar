# SADEED — System architecture (as built, 2026-10-17)

What the system **is** today, read from the repository at the release candidate on `claude/security-system-structure-3unljf`. Target state after Lovable independence is in `SADEED_TARGET_ARCHITECTURE.md`; dependency ownership is in `SADEED_INDEPENDENCE_ASSESSMENT.md`. Statements marked _(not verified live)_ could not be measured from the engineering sandbox (production domain and Supabase hosts are blocked by its network policy; the backend is paused).

## 1. Stack

| Layer      | Technology                                                                                                                                                                                                         | Where                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| UI         | React 19, TanStack Router/Start 1.168, Tailwind 4, Arabic-first RTL, IBM Plex Sans Arabic                                                                                                                          | `src/routes/**`, `src/components/**`                                                                          |
| Server     | TanStack Start server routes (`src/routes/api/**`) and server functions (`createServerFn`, `src/lib/**/*.functions.ts`), built by Nitro into a Cloudflare-Workers-style bundle (`.output/server`, `nodejs_compat`) | `vite.config.ts` (wrapped by `@lovable.dev/vite-tanstack-config`)                                             |
| Data       | Supabase (Postgres + PostgREST + Auth + Storage + pg_cron + Vault), project `jhutlofapjfjjeajawie`, managed by Lovable Cloud                                                                                       | `src/integrations/supabase/*`, `supabase/migrations/**` (205 files; **not** the source of truth for live RLS) |
| AI         | Google Gemini via `ai` SDK (`@ai-sdk/google`), ElevenLabs TTS, Gemini STT and embeddings; optional Lovable AI gateway as backup provider; optional local OpenAI-compatible adapter (disabled, separate branch)     | `src/lib/sadeed/**`, `src/routes/api/**`                                                                      |
| Governance | kill switch, daily caps, minute limiter, breaker, dedup, concurrency slot, closed-policy gate                                                                                                                      | `src/lib/governance/*.server.ts`                                                                              |
| Hosting    | Lovable Publish (manual) → `https://neexios.com`; GitHub Actions Cloudflare deploy exists but has never run                                                                                                        | `.github/workflows/deploy.yml`, `production-check.yml`                                                        |
| CI         | GitHub Actions `ci.yml` (static · test · build · rag-preflight · advisory E2E), `production-check.yml`, `production-smoke.yml`, `backend-health.yml`                                                               | `.github/workflows/`                                                                                          |

Hosting note (2026-10-17): a Vercel project `biz-pulse-ar` is also connected to the repository and builds SSO-protected **previews** for every pushed branch (`vercel.json` disables `main`; no backend environment configured — `/api/public/health` on a preview reports `db: not_configured`). It is not a production path today; see `SADEED_INDEPENDENCE_ASSESSMENT.md` §1 addendum.

## 2. Request flow for the assistant (`POST /api/chat`)

1. Kill switch `SADEED_AI_DISABLED` (synchronous, before any network) → 503 `ai_disabled`.
2. Provider key present? else a local guaranteed Arabic reply (never a 5xx at the user).
3. Request validation (`-chat-guard.ts`): JSON, sizes, attachment types, bearer shape, UUID thread id.
4. Session: `auth.getUser` with a 1.5 s deadline → `verified` / `anonymous` / `unverified` (timeout = served as guest, no tools, no org, no persistence; never a granted session).
5. Minute limiter (`check_rate_limit` RPC, 2 s deadline, breaker 5 failures/60 s → open 30 s) → 429 `rate_limited`; store unavailable → policy `SADEED_GATE_DEGRADED_MODE` (`closed` default: local reply tagged `X-SADEED-Gate: closed`; `bounded`: in-memory half caps).
6. Daily caps (`enforceAiQuota`: global bucket then identity bucket, 86,400 s windows keyed by day) → 429 `daily_global_cap` / `daily_identity_cap`; unavailable → closed policy.
7. Article-22 narrowing: out-of-scope → fixed line; fast recall; instant data answers — all before the model.
8. Dedup fingerprint (identity + thread + text, 20 s) → 429 `duplicate_request`; model slot (`SADEED_CHAT_MAX_INFLIGHT`) → 503 `busy`.
9. Context (RAG with 2.5 s deadline, preferences) → Gemini → output gateway (`finalizeSadeedOutput`) → streamed reply with `X-SADEED-Gate`, `X-SADEED-Auth`, `X-SADEED-Reply-Source`, `X-SADEED-Request-ID`.
10. Backup provider cooldown honours `Retry-After` (clamped 30 s–10 min).

Every other model-calling path (12 in total — four HTTP routes, three guest-callable server functions, agent runtime, incident analysis, executive brain, MCP tool, embeddings) runs the same kill switch first and the same daily caps before the provider; library sites throw `AiGateError` into their deterministic fallbacks. Two contract tests derive the list of spenders from the code so a new one cannot bypass the gate.

## 3. Data access model

- Showcase reads: `optionalSupabaseAuth` + `resilient()` (4 s race, simulation fallback) — guests never see "Unauthorized".
- Writes: `requireSupabaseAuth`; consequential tools (permit decisions, incident close, work-order close…) run under RLS with an explicit server-side role check only for permit decisions _(design gap SEC-1C-01, open)_.
- Service role: server only (`client.server.ts`, lazily created); used by the rate-limit store, audit log, public beacon sink, hooks.
- Storage buckets: `uploads`, `aria-documents` (signed URLs for downloads).
- Scheduled jobs (pg_cron, in migrations): `aria-actions-log-retention`, `aria-corpus-stale-scan`, `rag-*`, Microsoft sync, pattern miner — the two HTTP hooks target the Lovable preview host and a renamed route _(live `cron.job` not verified)_.

## 4. Release attestation

`prebuild` writes `public/build-info.json` (SHA, ref, source, dirty, builtAt); Vite inlines it into `/api/public/health` (`build`), and the static file is served at `/build-info.json`. `production-check.yml` and `production-smoke.yml` accept `expected_sha` and fail when the served commit differs. `/api/public/live` answers liveness only (worker up + build); `/api/public/health` is the dependency view (db, rate-limit store + breaker + policy, gemini key).

## 5. Known structural risks (open)

Single Lovable-Cloud-managed backend (paused since 2026-10-16 20:4x UTC); no verified backup; branch protection unavailable on the GitHub plan; 27 RLS isolation tests have no CI environment; public pages claim RPO/RTO backups without evidence (Article 27).
