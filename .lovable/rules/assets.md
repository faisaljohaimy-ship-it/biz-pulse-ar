---
description: "Brand assets shipped by the AI Command Center design system (logos, icons, illustrations, photography, fonts, videos) with exact import paths. Read before adding any logo, icon, illustration, image, video, or font to the app: use these real assets instead of placeholders, stock photos, or generated images."
---

# AI Command Center — Assets

These files are copied into `src/design-system/{slug}/assets/` in this project — never generate, placeholder, or substitute an asset that exists here.

Raw files import directly, e.g. `import logo from "@/design-system/{slug}/assets/logos/logo.svg"`.
R2 pointer files (`.asset.json`) are imported as JSON — use the `url` property, e.g. `import hero from "@/design-system/{slug}/assets/hero.png.asset.json"` then `<img src={hero.url} />`.
The full machine-readable catalog lives in this library's `design-system.json` (`assets` array).

## Videos

- `@/design-system/{slug}/assets/films/analytics.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/boardroom.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/digital-twin.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/investor-ar.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/investor-en.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/roi.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/sadeed.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/films/walkthrough.mp4.asset.json` (mp4, R2 pointer)

## Images

- `@/design-system/{slug}/assets/nexios-home-toroid.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/sadeed-og.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/sadeed-portrait.png` (png)

