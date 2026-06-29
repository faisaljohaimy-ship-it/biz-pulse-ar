## Executive AI Command Center — Upgrade Plan

The directive spans 12 phases. To preserve every existing workflow and ship measurable value per round, I'll execute in **4 incremental rounds**. Each round is self-contained, typechecks clean, and adds polish without touching business logic. No data, server functions, or RLS change.

---

### Round 1 — Foundations (Phases 1, 8, 11, 12)
Premium shell + motion vocabulary the rest of the rounds rely on.

- Install `framer-motion` (if missing) and a tiny `ExecutiveMotion` primitives file: `<FadeIn>`, `<SlidePanel>`, `<PulseOnChange>`, `<NumberFlow>`. Used everywhere.
- New `MissionControlShell` 4-zone grid (Left nav+org+agents · Center timeline · Right KPIs+recommendations+incidents · Bottom live feed). The current `mission-control.tsx` body becomes the **Center** zone — zero logic change.
- Larger executive type scale (`text-2xl` headlines, `text-base` body, tabular-nums on every KPI), high-contrast tokens already in `styles.css`.
- Add `prefers-reduced-motion` guard in the motion primitives → Phase 11 covered.
- Tailwind `@utility glass-card` consolidating the existing glassmorphism (no `-webkit-backdrop-filter` duplication, per stack rule).

### Round 2 — Living Agents + Vertical Conversation (Phases 2, 3, 9)
- Extract the current agent script renderer into `AgentChoirPanel` (Left zone) with animated avatars: status ring per state (`active`/`thinking`/`waiting`/`collaborating`/`error`/`idle`), Framer Motion ring rotation + dot bounce.
- Center zone gets `AgentConversationStream` — vertical timeline of agent turns with smooth `AnimatePresence` enter/exit and ChevronDown connector animation.
- Each agent line shows: avatar · name · current task · last-execution timestamp · live state pill. State derives from the existing `buildAgentScript()` output + `getSecOverview()` data — no new server calls.

### Round 3 — KPI Cards + Live Timeline + Command Palette (Phases 5, 6, 7)
- `ExecutiveKpiCard` with `<PulseOnChange>` + `<NumberFlow>` for 10 metrics already aggregated by `getSecOverview()` (readiness, incidents, patrols, work orders, visitors, permits, response time, risk, compliance, AI confidence). Cards pulse cyan when value changes.
- `LiveOperationsTimeline` (Bottom zone) — animated vertical/horizontal feed sourced from `enterprise_events` (existing query). Smooth `AnimatePresence` row insertion.
- Global `CommandPalette` using existing `src/components/ui/command.tsx` (cmdk) bound to `⌘K` / `Ctrl+K`. Bilingual commands (AR + EN) route via TanStack `useNavigate` to existing routes (incidents, patrols, permits, reports, run-agent). No fake actions — every command maps to a real route or existing server fn.

### Round 4 — Digital Twin Map + Polish (Phases 4, 10)
- `DigitalTwinMap` component: SVG-based site map (no Mapbox per stack constraints) plotting facilities/patrols/visitors/vehicles/incidents/assets from `getSecOverview()` site rows. Color coded by status. Lazy-loaded via `React.lazy` + Suspense fallback to satisfy Phase 10.
- Memoize heavy children (`React.memo` on agent rows, KPI cards), virtualize the activity feed beyond 50 rows using a tiny windowing pattern.
- Final pass: dead-button audit, empty-state guidance copy (bilingual), keyboard shortcuts cheat-sheet dialog (`?` opens it).

---

### Technical guardrails

- Zero changes to `src/lib/sec.functions.ts`, `agent-runtime.server.ts`, DB schema, or RLS.
- Every new component lives under `src/components/mission-control/` — easy to revert.
- All colors via semantic tokens; no hardcoded hex outside `styles.css`.
- Each round ends with a typecheck + a smoke screenshot via Playwright.

---

### Confirm before I start

This will take ~4 successive turns to land cleanly. **Should I proceed with Round 1 now**, or would you prefer a different ordering (e.g. start with the Command Palette + KPI cards for fastest demo impact)?