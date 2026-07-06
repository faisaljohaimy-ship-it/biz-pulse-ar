"""
Visual regression test for the Vision 2030 crest + Saudi national emblem
in HeroZeroIntro across multiple viewports.

Guarantees:
  1. Both emblems render inside the viewport safe-area (never clipped).
  2. Their rendered bitmap does not drift beyond a pixel tolerance after edits.

Usage:
  Baselines (first run or intentional visual update):
      UPDATE_BASELINES=1 python3 tests/visual/hero_emblem_visual.py
  Regression run (fails on drift):
      python3 tests/visual/hero_emblem_visual.py

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
# Tolerance: mean per-channel absolute delta out of 255. ~1.2% is enough to
# absorb font hinting / antialias jitter while still catching layout drift.
PIXEL_MEAN_TOLERANCE = 3.0
# Emblems must sit fully inside these safe-area insets (px, from each edge).
SAFE_AREA_INSET = 8

VIEWPORTS = [
    # label,        width, height  (representative iOS / Android / desktop sizes)
    ("iphone-se",       375,  667),
    ("iphone-14-pro",   393,  852),
    ("pixel-7",         412,  915),
    ("ipad-mini",       768, 1024),
    ("desktop-1440",   1440,  900),
]

TARGETS = [
    "hero-saudi-emblem",        # top-center crossed swords + palm
    "hero-vision-2030-crest",   # bottom stack (رؤية 2030)
]

URL = "http://localhost:8080/?intro=1"


def compare(a: Path, b: Path, diff_out: Path) -> float:
    """Return mean per-channel abs diff between two PNGs; write a diff image."""
    img_a = Image.open(a).convert("RGB")
    img_b = Image.open(b).convert("RGB")
    if img_a.size != img_b.size:
        # Size mismatch = layout drift; treat as maximum delta.
        img_b = img_b.resize(img_a.size)
        delta = ImageChops.difference(img_a, img_b)
        delta.save(diff_out)
        return 255.0
    delta = ImageChops.difference(img_a, img_b)
    delta.save(diff_out)
    stat = delta.getbbox()
    if not stat:
        return 0.0
    hist = delta.histogram()
    # per-channel weighted mean
    total = 0.0
    count = 0
    for ch in range(3):
        channel = hist[ch * 256 : (ch + 1) * 256]
        for value, freq in enumerate(channel):
            total += value * freq
            count += freq
    return total / count if count else 0.0


async def run() -> int:
    failures: list[str] = []
    report: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for label, w, h in VIEWPORTS:
                context = await browser.new_context(
                    viewport={"width": w, "height": h},
                    device_scale_factor=1,
                    reduced_motion="reduce",  # freeze fade-in so bitmaps are stable
                )
                page = await context.new_page()
                await page.goto(URL, wait_until="domcontentloaded")

                # Ensure fonts/animations settled after reduced-motion snap.
                await page.wait_for_timeout(1500)

                for testid in TARGETS:
                    locator = page.get_by_test_id(testid)
                    try:
                        await locator.wait_for(state="visible", timeout=5000)
                    except Exception:
                        failures.append(f"{label}/{testid}: element not visible")
                        continue

                    box = await locator.bounding_box()
                    if not box:
                        failures.append(f"{label}/{testid}: no bounding box")
                        continue

                    # Safe-area assertion — emblem must not touch or exceed edges.
                    if (
                        box["x"] < SAFE_AREA_INSET
                        or box["y"] < SAFE_AREA_INSET
                        or box["x"] + box["width"] > w - SAFE_AREA_INSET
                        or box["y"] + box["height"] > h - SAFE_AREA_INSET
                    ):
                        failures.append(
                            f"{label}/{testid}: outside safe-area "
                            f"box={box} viewport={w}x{h}"
                        )

                    name = f"{testid}__{label}.png"
                    current_path = CURRENT / name
                    baseline_path = BASELINES / name
                    diff_path = DIFFS / name

                    await locator.screenshot(path=str(current_path))

                    if UPDATE or not baseline_path.exists():
                        # Establish baseline.
                        baseline_path.write_bytes(current_path.read_bytes())
                        report.append({
                            "viewport": label, "target": testid,
                            "status": "BASELINE_WRITTEN", "delta": 0.0,
                            "box": box,
                        })
                        continue

                    delta = compare(baseline_path, current_path, diff_path)
                    ok = delta <= PIXEL_MEAN_TOLERANCE
                    report.append({
                        "viewport": label, "target": testid,
                        "status": "PASS" if ok else "FAIL",
                        "delta": round(delta, 3),
                        "tolerance": PIXEL_MEAN_TOLERANCE,
                        "box": box,
                    })
                    if not ok:
                        failures.append(
                            f"{label}/{testid}: pixel drift {delta:.2f} > "
                            f"{PIXEL_MEAN_TOLERANCE} (diff: {diff_path})"
                        )

                await context.close()
        finally:
            await browser.close()

    (ROOT / "last-report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(" -", f)
        return 1
    print(f"\nAll {len(report)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
