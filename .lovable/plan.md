## Executive Situation Room — Phase 5

Transform the existing `/bridge` War Room into a calmer, more cinematic **Executive Situation Room** without touching DB schema, workflows, or agent logic. All work is presentation-layer on top of the existing `bridge.functions.ts`, `briefing.functions.ts`, `predictive.functions.ts`, `event-narrator`, `AriaScene` (R3F), narrator TTS, and `enterprise_events` stream.

### New route
- `/_authenticated/situation-room.tsx` — primary executive surface. Keep `/bridge` for backwards compatibility (re-exports the same components).
- Add nav entry "Situation Room" in `app-shell.tsx`, promoted above "Bridge".

### Layout (calm grid, 80% static)
````text
┌─ TopBar: Mission Status | Threat Level | Org/Shift | Time | Sys Health | Agent Health | AI Conf ─┐
│                                                                                                  │
│   ┌─ Left: Operational Health column ─┐   ┌── Center stage ──┐   ┌─ Right: Decision Engine ─┐  │
│   │ Visitors / Permits / WOs /        │   │  ARIA 3D bust    │   │ Top 3 Risks              │  │
│   │ Compliance / Patrols / Incidents  │   │  on holo table   │   │ Top Opportunities        │  │
│   │ (compact KPI pulses)              │   │  Agent ring      │   │ Recommended Actions      │  │
│   └───────────────────────────────────┘   │  around ARIA     │   │ (priority + confidence)  │  │
│                                            └──────────────────┘   └──────────────────────────┘  │
│                                                                                                  │
│   ┌─ Bottom: Live Executive Story feed (storytelling, no SQL/tool names) ────────────────────┐  │
│   │ [time]  What happened · Where · Impact · Response · Recommendation · ETA                 │  │
│   └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   [ BEGIN EXECUTIVE BRIEFING ]   [ PRESENTATION MODE ]   [ DIGITAL TWIN ]                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
````
Animations only fire when an `enterprise_events` row arrives (new incident → red ring pulse on related agent; new permit → soft cyan; etc.). Idle = motionless.

### Components (new, presentation only)
- `components/situation-room/TopStatusBar.tsx` — pulls `getBridgeHealth` + agent health from `getAgents`; computes Threat Level (`Secure / Normal / Elevated / Critical`) from composite score.
- `components/situation-room/OperationalHealthColumn.tsx` — compact KPI pulses (reuses values already in `BridgeHealth`).
- `components/situation-room/AgentCommandTable.tsx` — replaces `AgentRing` with a curved "console" layout; each `AgentConsole` shows avatar, status, confidence bar, current task, risk dot, last activity, speaking/thinking/connection indicators (data already on `agent_runs`).
- `components/situation-room/DecisionEngine.tsx` — calls existing `getPredictiveRisks` + new server fn `getExecutiveDecisions` (composes Top 3 risks / opportunities / actions from `sec_incidents`, `briefing_risks`, `briefing_opportunities`, `briefing_actions`).
- `components/situation-room/LiveEventStory.tsx` — wraps `MissionTimeline` with the executive-story formatter (`event-narrator` already strips SQL/tool names); adds Impact / Response / ETA fields derived from event payload.
- `components/situation-room/PresentationMode.tsx` — full-screen takeover that orchestrates the existing `BriefingStage` + `AriaScene` camera dolly + bilingual TTS sequence (ARIA → Incident Commander → Risk → Compliance → Digital Twin → Knowledge → Reporter → ARIA close), 30–60s total. Reuses `tts.functions.ts` and `voice-profiles.ts`.
- `components/situation-room/DigitalTwinPanel.tsx` — embed of existing `executive-map-client.tsx` in a modal sheet, hydrated from `sec_sites`, `sec_patrols`, `sec_incidents`, `sec_visitors`, `sec_permits`, `sec_assets`, `sec_cameras`, `sec_vehicles`.

### Server functions (additive, no schema changes)
- `lib/exec/decisions.functions.ts` → `getExecutiveDecisions()`: aggregates last-24h `sec_incidents` (severity ranking) + `briefing_risks` + `briefing_opportunities` + `briefing_actions` for current org; returns `{ risks[3], opportunities[3], actions[3] }` with priority + confidence + business/operational impact strings already stored on those rows.
- Extend `bridge.functions.ts` with `getThreatLevel()` derived from existing health composite (pure function, no DB write).

### Design tokens
Reuse Deep Midnight Cyan palette already in `styles.css` (`--background #061A2E`, accent `#00D4FF`, glow `#3AE8FF`). Add two semantic tokens:
- `--threat-elevated: oklch(...)` amber
- `--threat-critical: oklch(...)` red
Typography: bump base to `text-[15px]` in Situation Room scope, headings `text-2xl/3xl tracking-tight` — executive-friendly for 45+ readers. High-contrast `text-foreground` on glass surfaces (no `text-gray-*`).

### Performance
- All R3F (`AriaScene`) already lazy-loaded; keep it.
- `LiveEventStory` virtualizes with `react-window` (already in deps if not, install `bun add react-window`).
- `useQuery` 6s refetch only when tab visible (`refetchIntervalInBackground: false`).
- No animation libraries beyond existing motion primitives in `components/mission-control/motion.tsx`.

### Accessibility
- Single `<main>` per route, semantic landmarks.
- Every icon-only button has `aria-label`.
- Reduced-motion respected (already wired in `AriaDock` fallback).
- Minimum 44×44 tap targets on the briefing/presentation/twin actions.

### Engineering invariants (respected)
- No migrations.
- No edits to `agent-runtime.server.ts`, workflow engine, tool registry, or `enterprise_events` triggers.
- No changes to existing routes other than adding the new one and a nav link.

### Out of scope (will not do)
- Photorealistic ARIA (current R3F bust is procedural; swapping to GLTF/Ready Player Me requires assets the user hasn't supplied — flagged as follow-up).
- Weather widget (no provider connected; leave optional placeholder slot).

### Files to create
- `src/routes/_authenticated/situation-room.tsx`
- `src/components/situation-room/{TopStatusBar,OperationalHealthColumn,AgentCommandTable,AgentConsole,DecisionEngine,LiveEventStory,PresentationMode,DigitalTwinPanel}.tsx`
- `src/lib/exec/decisions.functions.ts`

### Files to edit
- `src/components/app-shell.tsx` — add nav item.
- `src/lib/exec/bridge.functions.ts` — add `getThreatLevel` helper export.
- `src/styles.css` — add threat-level semantic tokens.