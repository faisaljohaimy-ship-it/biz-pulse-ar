# NEXIOS × NEXUS AI OS — Enterprise Delivery Plan (SEC-Ready)

## Objective
Merge the standalone NEXUS AI OS runtime hub into `nexios.com` as a first-class native section under unified routing, navigation, and identity — not an iframe or external link. Lock dark mode, deliver instant bilingual AR/EN switching (English default), rebuild the ARIA holographic assistant to match the reference portrait, and pass a full multi-discipline production audit before handoff.

## Scope

### 1. Native Integration — Runtime Hub as `/os`
- New route `src/routes/os.tsx` (English-labelled "Enterprise Operating System") replacing the standalone `runtime-hub.tsx` UX, rendered inside the nexios shell (BetaMarqueeBar, root layout, GlobalAriaCopilot).
- Add nav entry "Enterprise OS / نظام التشغيل" in the header of `__root.tsx`.
- Each of the 9 tiles routes into existing internal modules (`/hajj`, `/operations`, `/executive-reports`, `/exec`, `/command-center`).
- Remove any external `hajj-nexus-prime.lovable.app` links; the experience lives inside nexios.

### 2. Locked Dark Mode (Hero + `/os` section)
- Add `data-force-dark` attribute strategy in `src/lib/theme.tsx`: on `/` (hero) and `/os/*` routes, force `dark` class on `<html>`, ignore localStorage, disable ThemeToggle rendering.
- Purge any code path that writes `light` to localStorage while on these routes.
- CSS: scope the obsidian palette (`#0a0e1a → #0f1729`) via a `[data-surface="os"]` root wrapper so tokens can't be overridden.

### 3. Mobile-First Responsive Grid
- Rebuild the 3×3 grid with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, Hajj tile spans `sm:col-span-2 lg:col-span-1 lg:row-span-1` and stays visually dominant via ring/glow, not size hacks.
- Touch targets ≥ 44px, fluid typography via `clamp()`, `min-w-0` + `truncate` on bilingual labels, no horizontal scroll at 320px.
- Reduce particle count / disable heavy blur on `(max-width: 640px)` and `(prefers-reduced-motion)`.

### 4. Instant i18n (EN default, AR toggle)
- Extend `src/lib/i18n.tsx` with a dedicated `os.*` namespace covering: hero title, subtitle, Vision 2030 tagline, 9 tile labels (AR + EN), READY badge, footer version, ARIA prompt placeholder, agent status strings.
- LanguageToggle already exists — surface it in the root header as a globe icon with cyan glow, visible on every route.
- Switching updates `<html lang dir>` synchronously (no reload), verified against RTL/LTR flip of icons/arrows using logical properties (`ms-*`, `me-*`, `start/end`).
- Persist choice in `localStorage` under `nexios.locale`, default `en` on first visit.

### 5. Bilingual Agents + Voice
- `aria-ask` system prompt already language-aware; extend to receive `locale` param from client and enforce reply language.
- `aria-tts`: pass locale → choose ElevenLabs multilingual voice already in use (Sarah supports both); pick `nova` for EN when gateway path fires. Add `voice_settings` tweaks per locale.
- Agent ring labels + tooltips read from `os.agents.*` keys.

### 6. ARIA Holographic Redesign
- Replace current `AriaDock` avatar with a new asset matching the reference: cyan holographic female bust, particles, extended hand, fade-to-mist base. Generate via `imagegen` (premium, transparent bg) → upload via `lovable-assets` → wire into `HologramFace.tsx`.
- Presentation container: white/light radial backdrop (intentional identity contrast) inside a rounded card.
- Motion: idle breathing (scale 1↔1.015, 4s), particle shimmer (SVG/CSS layer), speaking = mouth-area glow pulse driven by existing `mouthAmplitude`, listening = mic pulse ring. All GPU-accelerated (`transform`, `opacity` only), respects `prefers-reduced-motion`.
- Extensible expression state machine: `idle | listening | thinking | speaking | alert` (enum in `aria-voice.ts`), only 3 wired now, rest scaffolded.
- Input bar underneath: glass border, teal mic icon, bilingual placeholder from i18n keys.

### 7. Hero + Vision 2030 Messaging
- Update landing hero copy: add tagline "Empowering Saudi Vision 2030 · Digital Transformation for National Industrial Excellence" / "تمكين رؤية السعودية 2030 · التحول الرقمي للتميز الصناعي الوطني".
- Sparkle icon, obsidian bg with dot-grid overlay, Tajawal (AR) / Inter (EN) already loaded.

### 8. Agents Card Elevation
- The "Agents / الوكلاء" tile links to `/exec` (agent ring). Copy elevated to describe autonomous decision layer aligned with Vision 2030 digital transformation goals, bilingual.

## Multi-Discipline Audit (post-implementation)

| Reviewer | Checks |
|---|---|
| Design QA | Dark lock verified via DevTools on `/` and `/os`; contrast ≥ 4.5:1 both locales; glow FPS on mid-tier Android via Playwright throttle. |
| Mobile QA | Playwright viewports 375×667, 390×844, 430×932, 360×800 — no horizontal scroll, tiles tappable, hero readable without zoom. |
| i18n QA | Toggle round-trip: EN→AR→EN, assert every `os.*` key present, no untranslated fallback, `dir` attr flips, icons mirror correctly. |
| Code Quality | Single reusable `<RuntimeTile>` component, all strings via `t()`, TypeScript strict, `tsgo` clean, zero console warnings. |
| Security | No secrets in client bundle, `aria-ask`/`aria-tts` rate-limited (already in place), verify Beta marquee doesn't leak internals. |
| Performance | Lazy-load ARIA 3D scene, `loading="lazy"` on hologram asset, bundle diff < +40KB gzip, LCP unchanged. |

Findings will be listed as **Critical / Major / Minor** and fixed inline before sign-off.

## Technical Notes

- **Files created**: `src/routes/os.tsx`, `src/components/os/RuntimeTile.tsx`, `src/components/os/OsHeader.tsx`, `src/lib/i18n/os.ts` (namespace merge), new ARIA hologram asset under `src/assets/aria-holo-v2.png.asset.json`.
- **Files modified**: `src/routes/__root.tsx` (nav + LanguageToggle placement), `src/lib/theme.tsx` (force-dark scopes), `src/lib/i18n.tsx` (namespace), `src/components/executive/LanguageToggle.tsx` (globe icon variant), `src/components/digital-humans/AriaDock.tsx` + `HologramFace.tsx` (new asset + state machine), `src/routes/index.tsx` (Vision 2030 tagline, entry CTA to `/os`).
- **Non-goals**: Not rebuilding `/hajj`, `/operations`, `/exec` internals — they are the destinations, already production. Not changing backend RLS, agents SQL, or Supabase schema.
- **Rollback**: All changes additive or scoped by route; removing `/os` route + reverting `theme.tsx` restores prior behavior.

## Out of Scope
- Adding new AI agents or workflows (existing 14 agents remain).
- Backend migrations.
- Changing published domain / DNS.
