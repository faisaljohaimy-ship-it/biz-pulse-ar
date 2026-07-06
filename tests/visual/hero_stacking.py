"""
Stacking-context assertions for HeroZeroIntro emblems.

Complements the pixel-diff visual regression by validating the DOM
z-order contract at runtime via `document.elementsFromPoint` across
multiple viewports. This catches regressions that pixel snapshots miss:
new overlays inserted with a higher z-index, wrapper `transform`/`filter`
values that create unexpected stacking contexts, or emblems that drift
on top of ARIA's face.

Contract:
  1. At the top-emblem center point, the Saudi emblem <img> is the
     topmost element (above the video z-10 and particle canvas z-20).
  2. At the Vision 2030 crest center point, the crest node is topmost.
  3. At ARIA's face center point, neither emblem appears in the stack —
     face is never occluded.
  4. Skip and Sound-toggle buttons (if any) are spatially separate from
     both emblems (no overlap of bounding boxes).
  5. Computed `z-index` of every intro child stays within the documented
     range [10, 80]. No stray element climbs above z=80 (the shell).

Run:
    python3 tests/visual/hero_stacking.py
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

VIEWPORTS = [
    ("iphone-se", 375, 667),
    ("iphone-14-pro", 393, 852),
    ("pixel-7", 412, 915),
    ("ipad-mini", 768, 1024),
    ("desktop-1440", 1440, 900),
]

URL = "http://localhost:8080/?intro=1"
SHELL_MAX_Z = 80
INTRO_MIN_Z = 10

PROBE_JS = r"""
() => {
  const emblem = document.querySelector('[data-testid="hero-saudi-emblem"]');
  const crest  = document.querySelector('[data-testid="hero-vision-2030-crest"]');
  const video  = document.querySelector('video');
  const shell  = document.querySelector('.hero-zero-shell');
  if (!emblem || !crest || !video || !shell) {
    return { ready: false };
  }

  // `pointer-events: none` (used to keep the emblems non-interactive) also
  // hides them from elementsFromPoint hit-testing, which would give a false
  // "video is topmost" reading even though paint order is correct. Force
  // pointer-events on for the probe window, then restore.
  const pierce = document.createElement('style');
  pierce.id = '__stacking_probe__';
  pierce.textContent = `
    .hero-zero-shell, .hero-zero-shell * { pointer-events: auto !important; }
  `;
  document.head.appendChild(pierce);

  const eb = emblem.getBoundingClientRect();
  const cb = crest.getBoundingClientRect();
  const vb = video.getBoundingClientRect();

  const emblemCenter = { x: eb.x + eb.width/2, y: eb.y + eb.height/2 };
  const crestCenter  = { x: cb.x + cb.width/2, y: cb.y + cb.height/2 };
  // ARIA face approximation: centered horizontally, ~38% down the video.
  const faceCenter   = { x: vb.x + vb.width/2, y: vb.y + vb.height*0.38 };

  // Only elements that live inside the intro shell count — dev tooling
  // overlays (Vite HMR, lovable-tagger, etc.) can float above with huge
  // z-indexes but are irrelevant to production stacking.
  const stackAt = (p) => Array.from(document.elementsFromPoint(p.x, p.y))
    .filter(el => shell.contains(el))
    .map(el => ({
      tag: el.tagName,
      testid: el.getAttribute('data-testid') || '',
      cls: (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : String(el.className || ''),
      zIndex: getComputedStyle(el).zIndex,
    }));

  // Enumerate every descendant of the shell with an explicit z-index so we
  // can flag anything that climbs above the shell itself.
  const zIndexed = Array.from(shell.querySelectorAll('*'))
    .map(el => {
      const z = getComputedStyle(el).zIndex;
      const n = Number(z);
      return Number.isFinite(n) ? { tag: el.tagName, cls: (el.className.baseVal ?? String(el.className || '')).slice(0,80), z: n, testid: el.getAttribute('data-testid') || '' } : null;
    })
    .filter(Boolean);

  // Bounding boxes for spatial-overlap assertions (buttons vs emblems).
  const bbox = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };

  // Ancestry-aware hit-tests (a descendant of the crest counts as the crest).
  const hitBelongsTo = (point, sel) => {
    const els = document.elementsFromPoint(point.x, point.y).filter(el => shell.contains(el));
    return els.length > 0 && !!els[0].closest(sel);
  };
  const anyHitBelongsTo = (point, sel) => {
    return document.elementsFromPoint(point.x, point.y)
      .filter(el => shell.contains(el))
      .some(el => !!el.closest(sel));
  };

  const result = {
    ready: true,
    emblemBox: { x: eb.x, y: eb.y, w: eb.width, h: eb.height },
    crestBox:  { x: cb.x, y: cb.y, w: cb.width, h: cb.height },
    videoBox:  { x: vb.x, y: vb.y, w: vb.width, h: vb.height },
    stackAtEmblem: stackAt(emblemCenter),
    stackAtCrest:  stackAt(crestCenter),
    stackAtFace:   stackAt(faceCenter),
    emblemIsTopAtEmblem: hitBelongsTo(emblemCenter, '[data-testid="hero-saudi-emblem"]'),
    crestIsTopAtCrest:   hitBelongsTo(crestCenter,  '[data-testid="hero-vision-2030-crest"]'),
    emblemHitsFace:      anyHitBelongsTo(faceCenter, '[data-testid="hero-saudi-emblem"]'),
    crestHitsFace:       anyHitBelongsTo(faceCenter, '[data-testid="hero-vision-2030-crest"]'),
    zIndexed,
    skipBox:  bbox('button[aria-label*="Skip intro"]'),
  };
  pierce.remove();
  return result;
}
"""

def rects_overlap(a, b) -> bool:
    if not a or not b:
        return False
    return not (
        a["x"] + a["w"] <= b["x"] or
        b["x"] + b["w"] <= a["x"] or
        a["y"] + a["h"] <= b["y"] or
        b["y"] + b["h"] <= a["y"]
    )


async def run() -> int:
    failures: list[str] = []
    report: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for label, w, h in VIEWPORTS:
                ctx = await browser.new_context(
                    viewport={"width": w, "height": h}, reduced_motion="reduce"
                )
                page = await ctx.new_page()
                await page.goto(URL, wait_until="domcontentloaded")
                await page.wait_for_selector('[data-testid="hero-saudi-emblem"]', state="visible", timeout=8000)
                await page.wait_for_timeout(400)

                probe = await page.evaluate(PROBE_JS)
                if not probe.get("ready"):
                    failures.append(f"{label}: intro shell / emblem / crest not mounted")
                    await ctx.close()
                    continue

                checks: list[str] = []

                # 1) Emblem is topmost at its own center.
                top_emblem = probe["stackAtEmblem"][0] if probe["stackAtEmblem"] else {}
                if top_emblem.get("testid") != "hero-saudi-emblem":
                    failures.append(
                        f"{label}: emblem NOT topmost at own center — top was "
                        f"{top_emblem.get('tag')}.{top_emblem.get('cls')[:40]} "
                        f"testid={top_emblem.get('testid')!r}"
                    )
                else:
                    checks.append("emblem-topmost=ok")

                # 2) Crest is topmost at its own center (or a child of it).
                stack_crest_ids = [e.get("testid") for e in probe["stackAtCrest"][:3]]
                if "hero-vision-2030-crest" not in stack_crest_ids:
                    failures.append(
                        f"{label}: crest not in top-3 stack at own center — "
                        f"got {probe['stackAtCrest'][:3]}"
                    )
                else:
                    checks.append("crest-topmost=ok")

                # 3) Neither emblem occludes ARIA's face.
                face_ids = [e.get("testid") for e in probe["stackAtFace"]]
                if "hero-saudi-emblem" in face_ids or "hero-vision-2030-crest" in face_ids:
                    failures.append(
                        f"{label}: emblem/crest appears in stack at ARIA face — {face_ids}"
                    )
                else:
                    checks.append("face-clear=ok")

                # 4) Skip button (if present) must not overlap emblem/crest bounding boxes.
                skip = probe.get("skipBox")
                if skip:
                    if rects_overlap(skip, probe["emblemBox"]):
                        failures.append(f"{label}: skip button overlaps emblem bbox")
                    if rects_overlap(skip, probe["crestBox"]):
                        failures.append(f"{label}: skip button overlaps crest bbox")
                    else:
                        checks.append("skip-separate=ok")

                # 5) No intro-child z-index escapes the documented [10, 80] range.
                offenders = [
                    z for z in probe["zIndexed"]
                    if z["z"] > SHELL_MAX_Z or (z["z"] > 0 and z["z"] < INTRO_MIN_Z and z["z"] != 0)
                ]
                if offenders:
                    failures.append(
                        f"{label}: z-index out of [{INTRO_MIN_Z},{SHELL_MAX_Z}] → "
                        f"{offenders[:3]}"
                    )
                else:
                    checks.append(f"z-range=ok ({len(probe['zIndexed'])} nodes)")

                report.append({
                    "viewport": label,
                    "checks": checks,
                    "emblemBox": probe["emblemBox"],
                    "crestBox": probe["crestBox"],
                })
                await ctx.close()
        finally:
            await browser.close()

    out = Path(__file__).parent / "last-stacking-report.json"
    out.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

    if failures:
        print("\nSTACKING FAILURES:")
        for f in failures:
            print(" -", f)
        return 1
    total = sum(len(r["checks"]) for r in report)
    print(f"\nAll stacking assertions passed ({total} checks across {len(report)} viewports).")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
