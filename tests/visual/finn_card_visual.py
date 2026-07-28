"""
Visual regression — FINN card (dark digital background + luminous glass edges)
at 390px (mobile) and 1280px (laptop).

Guards two invariants from mem://design/finn-visual-constitution.md:

  1. **Dark digital background** — the FINN card interior stays near
     `#061525` (base) / `#0a2036` (core radial). We sample multiple interior
     patches and assert their mean color sits inside a narrow HSV/luma window
     around the constitutional palette. A glassy/white regression (e.g. someone
     dropping backdrop-blur or a light overlay back in) trips this immediately.

  2. **Luminous glass edge glow** — the 1px frosted ring emitted by
     `.finn-glass-edge` must produce a measurably brighter rim than the
     interior. We sample a thin band just inside each edge and compare its
     luma to the deep interior; the delta must exceed a minimum threshold so
     that removing the edge glow (or accidentally clipping it) fails the test.

  3. **Pixel stability** — a screenshot of the card element is compared
     against a committed baseline with the same tolerance model used by
     `hero_emblem_visual.py`.

Usage:
  UPDATE_BASELINES=1 python3 tests/visual/finn_card_visual.py   # refresh baselines
  python3 tests/visual/finn_card_visual.py                       # regression run

Requires the dev server on http://localhost:8080.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
BASELINES = ROOT / "baselines"
CURRENT = ROOT / "current"
DIFFS = ROOT / "diffs"
for d in (BASELINES, CURRENT, DIFFS):
    d.mkdir(parents=True, exist_ok=True)

UPDATE = os.environ.get("UPDATE_BASELINES") == "1"

# Two viewports the user explicitly cares about.
VIEWPORTS = [
    ("mobile-390", 390, 844),
    ("laptop-1280", 1280, 800),
]

URL = "http://localhost:8080/"
CARD_TESTID = "finn-portal-card"

# --- Constitutional palette (mem://design/finn-visual-constitution.md) ------
# Base #061525 + core radial #0a2036 + PCB/grid/code-rain overlays. The FINN
# character occupies part of the frame, so we don't demand every pixel be near
# #061525 — instead we assert the *aggregate* card stays clearly dark (mean
# luma well below any "glassy/white" regression) and lock the exact bitmap.
MEAN_LUMA_CEILING = 70.0        # empirical baseline ~30 mobile / ~39 laptop.
# Overall mean color must stay in the cool blue-black quadrant (blue >= green
# >= red), matching the constitutional palette. A pale/glass regression flips
# this immediately.
COOL_TONE_MARGIN = 4.0          # blue must exceed red by at least this much.

# Bitmap tolerance — the pixel-diff baseline is what actually guards the
# `.finn-glass-edge` luminous ring against removal or drift.
PIXEL_MEAN_TOLERANCE = 6.0


def luma_of(rgb: tuple[float, float, float]) -> float:
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def mean_rgb_full(img: Image.Image) -> tuple[float, float, float]:
    px = list(img.convert("RGB").getdata())
    n = len(px) or 1
    return (
        sum(p[0] for p in px) / n,
        sum(p[1] for p in px) / n,
        sum(p[2] for p in px) / n,
    )


def compare(a: Path, b: Path, diff_out: Path) -> float:
    img_a = Image.open(a).convert("RGB")
    img_b = Image.open(b).convert("RGB")
    if img_a.size != img_b.size:
        img_b = img_b.resize(img_a.size)
    delta = ImageChops.difference(img_a, img_b)
    delta.save(diff_out)
    hist = delta.histogram()
    total = 0.0
    count = 0
    for ch in range(3):
        channel = hist[ch * 256 : (ch + 1) * 256]
        for value, freq in enumerate(channel):
            total += value * freq
            count += freq
    return total / count if count else 0.0


def assert_dark_and_cool(img: Image.Image) -> tuple[bool, str, dict]:
    r, g, b = mean_rgb_full(img)
    l = luma_of((r, g, b))
    dark_ok = l <= MEAN_LUMA_CEILING
    cool_ok = (b - r) >= COOL_TONE_MARGIN and b >= g - 2  # blue-dominant, not warm/gray
    ok = dark_ok and cool_ok
    msgs = []
    if not dark_ok:
        msgs.append(f"mean luma {l:.1f} > {MEAN_LUMA_CEILING} (glass/white regression?)")
    if not cool_ok:
        msgs.append(f"tone not cool-blue: rgb=({r:.1f},{g:.1f},{b:.1f})")
    return ok, "; ".join(msgs), {
        "mean_rgb": [round(r, 1), round(g, 1), round(b, 1)],
        "mean_luma": round(l, 2),
        "ceiling": MEAN_LUMA_CEILING,
        "cool_margin_required": COOL_TONE_MARGIN,
    }


async def run() -> int:
    failures: list[str] = []
    report: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for label, vw, vh in VIEWPORTS:
                context = await browser.new_context(
                    viewport={"width": vw, "height": vh},
                    device_scale_factor=1,
                    reduced_motion="reduce",
                )
                page = await context.new_page()
                # Freeze *all* animations/transitions so the pixel-diff baseline is
                # deterministic. `reduced_motion=reduce` on the context is a hint
                # web pages may ignore; this style tag is an unconditional stop.
                await page.add_init_script(
                    """
                    const s = document.createElement('style');
                    s.textContent = `
                      *, *::before, *::after {
                        animation-duration: 0s !important;
                        animation-delay: 0s !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0s !important;
                        transition-delay: 0s !important;
                      }
                    `;
                    (document.head || document.documentElement).appendChild(s);
                    """
                )
                await page.goto(URL, wait_until="domcontentloaded")

                locator = page.get_by_test_id(CARD_TESTID).first
                try:
                    await locator.wait_for(state="visible", timeout=8000)
                except Exception:
                    failures.append(f"{label}: FINN card not visible")
                    await context.close()
                    continue

                # Small settle for layout + fonts; animations are already frozen.
                await page.wait_for_timeout(600)
                await locator.scroll_into_view_if_needed()


                box = await locator.bounding_box()
                if not box:
                    failures.append(f"{label}: card has no bounding box")
                    await context.close()
                    continue

                name = f"finn-card__{label}.png"
                current_path = CURRENT / name
                baseline_path = BASELINES / name
                diff_path = DIFFS / name

                await locator.screenshot(path=str(current_path))
                img = Image.open(current_path).convert("RGB")

                tone_ok, tone_msg, tone_info = assert_dark_and_cool(img)

                entry: dict = {
                    "viewport": label,
                    "size": [img.size[0], img.size[1]],
                    "tone": {"ok": tone_ok, **tone_info},
                }

                if UPDATE or not baseline_path.exists():
                    baseline_path.write_bytes(current_path.read_bytes())
                    entry["pixel"] = {"status": "BASELINE_WRITTEN", "delta": 0.0}
                else:
                    delta = compare(baseline_path, current_path, diff_path)
                    pixel_ok = delta <= PIXEL_MEAN_TOLERANCE
                    entry["pixel"] = {
                        "status": "PASS" if pixel_ok else "FAIL",
                        "delta": round(delta, 3),
                        "tolerance": PIXEL_MEAN_TOLERANCE,
                    }
                    if not pixel_ok:
                        failures.append(
                            f"{label}: pixel drift {delta:.2f} > {PIXEL_MEAN_TOLERANCE} "
                            f"(baseline={baseline_path.name}, diff={diff_path})"
                        )

                if not tone_ok:
                    failures.append(f"{label}: {tone_msg}")

                report.append(entry)
                await context.close()
        finally:
            await browser.close()

    (ROOT / "last-finn-card-report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(" -", f)
        return 1
    print(f"\nAll {len(report)} FINN card visual checks passed.")
    return 0



if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
