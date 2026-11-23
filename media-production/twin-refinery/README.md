# Illustrative refinery motion inset

This is a locally authored motion-design film made from one owner-authorized AI
landscape still. It is **not live footage, a generated 3D scene, operational
coverage, or a verified asset/dependency model**. Higgsfield was inspected and
cost-quoted only; its balance did not cover the proposed job. No HeyGen paid
generation, avatar, TTS, purchase, trial, credit reset, or provider retry was used.

The production follows the HeyGen `motion-graphics` and `video-editing` workflows:
deterministic Python animation, original synthesized quiet ambience, one coherent
azure technical style, one focused review/correction batch, and measured export.

## Reproduce

Installed tools: Python 3.12, Pillow with RAQM/FreeType, NumPy, and FFmpeg with
libx264/AAC/WebP. The renderer records exact runtime versions and source SHA-256.
It performs no network or application/database operation.

```sh
python media-production/twin-refinery/render.py \
  --image docs/design/reference/refinery-generated-first-frame-2026-11-23.png \
  --output .audit-tmp/twin-refinery-final
```

Reproduce the responsive, uncropped scene images with
`python media-production/twin-refinery/prepare_scene.py`.
The script checks the archived input fingerprint before writing the two WebP variants.

The input is retained unchanged. The renderer rejects a materially non-16:9
image, and refuses to overwrite an existing final MP4. Use a new output directory
for an approved revision. Artifacts initially remain ignored and must be reviewed
by the release owner before copying into `public/`.

## Picture and time

- 1280×720, 24 fps, exactly 360 authored frames / 15 seconds, SDR Rec.709.
- A small uniform, cyclic camera transform belongs to the still-image layer.
  This is photomotion, not proof of a real drone or independent world movement.
- Persistent Arabic/English **illustrative / not live** badge.
- Conceptual asset links reveal and clear; a hypothetical coverage outline then
  reveals and clears. Both carry explicit conceptual/review labels. No numeric
  readings, confidence, camera IDs, live indicators, alarms, or operation claims.
- Geometry, text, and alpha are evaluated from absolute frame index. No timer,
  cumulative state, arbitrary random frame updates, or synthesized world objects.
- A seeded, original quiet ambient synth is non-diegetic, not a plant recording.
  It contains no voice or copyrighted recording. The website never autoplays; audio follows the existing preference only after intentional Play.

## Delivery and review

`refinery-illustrative.mp4` uses H.264/yuv420p + mono AAC with fast-start metadata.
The target is **at most 700,000 bytes**, measured rather than promised. A small
WebP poster, timestamped contact sheet, one-per-second decoded review frames,
source/timeline/style manifest, and technical verification JSON accompany it.

Check the actual encoded file for unwanted text/geometry, Arabic shaping,
readability at the intended inset size, motion and end/start continuity, audio
joins/level, stream duration and decode errors. A contact sheet does not prove
motion or audio quality; record which review was actually performed. The website
must retain a readable external illustrative-mode label on very small insets.

The source style/cues are in `config.json`; the source asset's actual provenance
and output measurements are in the generated `production.json`. No app runtime,
auth, provider, retrieval, security authority, or B/C code is changed by this work.
