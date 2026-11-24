# Canonical voice recovery — 2026-11-24

The requested script is retained in `media-production/twin-narration-20261124/scenes.json`
and the AR/EN transcript files, with selective Arabic diacritics and a reproducible
voice-only 1.25x renderer. No narrated output exists and readiness remains blocked.

## Observed sources

- The chatbot calls `/api/sadeed/tts`, falling back to `/api/public/sadeed-tts`.
  Both deployed route implementations lock SADEED to ElevenLabs voice
  `izhopdR43PRI5gAmjXTj` and `eleven_multilingual_v2`; the normal source recording
  setting is speed0.9. The requested1.25x is a separate pitch-preserving effect on
  recorded speech only, not a change to the live assistant or picture cadence.
- `.claude/skills/nexios-aria/SKILL.md` and
  `docs/sadeed/welcome-voice/GENERATE.md` identify the same voice and require either
  the existing ElevenLabs connection or the server-side API credential.
- The authorized first AR scene request to the current public route returned
  HTTP502 `tts_failed`; no audio stem was received. Non-decrypted Vercel metadata
  listed no `ELEVENLABS_API_KEY` and no hidden Production variables. No credential
  values were printed or retrieved.
- The connected alternate engine rejected the exact configured voice with
  HTTP400 `Voice not found`. The Runway connection repeatedly returned an
  authentication-retry notice; no Runway speech task was submitted. Plugin
  discovery for ElevenLabs returned no result in the selected account.
- The full historical checkout retains removed `remotion/public/audio/*` and
  `public/aria-greeting-voice.mp3` Git objects. Their last media revisions were
  July9–14, before the July22 canonical-voice change (`5dfeff7d`). The historical
  voice config used `gVzwmdZzRgBrNjXaTmi5`, a different identity. Old marketing
  transcripts also contain retired names and unsupported performance claims;
  they are not relabeled or spliced into this narration.
- Current identity narration FLACs record different approved prerecorded voices
  (Fouad/Ambrose), not proof of the requested canonical chatbot voice. The retired
  welcome film is preserved, but supplies neither these new words nor verified
  bilingual canonical narration stems.

The repository's `.claude` files were inspected. A separate Claude Code machine
or account-local unshared files are not present in this selected workspace.

## Remaining dependency

A working connection to the configured voice, or a secure credential binding, is
needed to synthesize the new script. Do not turn another stock/sound-alike voice,
an old greeting or an ungenerated URL into a successful narration claim. Once
available, generate the bounded scene stems, run the retained renderer, inspect
actual duration/audio/VTT/decoded picture, update verified asset profiles and
publish the resulting files. Current UI preserves the original films and exposes
the bilingual script with an explicit audio-not-ready notice.
