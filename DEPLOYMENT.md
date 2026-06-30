# NEXIOS AI OS — Deployment

## Target
- **Edge**: Cloudflare Workers (workerd) via TanStack Start adapter
- **Data**: Supabase Postgres 15 (Lovable Cloud managed)
- **Static**: Vite-built assets served by Workers

## Environments
| Env | URL | Notes |
|---|---|---|
| Preview | `https://id-preview--<project-id>.lovable.app` | Latest build, auth required |
| Stable Preview | `https://project--<project-id>-dev.lovable.app` | Immutable URL for external integrations |
| Production | `https://biz-pulse-ar.lovable.app` | Published deployment |
| Stable Production | `https://project--<project-id>.lovable.app` | Immutable URL for webhooks |
| Custom Domain | `https://neexios.com`, `https://www.neexios.com` | DNS-attached |

## Required Server Env
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Postgres + Auth |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable client (RLS as anon/user) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin server client (`supabaseAdmin`) |
| `LOVABLE_API_KEY` | AI Gateway |
| `ELEVENLABS_API_KEY` | TTS/STT (optional — voice features) |
| `MICROSOFT_*` | Outlook/SharePoint adapters (optional) |
| `HEYGEN_API_KEY` | LiveAvatar (optional — falls back to R3F) |

## Required Client Env
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Browser Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |

## Deploy
- **Backend changes** (server fns, RLS, migrations): auto-deploy on push.
- **Frontend changes**: require explicit "Publish" via the editor.

## Cron / Scheduled Jobs (pg_cron)
- Executive Reports daily run → `POST /api/public/hooks/executive-reports-run`
- Microsoft Sync → `POST /api/public/hooks/microsoft-sync`
- ARIA Docs Ingest → `POST /api/public/hooks/aria-docs-ingest`
- Runtime Bootstrap → `POST /api/public/hooks/runtime-bootstrap` (cold-start)

All hooks are credentialed and Zod-validated.

## Health
- `GET /api/public/health` → 200 always; body reports per-subsystem status.
- `GET /api/public/version` → product/version/channel JSON.

## Rollback
Re-publish a prior preview build via the Lovable editor. Database migrations are forward-only; design every migration to be backward-compatible for at least one release.
