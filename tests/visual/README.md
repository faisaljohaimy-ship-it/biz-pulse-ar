# Visual Regression — Hero Emblems

Guards two elements in `HeroZeroIntro` against layout drift and clipping:

| testid                     | Element                                            |
| -------------------------- | -------------------------------------------------- |
| `hero-saudi-emblem`        | Top-center Saudi national emblem (swords + palm)  |
| `hero-vision-2030-crest`   | Bottom stack — رؤية 2030 crest under NEXIOS AI    |

Viewports covered: `iphone-se`, `iphone-14-pro`, `pixel-7`, `ipad-mini`, `desktop-1440`.

## Guarantees

1. **Safe-area** — each emblem's bounding box stays at least 8px inside every viewport edge (`RED` if clipped or overflowing).
2. **Pixel stability** — element screenshot compared to the committed baseline with a mean per-channel delta ≤ **3.0 / 255** (~1.2%). Larger drift = `FAIL` and a diff PNG is written to `diffs/`.

Reduced-motion is forced in the browser context so fade-in animations don't cause flakiness.

## Run

Dev server must be up at `http://localhost:8080` (Vite `npm run dev`).

```bash
# Regression check (fails on drift)
python3 tests/visual/hero_emblem_visual.py

# Refresh baselines after an intentional visual change
UPDATE_BASELINES=1 python3 tests/visual/hero_emblem_visual.py
```

Artifacts:
- `baselines/` — committed reference PNGs (source of truth).
- `current/`   — last captured PNGs (gitignored).
- `diffs/`     — per-target diff PNGs when a check fails (gitignored).
- `last-report.json` — machine-readable summary of the last run.

## TDD Evidence

- **RED**: run against `main` without the emblem `data-testid`s or with the top emblem removed → both targets fail visibility / safe-area assertions.
- **GREEN**: with the current implementation and freshly written baselines, all 10 checks (2 targets × 5 viewports) pass.
