# Nexus AI OS — Enterprise Hardening Plan

The platform already has: auth + demo login, AppShell with responsive sidebar, Executive Overlay (command palette, ARIA, presentation mode, briefing), interactive 3D dashboard nodes, 30+ routes. To reach a credible "Palantir / Microsoft Fabric / SAP Analytics Cloud" tier, the gaps are **depth, consistency, and live data plumbing** — not more pages.

I'll execute the following waves sequentially without stopping for confirmation. Each wave ends with a typecheck + spot QA.

## Wave 1 — Foundation & Consistency (highest ROI)
Goal: every screen answers *what / why / what next* with the same visual grammar.

1. **`PageScaffold` upgrade** — extend `nexus-frame.tsx` with a standard executive header (`status pill`, `last refreshed`, `owner`, `next action` CTA) and a `WhyWhatNext` strip used on every page.
2. **Audit existing 31 routes** — identify those still using ad-hoc layouts (vs `NexusPage`) and normalize headers/spacing/typography.
3. **Design tokens pass in `styles.css`** — formalize executive palette (depth surfaces, glass tiers, status colors, KPI tones) as semantic tokens; replace stray Tailwind colors with tokens.
4. **4K + ultrawide polish** — verify content cap, density modes, and large-display typography scale.

## Wave 2 — Live Data Plumbing
Goal: kill the "demo widget" feeling.

1. **`useEnterprisePulse` hook** — single source of truth for KPIs/alerts/intel; seeded from Supabase tables (`tasks`, `messages`, `knowledge_docs`) + deterministic synthetic series so numbers move but stay coherent across pages.
2. **Cross-page coherence** — Cockpit, Dashboard, Boardroom, Intelligence and Briefing read from the same pulse → no contradictory numbers.
3. **Realtime tick** — subscribe to Supabase realtime on `tasks`/`messages` so "Live" pills aren't a lie.

## Wave 3 — ARIA Executive Copilot (real)
Goal: ARIA stops being a chat box, becomes a copilot.

1. Wire the existing assistant route into the Executive Overlay's ARIA console using Lovable AI Gateway (`google/gemini-3-flash-preview`).
2. Tool calls: `explainKpi`, `draftBriefing`, `listRisks`, `recommendActions` — all backed by the pulse hook on the server.
3. Streamed responses with markdown rendering + suggested follow-ups.

## Wave 4 — Digital Twin Drill-down
Goal: the dashboard "3D" nodes become real navigation.

1. Standardize `EntityDetailDrawer` (reusing `NodeDrillPanel`) and reuse it on Departments, Integrations, Agents, Workflows, Digital Twin pages.
2. Cross-links: every entity links to its KPIs (Analytics), workflows (Orchestration), risks (Risk), agents (Agents).

## Wave 5 — Boardroom & Presentation Polish
1. Hook Presentation Mode slides to the live pulse so a demo always shows current numbers.
2. Add export-to-PDF of the briefing (server fn → simple HTML print stylesheet).
3. Boardroom route gets a full-screen "Present" CTA.

## Wave 6 — Performance & QA sweep
1. `bunx tsc --noEmit` must stay green.
2. Visit each of the 16 critical routes in mobile (440px), tablet (820px), desktop (1440px), 4K (2200px) and screenshot-verify no overflow/clipping.
3. Lighthouse-style sanity: lazy-load heavy 3D node math, memoize KPI computations, ensure 60fps on dashboard orbit.

## Out of scope (per your rules)
- No new modules or routes.
- No mockups, no demo-only widgets — anything I touch becomes wired to the pulse or to Supabase.

## Technical sketch
```text
src/lib/enterprise-pulse.ts      ← shared store + hook (client) + functions.ts for server reads
src/components/nexus-frame.tsx   ← + ExecutiveHeader, WhyWhatNext, EntityDetailDrawer
src/components/executive-overlay ← ARIA wired to /api/chat with tools
src/styles.css                   ← formalized exec tokens, density modes
src/routes/_authenticated/*.tsx  ← normalized to PageScaffold; live numbers from pulse
src/routes/api/chat.ts           ← +server tools (explainKpi, draftBriefing, …)
```

Starting with Wave 1 immediately after you approve.
