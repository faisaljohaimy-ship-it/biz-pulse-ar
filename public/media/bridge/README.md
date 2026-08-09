# Bridge film media — generated output

This directory holds the SADEED Command-Bridge film assets produced by the
`scripts/generate-sadeed-*.mjs` pipeline:

- `audio/<scene>.<lang>.mp3` — ElevenLabs (Layan) narration per scene.
- `video/<scene>.mp4` and `bridge-final.mp4` — HeyGen or Remotion render.

Files are generated, not hand-authored. The UI (`BridgeFilmPlayer`) shows a
graceful empty state until `bridge-final.mp4` exists, then plays it with no
browser TTS on any path.
