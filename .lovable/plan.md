# Phase 4 — Executive Digital Human Runtime

Upgrade ARIA from a 2D SVG avatar into a 3D, alive, provider-abstracted Executive Digital Human, integrated into the existing AriaDock and Mission Control without breaking current runtime, workflows, or narration.

## Scope (this round)

Round A — Foundation + ARIA 3D (this PR):
1. **Dependencies**: add `three`, `@react-three/fiber`, `@react-three/drei`, `gsap` (framer-motion + Web Audio already present).
2. **Provider abstraction** (`src/lib/digital-humans/avatar-engine.ts`):
   - `AvatarEngine` interface: `mount(el)`, `setState(AliveState)`, `setViseme(level)`, `lookAt(x,y)`, `dispose()`.
   - Providers: `R3FAvatarEngine` (default, in-repo), stubs for `ReadyPlayerMeEngine`, `AzureAvatarEngine`, `HeyGenEngine`, `DIDEngine` — all behind one factory `createAvatarEngine(provider, persona)`.
3. **R3F ARIA scene** (`src/components/digital-humans/r3f/AriaScene.tsx`):
   - GLTF loader with graceful fallback to a stylized procedural bust if no model URL configured (`VITE_ARIA_AVATAR_URL`).
   - HDR environment via drei `Environment preset="city"`, soft executive 3-point lighting, depth-of-field-lite via fog.
   - Idle breathing (sin wave on chest scale), eye blink loop, head tracking to pointer, GSAP transitions between AliveStates, viseme-driven jaw blendshape (fallback: subtle mouth scale when morphTargets missing).
   - Suspense + lazy-loaded; canvas uses `frameloop="demand"` when idle to stay near 60 FPS.
4. **Alive state machine** (`src/lib/digital-humans/alive-states.ts`):
   - `idle | listening | thinking | analyzing | speaking | presenting | warning | critical | success | waiting | offline`.
   - Hook `useAliveState(persona)` subscribes to: TTS amplitude (existing `aria-voice.ts`), latest `enterprise_events` severity, narrator queue.
5. **AriaDock upgrade**: swap the SVG `DigitalHumanAvatar` for the new `AriaScene` inside the existing dock; keep the 2D fallback when `prefers-reduced-motion` or WebGL unavailable.
6. **Live Executive Mode trigger**: when a `high|critical` event arrives, dock auto-expands, ARIA transitions to `speaking`, narrator speaks the bilingual brief — wiring already exists via `ExecutiveNarrator` + `tts.functions.ts`; we only add the state hookup.

Round B (follow-up PR, after A ships):
- Mission Control "Executive Theater" stage (full-viewport R3F canvas, particle field, camera rig, animated connection graph between agent avatars).
- Agent Orchestra: render the 10 specialist personas as smaller R3F busts in a semicircle, each driven by the same engine + their `voice-profiles.ts` entry.
- "Start Executive Briefing" button: scripted sequence ARIA → Incident → Risk → Compliance → Digital Twin → Reporter → ARIA summary, sourced strictly from real `sec_*` data via existing `sec.functions.ts` (no fabrication).
- Presentation Mode camera choreography (GSAP timelines), KPI cards fly-in.

Round C (follow-up):
- Ready Player Me model pipeline (env-configured avatar URL per persona), Azure Speech SDK abstraction wrapper around current TTS, automatic AR/EN language detection on user input.

## Non-goals / Guardrails

- No changes to `sec_*` schema, workflow engine, tool registry, RLS, or RBAC.
- No fabricated incidents — narration stays sourced from `enterprise_events` + `sec_*` reads.
- No vendor lock-in: every avatar/voice call goes through the provider interface.
- Existing 2D `DigitalHumanAvatar` stays as fallback (reduced-motion, no-WebGL, SSR).
- Gateway model rule: TTS continues via `openai/gpt-4o-mini-tts`; ARIA reasoning continues on `openai/gpt-5` (no `temperature` for gpt-5 family).
- SSR safety: all R3F code under `Suspense` + dynamic import; no `window` at module scope.

## Technical notes

```text
src/
  lib/digital-humans/
    avatar-engine.ts         # interface + factory
    providers/
      r3f-engine.ts          # default
      readyplayerme-engine.ts# stub
      azure-engine.ts        # stub
      heygen-engine.ts       # stub
      did-engine.ts          # stub
    alive-states.ts          # state machine + useAliveState
  components/digital-humans/
    AriaDock.tsx             # upgraded to mount AvatarEngine
    r3f/
      AriaScene.tsx          # Canvas + lighting + camera
      AriaModel.tsx          # GLTF + morph/viseme + blink/breath
      ProceduralBust.tsx     # fallback when no GLTF URL
      PointerTracker.tsx     # head/eye lookAt
```

Env: optional `VITE_ARIA_AVATAR_URL` (GLTF/GLB). Absent → procedural fallback (still 3D, still alive).

Deliverable for this round: working 3D ARIA in the dock with alive states + viseme lip-sync driven by the existing TTS amplitude stream, behind the provider interface, with the 2D fallback preserved. Rounds B and C land in follow-up PRs once you approve A.
