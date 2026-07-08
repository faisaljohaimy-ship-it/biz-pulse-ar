# ARIA Auto-Tour — Master Engineering Prompt

**Route:** `/aria/tour`
**Status:** Production
**Owner:** ARIA Executive Brain (singleton)
**Video asset:** `src/assets/aria-tour-full-v2.mp4.asset.json`
**Cue schedule:** `src/lib/aria/tour-cues.ts`

---

## 1 · Mission

Turn the uploaded ARIA narration (≈8:19, portrait 9:16, AR audio) into a
self-driving executive tour of the entire NEXIOS platform: as ARIA
describes each of the 32 surfaces, the corresponding window opens **by
itself** inside the tour viewport, in perfect timing with her voice —
no operator interaction required.

---

## 2 · Contract (Definition of Done)

1. Opening `/aria/tour` autoplays the ARIA narration and immediately
   loads `/os` in the viewport.
2. On every `timeupdate` (~4 Hz), the sync engine resolves
   `activeCue(currentTime)` from `TOUR_CUES` and, if the route changed,
   swaps the iframe `src` — never remounting the whole viewport.
3. Window transitions occur **only** on cue boundaries (never mid-word,
   never during a KPI mid-sentence).
4. Operator has full manual override: `Space` toggles play, `←/→` jump
   chapters, chapter ticks on the progress rail are clickable.
5. Calibration mode: pressing `M` while playing prints a copy-paste
   `TourCue` line to the console, keyed to the current route.
6. The ARIA singleton (INVARIANT-13..17) is NOT re-instantiated inside
   the iframe — the iframe hosts the target route, ARIA lives on the
   parent shell.
7. Typecheck passes, RTL layout is preserved, no hardcoded colors, no
   `SpeechSynthesis` usage.

---

## 3 · Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  /aria/tour shell (parent)                                        │
│  ┌────────────────────────────────────────────┐  ┌─────────────┐ │
│  │  <iframe src={current.route} />            │  │  <video>    │ │
│  │  Live NEXIOS viewport                      │  │  ARIA MP4   │ │
│  │  (authenticated session inherited)         │  │  master     │ │
│  │                                            │  │  clock      │ │
│  └────────────────────────────────────────────┘  └─────────────┘ │
│           ▲                                              │        │
│           │                                              ▼        │
│           └────────── applyCue() ◀── activeCue(t) ◀── timeupdate │
└──────────────────────────────────────────────────────────────────┘
```

- **Master clock:** the `<video>` element. Nothing else drives time.
- **Cue resolver:** `activeCue(t)` — O(n) scan of the 32-entry sorted
  array; cheap enough for 4 Hz.
- **Renderer:** the iframe. Route swaps mutate `src` directly (no React
  re-key) so the browser can reuse the tab-level cache.

---

## 4 · Cue authoring rules

- Every cue lives in `src/lib/aria/tour-cues.ts` — single source of truth.
- `tSec` is the moment ARIA *begins* introducing the window (not when
  she finishes the previous one).
- Titles are short (≤ 4 words) so the chapter chip never wraps.
- Routes must exist and be reachable to the current user's role. Broken
  routes surface immediately in the iframe as a route boundary.
- To re-calibrate: play the video, press `M` at each chapter start,
  paste the log lines back into `TOUR_CUES`.

---

## 5 · Motion & hand-choreography (narrator layer)

Because the ARIA video is a pre-rendered performance, choreography is
**baked in**, not driven. When re-recording:

- **Phase A — window opens (0.0–0.8s):** right hand rises from side to
  40°, `easeOutQuart`, no shoulder shrug.
- **Phase B — explaining (0.8s → next cue − 0.9s):** open-palm 45° to
  frame the screen; "precision pinch" on the key noun of each sentence;
  left hand stays at midline with 4-second breathing loop.
- **Phase C — transition (last 0.9s of chapter):** both hands sweep
  toward next window, `easeInOutCubic`, 900 ms; head movement ≤ 8°;
  400 ms vertical fade between windows (no full disappearance).
- **Constants:** blink every 3.5–5 s, no shoulder elevation, calm
  "leader not narrator" cadence, RTL = left hand is default active.

---

## 6 · Refusals

- No autoplay with sound on hostile browsers → we accept a silent-start
  fallback and let the user press Play; we never bypass the policy.
- No `postMessage` chatter into the iframe (would violate the ARIA
  singleton invariant).
- No re-implementing the video timeline in JS timers — the browser's
  media clock is authoritative.
- No purple/indigo, no rounded-2xl on the chrome, no emoji in UI.
