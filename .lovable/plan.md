## Scope

Additive changes for the **unauthenticated public session only**. Authenticated data paths, Supabase queries, and agent logic are untouched. Auth gate uses the existing `useAuth()` hook (`user == null`).

## Part 1 — `demoDataProvider`

New file: `src/lib/demo/demoDataProvider.ts` + `src/lib/demo/useDemoData.ts`.

- Pure client module (< 10KB, zero network).
- Seeds:
  - Hero KPIs: `criticalIncidents24h=3`, `mttrMin=18`, `resolutionRate=96.4`, `openWorkOrders=42`
  - Live Ops Pulse: `riskLevel="منخفض"`, `resolutionRate=96.4`, `openIncidents=7`, `openWorkOrders=42`, `preventiveWo=128`, `activeProjects=11`
- Single shared `setInterval` (7s) drifts one random KPI by ±1 or ±0.2%, clamped to realistic bounds. Subscribers pattern; interval clears when subscriber count hits 0.
- `useDemoData()` returns snapshot + a `changedKey` transient (300ms) so cards can flash emerald.
- Companion `<DemoDataBadge />` glass chip — renders only when unauthenticated.

### Wiring (fallback only)

Each surface reads its real value; if unauthenticated **and** the value is missing/`"—"`, it substitutes the demo value in the same node (no layout shift). Same node also gains an emerald pulse class when `changedKey` matches.

Surfaces touched (fallback branch added, no behavior change when authed):
- `src/components/executive/MissionControlStrip.tsx` — hero KPIs (Critical Incidents 24h, MTTR, Resolution Rate, Open WO).
- `src/components/executive/ExecutiveHeroStage.tsx` — Live Operations Pulse block (Risk Level, Resolution Rate, Open Incidents, Open WO, Preventive WO, Active Projects).
- Add `<DemoDataBadge />` top-right of each of the two sections (unauth only).

### Public Agents section

New `src/components/executive/PublicAgentsDemoGrid.tsx` — 6 named agents with animated status dot (idle→running→done cycle, staggered) and last-run timestamp (derived from a fixed base + drift for stable SSR).

Mounted in the existing agents block when unauthenticated; the current "سجّل الدخول لعرض الشبكة الحيّة" line is preserved and rendered underneath as a small footnote link. Authenticated view unchanged.

## Part 2 — `/exec` public experience

New route `src/routes/exec.tsx` (public):
- If authenticated → `<Navigate to="/sec/exec" />` (existing command room stays authoritative).
- Else → renders the same executive command-room components with `source="demo"`, `<DemoDataBadge />`, and a prominent glass CTA button "سجّل الدخول للبيانات الحيّة" → `/auth`.
- Reuses `MissionControlStrip` + Live Ops Pulse components fed by `useDemoData()`; no duplication.
- `head()` title: `"غرفة القيادة التنفيذية — NEXIOS AI OS"`.

## Part 3 — Brand integrity

1. **Titles**: Remove the two duplicate `"Lovable App"` entries in `src/routes/__root.tsx` `head()` (they currently override the real `SITE_NAME` because they appear last in the meta array). Audit and confirm every route's `head()` title is set; add titles to any route missing one.
2. **Ticker**: `src/components/executive/BetaMarqueeBar.tsx` — split items array by auth. Public list = `["✦ NEXIOS AI OS · v1.0 GA", "✦ Executive Delivery Platform · Vision 2030", "✦ Powered by ARIA · GPT-5"]`. Authenticated list keeps existing beta wording.
3. **Hajj URL leak**: `src/components/executive/LiveSystemShowcase.tsx` + `src/routes/hajj-prime.tsx` — remove the two visible raw-URL text nodes. Iframe/Enter button `href` unchanged (still uses `LIVE_URL` constant).
4. **NEXUS → NEXIOS** display text only (no code identifiers):
   - `NexusRevealHero.tsx` line 152 wordmark and line 225 `"NEXUS · BOOT"`.
   - `CityToBoardroomTransition.tsx` line 261 `"NEXUS · OS · TRANSIT"`.
   - `HoloCommandStage.tsx` line 190 label.
   - `LiveSystemShowcase.tsx` line 102 iframe title.

## Technical details

- Auth check via existing `useAuth()` from `@/lib/auth-context` (`user === null` = public).
- Drift interval: `Math.max(6000, 6000 + Math.random()*4000)` per tick; single global instance in module scope, refcounted.
- Emerald pulse: 1 CSS keyframe added in module `<style>` string, GPU transform/opacity only.
- Bounds: incidents ∈ [1,8], MTTR ∈ [12,26], resolution ∈ [94.0, 98.5], WOs ∈ [35, 55], preventive ∈ [115, 140].
- Demo values live in same DOM node as `"—"` — no layout shift (CLS = 0).
- SSR-safe: drift only starts inside `useEffect`; initial render uses seed values deterministically.

## Out of scope

- Any authenticated route or query.
- New backend endpoints.
- Renaming code identifiers, tables, or routes.
- Redesigning the command room layout.
