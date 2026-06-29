# Executive Command Bridge — Production Build Plan

Target: senior, non-technical executives. Apple/Palantir/Anduril visual register. All data wired to the real `sec_*` runtime, `agent_definitions`, `enterprise_events`, `aria_reports`, `agent_runs`, `workflow_runs`. No placeholders.

## 1. New route — `/_authenticated/bridge` (Executive Command Bridge)

Becomes the default post-login landing (replaces `/mission-control` as the executive surface; mission-control stays accessible for operators).

Layout: full-bleed, single screen, no scroll on desktop.

```text
┌──────────────────────────────────────────────────────────┐
│  NEXUS · Western Region · Industrial Security           │  ← Executive header
│  Operational Health: 94%  |  Live · 14:32:08            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│         ╭───────── Circular Agent Table ─────────╮      │
│        Agent7         Agent1         Agent2             │
│      Agent6        ┌──────────┐        Agent3           │
│                    │   ARIA   │                          │
│      Agent5        │  3D Bust │        Agent4           │
│        Agent9         Agent8        Agent10             │
│         ╰──────────────────────────────────────╯        │
│                                                          │
│   [ ▶ Begin Executive Briefing — 60s ]                  │
├──────────────────────────────────────────────────────────┤
│  Live Narrator: "Patrol Bravo cleared Gate 4..."        │
└──────────────────────────────────────────────────────────┘
```

### Components (new)
- `src/components/bridge/CommandBridge.tsx` — orchestrator, layout, briefing state machine.
- `src/components/bridge/AgentRing.tsx` — circular arrangement around ARIA. Positions computed via trig (cos/sin) from agent count. Re-uses existing `DigitalHumanAvatar` (SVG) for ring portraits and `AriaDock` 3D for center.
- `src/components/bridge/AgentNode.tsx` — per-agent: avatar, name, role, **confidence %**, **current task**, status pill (`idle`/`thinking`/`speaking`/`done`), animated halo ring.
- `src/components/bridge/ExecutiveHeader.tsx` — Operational Health score, live clock, environment chip.
- `src/components/bridge/BriefingStage.tsx` — full-screen takeover during briefing.
- `src/components/bridge/StorytellingFeed.tsx` — translated event stream (extends existing `ExecutiveNarrator`).

### Data wiring (no mocks)
- `agent_definitions` → ring members (sorted by `priority`, capped at 10).
- `agent_runs` (latest per agent) → status + confidence (derived from `outputs.confidence` or computed from success ratio over last 5 runs).
- `enterprise_events` (last 60s, subscribed via existing realtime) → narrator stream + node "current task".
- `sec_incidents` + `sec_patrols` + `sec_kpi_*` → Operational Health score (existing `pulse.functions.ts`).

## 2. Executive Briefing Mode (≤60s)

New server fn: `src/lib/briefing/executive-briefing.functions.ts` (callable from a single button).

Pipeline:
1. **T+0s** ARIA welcome — bilingual TTS via existing `tts.functions.ts`, voice profile `aria`.
2. **T+5s** Operational health summary — pulled from `pulse_kpis` + `sec_incidents` aggregates.
3. **T+10–45s** For each top-N agent (5–7 selected by priority): brief intro + their latest finding from `aria_reports` / `agent_runs.outputs` translated to executive language by `translateToExecutive()` (see §3).
4. **T+45–55s** ARIA merge — calls `openai/gpt-5` once with all findings; returns one recommendation + confidence.
5. **T+55–60s** Final recommendation card with [Approve] / [Defer] / [Drill in] buttons writing to `briefing_actions`.

Persistence: each briefing run = row in `executive_briefings` (existing table); items → `briefing_actions`, `briefing_risks`, `briefing_opportunities`.

UI: `BriefingStage.tsx` runs a timeline player; spotlight rotates around the ring to the currently-speaking agent; `AriaDock` swaps voice profile per persona via existing `speakAs` API.

## 3. Executive Storytelling layer

`src/lib/narrator/executive-translator.ts` — pure mapper, deterministic + LLM-assisted fallback.

For every `enterprise_events` row, produces:
```ts
{ what: string; why: string; impact: 'low'|'med'|'high'; action?: string }
```

Rules:
- Strip `sql.read`, `tool.exec`, table names, IDs — replace with human nouns ("incident", "patrol team", "permit").
- Topic map covers existing topics: `sec.incident.created`, `sec.work_order.created`, `sec.permit.created`, `sec.visitor.created`, `sec.contractor.created`, plus runtime topics. Unknown topics fall through to LLM polishing (gpt-5, cached by topic+severity).
- Extends current `event-narrator.ts`; old narrator delegates to translator so existing `ExecutiveNarrator` UI inherits behavior everywhere.

## 4. Digital Twin Mode — `/_authenticated/twin`

Interactive operational map (2.5D, not full 3D — to stay 60fps on meeting-room screens). MapLibre GL with a custom dark Midnight Cyan style; sites/patrols/cameras/visitors/permits/incidents as live layers.

- `src/components/twin/DigitalTwin.tsx` — MapLibre canvas + layer toggles.
- Layers fed by `sec_sites` (base), realtime channels on `sec_patrols`, `sec_cameras`, `sec_visitors`, `sec_permits`, `sec_incidents` (already RLS-scoped).
- Hover → executive card (uses translator). Click incident → opens drill-in panel.
- Fallback: if `maplibre-gl` not yet installed, install it via bun.

## 5. Predictive insights

`src/lib/insights/predictive.functions.ts` server fn:
- Pulls last 7d of incidents, permits, patrol gaps; computes simple anomaly signals (z-score on hourly counts per site) — no external ML.
- Sends compressed signal table to `openai/gpt-5` with strict JSON schema: `{ risks: [{title, why, confidence, recommendation, horizon_hours}] }`.
- Renders in a "Predicted Risks" rail on the Bridge; each card shows confidence bar + Explain button (expands `why`).

## 6. Executive UX system

Add to `src/styles.css`:
- `--font-display`, `--text-exec-xl: 4rem`, `--text-exec-lg: 2.5rem` (semantic, large for meeting-room legibility).
- New utilities: `@utility exec-card` (glass + ambient glow), `@utility exec-headline`.

`src/components/exec/Stat.tsx`, `Button.tsx` wrappers enforcing the large-type system.

## 7. Routing & default landing

- `_authenticated.tsx`: redirect `index` to `/bridge` for users with role `executive` (via `has_role`); operators still land on `/mission-control`.
- Side nav adds Bridge + Twin entries.

## 8. Production discipline

- Every component reads via existing `createServerFn` modules — no direct supabase calls in components except realtime subscriptions.
- All copy bilingual via `src/lib/i18n.tsx`.
- Loading: skeletons only (no spinners). Errors: executive-language error cards (re-use existing pattern).
- Verification: typecheck; Playwright run against `/bridge` to capture screenshot at 1920×1080 (meeting-room target).

## Out of scope (this PR)
- Full photorealistic 3D agents (ring uses existing animated SVG portraits; only ARIA center uses R3F bust already built).
- Voice-driven commands (briefing is button-triggered).
- Mobile layout for `/bridge` (executive screens are large-format; mobile falls back to existing mission-control).

## Deliverables
1. `/bridge` route — Command Bridge with circular agent table, live data.
2. One-click Executive Briefing ≤60s end-to-end with TTS + persisted briefing row.
3. Executive translator wired into existing narrator.
4. `/twin` route — live MapLibre operational twin.
5. Predictive risks rail wired to gpt-5.
6. Executive type/utility tokens in `styles.css`.

Approve to build.
