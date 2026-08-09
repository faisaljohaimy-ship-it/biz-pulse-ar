# Bridge film — SADEED narration (Remotion fallback)

`index.tsx` composites the seven Executive-Command-Bridge scene cards with the
SADEED **Layan** narration MP3s into `public/media/bridge/bridge-final.mp4` — the
complete fallback when HeyGen is not configured. No avatar service, no browser
TTS, no substitute voice.

This sub-project has its own Bun `package.json` (Remotion already declared as a
dependency); it is **not** part of the app bundle and is excluded from the app
`tsconfig`/`eslint`.

## Run order

```bash
# 1) Narration audio (Layan) — key from env only, never committed
export ELEVENLABS_API_KEY=...
node scripts/generate-sadeed-audio.mjs            # → public/media/bridge/audio/*.mp3

# 2) Render the film (Remotion resolves assets from the app's public/ dir)
cd remotion && bun install
ELEVENLABS_LANG=ar bunx remotion render index.tsx BridgeFilm \
  ../public/media/bridge/bridge-final.mp4 \
  --public-dir=../public --codec=h264
```

The audio clips are the timing authority. Each scene's `seconds` in `index.tsx`
is an estimate; for tight sync, set them to the real clip lengths (or wire
`@remotion/media-utils` `getAudioDurationInSeconds`, already available via the
Remotion deps here).

Set `ELEVENLABS_LANG=en` to render the English cut against the `.en.mp3` clips.
