# NEXIOS AI OS — Architecture

## 1. Runtime Topology

```
            ┌──────────────────────────────────────────────────┐
            │  Browser (React 19 + TanStack Router/Query)      │
            │  • Public routes (SSR)                           │
            │  • _authenticated/* gate (ssr:false)             │
            │  • Lazy 3D / Avatar / Heavy AI                   │
            └────────────┬─────────────────────────────────────┘
                         │  HTTPS · bearer (Supabase JWT)
                         ▼
            ┌──────────────────────────────────────────────────┐
            │  Cloudflare Workers (TanStack Start SSR)         │
            │  • createServerFn (typed RPC)                    │
            │  • /api/public/* (webhooks, cron, health)        │
            │  • requireSupabaseAuth middleware                │
            │  • supabaseAdmin (handler-local imports only)    │
            └────────────┬───────────────────────────┬─────────┘
                         │                           │
                         ▼                           ▼
            ┌────────────────────────┐   ┌─────────────────────┐
            │ Supabase Postgres 15   │   │ Lovable AI Gateway  │
            │ + pgvector + pg_cron   │   │ (OpenAI-compatible) │
            │ • RLS RESTRICTIVE      │   │ • gpt-5 default     │
            │ • 81 tables            │   │ • gemini fallback   │
            │ • HNSW index on KB     │   │ • streaming + tools │
            └────────────────────────┘   └─────────────────────┘
```

## 2. Module Boundaries

| Layer | Path | Boundary |
|---|---|---|
| Routes (file-based) | `src/routes/**` | Page + head + loader only; no business logic |
| Server functions | `src/lib/*.functions.ts` | Typed RPC; Zod-validated; thin wrappers around `*.server.ts` |
| Server helpers | `src/lib/*.server.ts` | DB writes, admin access; never imported by client |
| Authz | `src/lib/authz.server.ts` + `authz.functions.ts` | Server-side `has_role`/`current_org_id`; client uses server fn |
| Agent runtime | `src/lib/exec/agent-runtime.server.ts` | Charter v10.0 enforcement, correlation_id, telemetry |
| Tool registry | `src/lib/exec/tool-registry.server.ts` | `z.enum` table allowlist, column whitelist |
| UI primitives | `src/components/ui/**` | shadcn/Radix — never modify accessibility |
| Domain UI | `src/components/{bridge,theater,sec,exec,…}` | Composed only from tokens + UI primitives |
| Tokens | `src/styles.css` | Midnight Cyan palette; no hardcoded colors in components |

## 3. Request Flow (Agent Invocation)
```
Client (Run Agent button)
  → POST /api/public/hooks/run-agent   (HMAC + Zod)
  → agent-runtime.server.ts
     ├ writes workflow_runs (status=running)
     ├ resolves agent from agent_definitions
     ├ loops:  tool_registry → tool_executions
     ├ writes audit_logs (actor=auth.uid())
     ├ emits enterprise_events
     └ persists aria_reports
  ← JSON { correlation_id, run_id, summary }
```
Every row above carries the same `correlation_id`. UI components join on it for forensic replay.

## 4. Data Architecture
- 81 tables; every public-schema table has explicit GRANTs and RLS enabled.
- Tenant isolation via `org_members` checked in policies; orchestration tables write-protected to `service_role`.
- `sec_*` are the operational digital-twin tables (incidents, patrols, work_orders, permits, visitors, vehicles, contractors, assets, sites).
- Knowledge stack: `sec_knowledge_categories`, `sec_knowledge_articles` (HNSW 1536-dim embeddings), `sec_knowledge_links`.

## 5. Frontend Architecture
- TanStack Start v1 + Vite 7 + React 19.
- TanStack Query default read shape (`ensureQueryData` in loader → `useSuspenseQuery` in component).
- Tailwind v4 via `src/styles.css` `@theme` tokens. Semantic tokens only.
- Heavy modules behind `lazy()` + dynamic imports: `AriaScene`, `HeygenAvatarProvider`, `WarRoomScene`, `AutonomousEnterpriseScene`, PDF, Excel exporters.

### Known debt scheduled for v1.1
`src/routes/index.tsx` (2,088 lines) — cinematic landing page composed of ~12 self-contained scene functions. Scheduled split: `src/components/landing/{Hero,ChaosScene,AwakensScene,TwinCity,CommandCenter,Predictive,Roi,GlobalScene,Films,FinalReveal,HeroHoloPanels,TwinHud}.tsx`. Deferred from GA to avoid regression on a stable, lazy-chunked surface.

## 6. Bilingual & RTL
`src/lib/i18n.tsx` provides `useI18n()` with `locale`, `dir`, `t()`. Root layout sets `dir="rtl"` when `locale === "ar"` via hydration script; all components use logical CSS (`ms-`, `me-`) where applicable.
