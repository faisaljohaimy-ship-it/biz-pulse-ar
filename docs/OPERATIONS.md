# Production Operations Handbook

## 1. System overview
- Frontend: TanStack Start (React 19 + Vite 7), deployed on Lovable Cloud (Cloudflare Workers).
- Backend: Lovable Cloud (Supabase) — Postgres, Auth, Realtime, Storage.
- AI: Lovable AI Gateway (chat) + ElevenLabs (TTS/STT).
- Server logic: `createServerFn` (`src/lib/*.functions.ts`) and server routes (`src/routes/api/*`).

## 2. Monitoring & observability
- **In-app dashboard:** `/observability` — live audit log + AI token consumption.
- **Tables:** `audit_logs`, `ai_usage` (RLS: own rows + admins see all).
- **Helpers:** `logAudit()`, `logAiUsage()`, `bench()` in `src/lib/observability.ts`.
- **Realtime health:** every `pulse_*` table is published to Supabase Realtime.

## 3. Backup & recovery
- Postgres: managed daily backups via Lovable Cloud (point-in-time restore available on paid tiers).
- Storage bucket `uploads`: lifecycle handled by Supabase Storage.
- **Restore drill:** quarterly — restore a snapshot to a staging project, run smoke tests on `/dashboard`, `/fabric`, `/observability`.
- **Export on demand:** `psql "$SUPABASE_DB_URL" -c "\copy public.<table> to '/tmp/<table>.csv' csv header"`.

## 4. Incident response
| Severity | Trigger | Action |
|---|---|---|
| P1 | App down, auth broken | Roll back via Lovable History; page on-call |
| P2 | Single route broken | Open hotfix; verify on `/observability` |
| P3 | Slow query / high token spend | Inspect `ai_usage` + `audit_logs.perf.slow` |

## 5. Deployment
- Preview: every commit on the dev branch.
- Production: `Publish` button in Lovable (stable URL `project--<id>.lovable.app`).
- CI: `.github/workflows/ci.yml` runs typecheck + build on PRs.

## 6. Secrets
Stored in Lovable Cloud secrets vault. Never commit `.env`. Rotate quarterly:
`ELEVENLABS_API_KEY`, `LOVABLE_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Performance benchmarks
| Surface | Target p95 |
|---|---|
| `/dashboard` first paint | < 1.5 s |
| Fabric snapshot query | < 400 ms |
| AI chat first token | < 1.2 s |
| TTS round-trip (≤200 chars) | < 1.8 s |

Wrap critical paths in `bench("label", fn)` — slow ops auto-log to `audit_logs`.
