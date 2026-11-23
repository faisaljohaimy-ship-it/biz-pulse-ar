# Actual derivative delivery — 2026-11-23

| Export | Video | Audio | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `public/media/identity/sadeed-identity-ar.mp4` | 1344×448, 30fps, 2,142 frames, 71.400s | One stereo AAC track, 48kHz, 71.381s | 2,826,849 | `66d9e52f3a825e2fc11a322153f1a94dfdf100d38c470651f18c9329e6778291` |
| `public/media/identity/sadeed-identity-en.mp4` | 1344×448, 30fps, 2,087 frames, 69.566667s | One stereo AAC track, 48kHz, 69.555s | 2,782,554 | `75291993a66ca91251fd89be7f49bfd383bfc25ca728bf356591cfcc43f5a893` |

Combined served video: **5,609,403 bytes / 5.35MiB**, below the 6MiB production target. Both are H.264/yuv420p SDR Rec.709 MP4 with fast-start (`moov` before `mdat`). Complete video/audio decoding passed without errors. Picture rounding adds less than one 30fps frame beyond the accepted audio clock; no narration retiming or forced runtime was used.

Encoded loudness measured on the complete MP4 audio:

| Language | Integrated | True peak | LRA | Measured active-speech / music aggregate RMS difference |
| --- | ---: | ---: | ---: | ---: |
| AR | −16.03 LUFS | −3.08 dBTP | 2.30 LU | 22.0000 dB |
| EN | −16.02 LUFS | −4.03 dBTP | 2.50 LU | 22.0000 dB |

The two inputs are newly accepted narration and a separately recomposed original mathematical score. The old mixed audio is excluded. Separate stems remain in `.audit-tmp/identity-final-20261123/`. The original source WAVs remain unchanged in `.audit-tmp/identity-voice-20261123/`, with lossless FLAC source masters retained in this directory. Neither assistant TTS nor provider settings were changed.

## Timing and captions

Six shared IDs: `why`, `platform`, `sources`, `ai`, `clarity`, `decision`.

- AR scene boundaries: 0 /11.011 /24.679 /34.854 /47.983 /59.134 /71.381179 seconds.
- EN scene boundaries: 0 /10.231 /24.625 /33.702 /46.989 /57.164 /69.554717 seconds.

`scenes-*.json` includes the actual provider paragraph alignment and 18 editorial source windows per language. Meaningful phrase anchors determine cuts; each motion window remains 1×, with explicit quiet still holds and 8-frame crossfades. The original 16.5–26s forge/logo closing remains continuous 1×. Source identity/twin SHA-256 checks passed before and after rendering.

The public VTT sidecars preserve all submitted words and actual provider character timing. AR: 12 cues, maximum 13.27 characters/s, shortest 2.311s. EN: 16 cues, maximum 19.58 characters/s, shortest 1.277s. Both have at most two lines. No cue exceeded the editorial 20 characters/s or fell below 0.8s warning thresholds. These diagnostics do not prove spoken fidelity, platform accessibility or pleasant delivery.

## One focused visual review

Inspected the decoded AR/EN scene contact sheets plus representative AR crossfades and the forge/name/closing sequence. No unintended real-data text, framing distortion, badge-shaping issue or logo obstruction was observed in those inspected frames. Source/mapping are shared, while each language has its own measured scene clock. Independent QA also reviewed the source and both scene contact sheets without running app tests or providers.

QA artifacts remain ignored:

- `.audit-tmp/identity-final-20261123/contact-ar.jpg`
- `.audit-tmp/identity-final-20261123/contact-en.jpg`
- `.audit-tmp/identity-final-20261123/handoffs.jpg`
- `.audit-tmp/identity-final-20261123/encode-{ar,en}.log`

No visual correction/rerender was needed after this focused inspection. Small video badges become tiny in phone-sized 3:1 players; the surrounding UI must keep an externally readable illustrative-mode label. Existing `public/home/brand/sadeed-banner-clean-{800,1200,1600,2172}.webp` assets can provide the poster without another served image copy.

## Explicit limitations

No full normal-speed playback or audio listening review was performed here. Pronunciation, pleasantness, missing/repeated spoken words and audible caption fidelity remain unverified. The retained provider alignment joins exactly to the approved submitted text; this is not an independent transcript of the sound. No claim of live operational imagery, measured product latency, AI accuracy, deployment or application test result is made.

`production-manifest.json` contains the actual probes, hashes, encode commands, mix settings and technical checks. `narration-provenance.json` records the voice/input/lossless-source facts. Publication and UI integration belong to the release owner.
