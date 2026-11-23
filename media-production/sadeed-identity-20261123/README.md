# Prerecorded SADEED identity — AR / EN derivatives

Owner-authorized prerecorded product narration, separate from the SADEED assistant's runtime voice. This project changes no assistant/provider settings, quotas, authentication, database or canonical ElevenLabs voice. No voice clone is used.

## Inputs and provenance

- Reviewed scripts: `voiceover-ar.txt` and `voiceover-en.txt`. They describe designed capabilities where live operation is not established; see `storyboard.md`.
- HeyGen produced one continuous take per language, Arabic first and English after success. Public ACTIVE instant voices: **Fouad — Deep & Evocative** (native AR), **Ambrose — Calm & Scholarly** (native EN/GB). Natural requested speed 1.0, ISO language selected, timestamps requested, model omitted for server selection. No alternate take, purchase, upgrade, top-up or clone.
- The provider returned WAV and word/character alignment, without a selected-model field or charge receipt. Account add-ons were observed as 150 before/after; that does not prove zero charge or a remaining free quota. Exact requests/responses/URLs and original WAVs remain in ignored `.audit-tmp/identity-voice-20261123/`, outside the public runtime.
- `assets/narration-*.flac` are lossless source masters: their decoded PCM hashes match the original 44.1kHz/16-bit mono WAVs. Originals were not normalized or overwritten. FLAC AR: `d27485a6c7afebf4069e867bfc4e481e653d37e3d0bbddca989a62239eff24d4`; EN: `83171945722f0403d1e2b6fe11cbfff77359fa1b6a6c1c517d211638fc352c90`.
- Original identity source: `public/media/brand/sadeed-film-1608.mp4`, 26s, 1608×536, 30fps; SHA-256 `6abafc1f36f0d9e183a8562f37338e015f8ce8f0dc5dba5f12fc8b6346478fb1`. Original 56s twin source SHA-256 `01be7fc3c421429dc8c087be88e167aa66b606223256c54e6cabcfd5375b6ec3`. Both hashes are checked before/after production; originals remain unchanged.
- Picture is the original approved, scrubbed AI illustration, not footage from a real facility or evidence of operational feeds. No new stock, logos, people, live UI, measurements or data overlays were generated for the derivatives.

## Edit and clocks

The six paragraphs define `why`, `platform`, `sources`, `ai`, `clarity`, `decision`, with separate actual AR/EN clocks. Earlier intake aliases were `context`, `purpose`, `sources`, `ai-review`, `clarity`, `decision-trace`; indices and timing are unchanged. `alignment-*.json` preserves returned character/word receipts; joining character text matches the submitted scripts exactly.

`render.py` maps meaningful phrase anchors to source cuts. Each original motion window plays at 1×, then its final retained frame can become a deliberate quiet editorial still. Eight-frame crossfades provide gentle handoffs. These holds are explicit edit decisions around the narration, not a global 0.5× stretch or repeated full-film loop. Source and final frame ranges are stored in `scenes-*.json`.

The original 16.5–26s forge/logo sequence is retained as a continuous 1× closing section. Its end follows the accepted narration tail; no speech is shortened, stretched, accelerated, pitch-shifted or replaced. The audio clock stays sample-accurate. Picture length rounds upward to a 30fps frame boundary, so the final picture may outlast audio by less than one frame.

Sequence: 1344×448, native3:1 geometry,30fps, SDR Rec.709. The source is full-range `bt470bg` with unspecified transfer/primaries; it is decoded to RGB, with an explicitly documented sRGB working assumption, then converted to limited-range Rec.709 for delivery. There is no HDR transform or claim of calibrated source colorimetry.

## Audio ownership and mix

Only fresh narration and a separate original instrumental stem enter the derivative audio. The old mixed soundtrack is never used, ducked as a whole, or layered under new speech.

The new music arrangement reuses the repo's mathematically authored brand-score functions (`remotion/brand/score/compose.py`: `chord_pad`, `fm_bell`, `stereo`, `fades`, `bw`) and D-minor/B-flat/F/C/D-major palette with seed 20261123. It follows the actual semantic scene clocks; it is not a 26-second loop stretched to speech and contains no sampled or third-party recording.

Voice and final mix receive measured two-pass loudness/headroom treatment. Actual normalized speech RMS drives a separate music gain envelope: 60ms lookahead/attack, 700ms release, up to 4.5dB ducking. Music is balanced 22dB below speech in aggregate active-speech RMS. That is a measured aggregate balance, not a guarantee for every word or a listening verdict. Unprocessed, normalized, music, ducked and premaster stems remain separate in the ignored work directory. No automatic speaker or channel substitution occurs.

One AAC stereo track is muxed with each language's H.264/yuv420p MP4. The website selects only one language and starts audio only through its manual controls; that UI is owned separately. Public files contain no provider URLs or embedded service credentials.

## Captions and reproduction

`narration-*.vtt` and public `sadeed-identity-*.vtt` derive from actual character timing, preserving all submitted words. They are sidecars; captions are not also burned into the picture. This prevents duplicate text when the player enables its selected-language track. No evenly distributed word timing is used.

Requirements: Python 3.12, NumPy, SciPy, Pillow with RAQM, FFmpeg with libx264/AAC/FLAC/zscale, Noto Sans Arabic and DejaVu Sans system fonts. Source masters stay project-relative; the renderer makes no network or model call.

```sh
python media-production/sadeed-identity-20261123/render.py \
  --work .audit-tmp/identity-final-20261123 \
  --output public/media/identity
```

The renderer refuses existing final MP4 outputs; choose fresh work/output directories for an authorized reproduction. Its temporary decoded source cache is removed after success. The target for the two served videos combined is ≤6MiB; actual measured sizes, codecs, durations, hashes, edit decisions and encoded loudness are recorded in `production-manifest.json`.

## Review limits

Full technical decode, metadata, loudness and decoded visual samples are asset checks, not app tests. One focused visual review checks representative scenes, handoffs and the original closing. A contact sheet cannot establish normal-speed motion quality.

Audio listening and independent spoken-transcript review are unavailable here. Product-name pronunciation, pleasantness and audible caption fidelity are therefore not asserted. Provider alignment matches the submitted text structurally; it does not independently prove every word was spoken correctly. Final encoded true peak/loudness must be read from the manifest, not inferred from the source WAV peak.

No deployment, production verification, physical iPhone/Safari check or application test result is claimed by this media project.
