
# ARIA Digital Executive + Living Agent Orchestra

This builds on existing surfaces (`/bridge`, `/situation-room`, `AriaDock`, `bridge.functions.ts`, `conversation.functions.ts`, `event-narrator`, R3F `ProceduralBust`, `voice-profiles`, `digital-humans/registry`). No new mock data, no duplicate orchestrators. Everything keys off `enterprise_events`, `agent_runs`, `workflow_runs`, `sec_*`.

## Scope decisions (so we ship, not stall)

- **Digital human realism**: keep procedural R3F bust + executive lighting upgrade. A true photoreal 3D female avatar requires GLB assets I cannot generate; the existing `avatar-provider` abstraction stays so a ReadyPlayerMe/HeyGen GLB can be dropped in later. I will sharply upgrade the current renderer (better skin shader, rim light, depth-of-field bloom, subtle hair silhouette, idle micro-motion, hand-gesture shoulder bob, walking entrance via camera dolly + body translateY).
- **Voice**: keep `openai/gpt-4o-mini-tts` SSE streaming via `aria-voice.ts`; add interrupt + queue + bilingual voice switch already partially present.
- **No new tables**. Reuse `enterprise_events`, `agent_runs`, `aria_reports`, `workflow_runs`.

## Deliverables

### 1. Executive Theater route `/theater` (new, primary post-login surface)
Single cinematic stage containing:
- Center: upgraded ARIA stage (full-height, volumetric lighting, particles).
- Lower third: Executive Story Feed (from `enterprise_events` via `event-narrator` → story cards with Who/Why/Impact/Evidence/Decision/Confidence/Elapsed/Next Action).
- Ring around ARIA: 12 specialist agents (existing registry) with avatar, status chip, current task, confidence ring, thinking/speaking/done animations.
- Top: Mission Health strip (reuses `getBridgeState`).
- Single CTA: **BEGIN EXECUTIVE BRIEFING** → cinematic 60s sequence driven by `briefing.functions.ts` + per-agent narration turns synthesized by `conversation.functions.ts`.

### 2. Conductor (`src/lib/exec/conductor.ts`, client)
Pure client orchestrator that:
- Subscribes to `enterprise_events` (existing realtime channel) + polls `agent_runs`.
- Builds a turn queue (ARIA → specialist → ARIA synthesis). Enforces "no random talking": agents only speak when a new event with `severity >= info-actionable` arrives, or during briefing mode.
- Calls TTS sequentially; supports interrupt (user click → cancel current audio + flush queue).
- Emits `aria.state` (idle | listening | thinking | speaking | presenting) consumed by the R3F rig for lip-sync/gesture.

### 3. Upgrades to existing files (no duplication)
- `src/components/digital-humans/r3f/ProceduralBust.tsx`: better materials (MeshPhysicalMaterial w/ subsurface tint), rim + key + fill lights, breathing+blink+saccade+head sway driven by `alive-states.ts`, gesture bob on `speaking`, walking entrance on mount (camera dolly 1.2s).
- `src/components/digital-humans/r3f/AriaScene.tsx`: volumetric god-rays via `<Bloom>` + `<Vignette>` from `@react-three/postprocessing` (already in tree? add if missing), particle field (instanced).
- `src/components/bridge/AgentNode.tsx`: add confidence arc + speaking pulse synced to conductor.
- `src/components/situation-room/AgentConversation.tsx`: render transcripts as Executive Story cards (Who/Why/Impact/Evidence/Decision/Confidence/Next).
- `src/lib/exec/briefing.functions.ts`: ensure script is structured into ordered turns (`{agentId, text_ar, text_en, durationMs}`) summing ≤60s.

### 4. New components
- `src/routes/_authenticated/theater.tsx` — the surface above.
- `src/components/theater/StoryCard.tsx` — executive story renderer.
- `src/components/theater/BriefingDirector.tsx` — drives the 60s cinematic.
- `src/lib/exec/conductor.ts` — turn scheduler.

### 5. Navigation
Add Theater entry to authenticated sidebar; keep `/bridge` and `/situation-room` operational.

## Out of scope (explicit)
- Photoreal GLB avatars (requires external asset pipeline; provider hook is ready).
- New backend tables or seed data.
- Voice command (mic input) — `aria-voice.ts` already exposes the hook; wiring a push-to-talk button only, no STT model swap.

## Validation
- Typecheck clean.
- Playwright: open `/theater`, screenshot stage, click BEGIN BRIEFING, assert ≥3 story cards appear within 60s sourced from real `enterprise_events` rows (skip if table empty and log gracefully).
- Confirm no fabricated text: conductor only emits turns when source rows exist.

Proceed?
