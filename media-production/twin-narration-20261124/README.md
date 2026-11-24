# Bilingual digital-twin narration — 2026-11-24

The owner's follow-up requests the existing digital-twin film with SADEED's
voice, a **1.25× voice-only speed effect**, Arabic with selective pronunciation
marks, and English. `scenes.json` is the exact approved production script and
five scene windows. It does not change the live assistant's voice or provider.
`transcript-ar.txt` and `transcript-en.txt` contain that authored script, **not
an independently transcribed or listened-to recording**. `readiness.json`
records the blocked audio state separately from the completed script.

The source film remains illustrative, prerecorded material rather than a live
feed, a verified engineering model, or evidence of connected operational data.
Its original media files are retained unchanged.

## Reproduce after recording the voice

The root production owner generates and verifies the real recordings through
the existing authorized SADEED voice route. This local renderer makes **no
network or provider call**. Each recording must exist at
`stems/s1-ar.mp3` through `stems/s5-ar.mp3`, and the corresponding `-en.mp3`
files. Do not substitute another narrator or relabel old identity-film voices.

```sh
python media-production/twin-narration-20261124/render.py
```

The renderer copies the existing 640×360 picture stream without another lossy
encode and preserves its 56-second / 1680-frame clock,
applies `atempo=1.25` once to recorded speech, measures every prepared stem and
rejects an overrun rather than accelerating, truncating or hiding it. The
1.25× factor is relative to the recorded canonical voice; the endpoint's source
voice setting is separately recorded in the manifest. There is no global movie
playback-rate change.

The original score is reduced during each phrase, with a short anticipatory
fade and recovery. The mix is normalized in two passes, then its encoded
loudness and true peak are measured. Both language exports are fully decoded.

VTT cues use the complete approved scene phrases and measured audio onsets and
tails. They are **scene-level cues**, with no invented word timings or karaoke.
They do not independently verify what the provider pronounced. Complete text
transcripts, source/output fingerprints, actual timing, media probes and
encoded loudness go into `production-manifest.json` after a successful export.
Listening review is recorded honestly; source metadata does not prove audible
pronunciation or caption fidelity.

`work/` holds disposable local intermediates and is ignored. The immutable
recordings, script, renderer, resulting subtitles and manifest retain the
reproduction path. Only final MP4/VTT assets belong under
`public/media/twin/narrated/`.

## Current production checkpoint

No narrated export has been produced yet. The first authorized Arabic
recording request returned HTTP 502 with `tts_failed`, and no stem exists.
This is an observed application-route failure; its provider-level cause is not
established here. The script and renderer must not be described as delivered
voice audio until real recordings and checked exports exist.

The confirmed served profile is the retained 640×360 stream: its picture-only
copy measures 1,524,396 bytes / 56 seconds. A pair of 96 kbps narrated exports
at that tier would use roughly 4.4 MB and fit the current allowance. Actual
export sizes must still pass the unchanged production budget. No budget has
been raised.
