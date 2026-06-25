# NEXIOS AI OS — Enterprise Activation Plan

The request spans 40+ AI agents, 40+ integrations, RAG/vector DB, voice I/O, document intelligence, SSO/MFA, digital twin, and an ultra-premium UX redesign. That is 8–12 weeks of disciplined engineering, not one turn. To honor the Engineering Charter (no placeholders, production-grade only), I'll deliver this in 6 focused waves. Each wave ships **fully functional**, not mocked.

## Current Foundation (already live)
- ARIA Executive Engine (`openai/gpt-5` via Lovable AI Gateway) + 17 agent tools
- Execution Engine: `tool_registry`, `workflows`, `workflow_runs`, `agent_runs`, `tool_executions`
- 17 `sec_*` operational tables with RLS hardened, KPI engine, Digital Twin tree
- Operations Cockpit dashboard with live Supabase KPIs (30s refresh), Alerts Panel
- Microsoft connectors linked (Outlook, Teams, SharePoint)
- Luxury Executive design system (Deep Midnight Cyan + glassmorphism)

## Wave 1 — ARIA Cognitive Core (this wave)
Make ARIA a true Executive Brain, not a chat.
- **Long-term memory**: activate `aria_memory` + `aria_match_memory` with embeddings (`google/gemini-embedding-2`), auto-write decisions/conversations
- **RAG / Knowledge Graph**: enable `aria_knowledge` ingestion pipeline + `aria_match_knowledge` semantic retrieval
- **Document intelligence**: PDF/Word/Excel/image upload → parse → embed → searchable (server fn `ingestDocument`)
- **Voice I/O**: ElevenLabs TTS (key present) + Whisper STT via Gateway
- **Reasoning loop**: multi-step agent runtime with tool approval gates, persisted to `agent_runs`/`workflow_step_runs`
- **ARIA Console** route `/aria` with: thread history, doc upload, voice button, reasoning trace, recommendation cards

## Wave 2 — Agent Network (40 agents)
- Seed `agent_definitions` with all 40 specialized agents (system prompt, allowed tools, RBAC scope)
- **Orchestrator agent** routes user intent → specialist(s) → consolidates
- Agent-to-agent messaging via `enterprise_events` bus
- `/agents` page: live agent status, current task, last decision, handoff graph

## Wave 3 — Command Center & Digital Twin
- `/command-center`: full-screen ops wall (incidents map, CCTV grid, patrol live tracks, KPI rail, ARIA briefing)
- Digital Twin 3D site tree with real-time asset/sensor state
- Predictive AI: incident forecasting (time-series on `sec_incidents`), risk heat-map
- Smart Alerts engine: rules in `governance_policies`, evaluated on Supabase Realtime

## Wave 4 — Workflow & Automation
- Visual workflow builder (`workflows` DAG editor)
- Approval engine with multi-level routing (`briefing_actions`)
- Scheduled tasks (pg_cron → server route `/api/public/cron/run-workflows`)
- Full audit trail UI from `audit_logs` + `tool_executions`

## Wave 5 — Enterprise Integrations (production wiring)
- **M365 live**: Outlook send/read, Teams post, SharePoint document sync via connector gateway
- **Power BI** embed, **Azure AD SSO** (SAML)
- Webhook inbox `/api/public/webhooks/{source}` for SAP/SCADA/CCTV/IoT/Biometric
- Integration registry UI showing health, last sync, throughput

## Wave 6 — Security, Compliance, Polish
- MFA (TOTP), RBAC matrix UI, ABAC policies on `governance_policies`
- Security dashboard, threat detection rules
- PDPL/ISO27001/SOC2 evidence pack auto-generation
- Final UX pass: Apple-grade motion, Arabic typography (IBM Plex Sans Arabic), perfect RTL audit

## Technical Notes
- Models: GPT-5 (reasoning), Gemini 3 Flash (fast classification), Gemini Embedding 2 (vectors), Gemini 3 Pro Image (visuals), ElevenLabs (voice)
- All AI calls server-side via `src/lib/*.functions.ts` with `requireSupabaseAuth`
- New tables this wave: `aria_threads`, `aria_thread_messages`, `aria_documents` (with pgvector embeddings), `aria_voice_sessions`
- Storage bucket `aria-documents` (private, RLS-scoped)

## What I Need From You
1. **Confirm Wave 1 scope** — should I start immediately with the ARIA Cognitive Core (memory + RAG + docs + voice + reasoning console)?
2. **Pilot department user**: do you want pilot accounts seeded for "إدارة الأمن الصناعي - المنطقة الغربية" with roles (Director, Ops Manager, Patrol Lead, Analyst)?
3. **Voice**: ElevenLabs voice ID preference (default: bilingual AR/EN Adam) or pick later?
4. **SSO**: defer Azure AD SAML to Wave 5, or need it earlier for board demo?

Approve and I start Wave 1 immediately — full implementation, no mocks.
