# NEXIOS AI OS — v1.5.1 Free Specialist Voices

**Release date:** 2026-07-16  
**Runtime target:** Cloudflare Workers + Supabase

Version 1.5.1 removes the paid specialist TTS route. All ten specialist agents
now speak through voices already exposed by the user's browser and operating
system, with no agent voice API key or application-level synthesis charge.
Each role has a curated bilingual personality: preferred Arabic and English
voice names, BCP-47 language, cadence, pitch, and a deterministic local fallback
when a preferred name is unavailable. The runtime waits for asynchronously
loaded voice catalogues and splits long summaries at natural sentence boundaries
to avoid clipping.

Browser speech remains locked behind the NEXIOS audio arbiter rather than being
globally available to arbitrary components. A specialist cannot interrupt ARIA;
ARIA can preempt any specialist, direct ungoverned calls are blocked, and the
first audible turn still requires a real user gesture. ARIA remains exclusively
on her canonical ElevenLabs voice.

## Retained v1.5 responsive environment and working narration

Version 1.5 installs the supplied command-room artwork as the permanent home
environment. Rather than stretching the square source, the release ships three
optimized WebP compositions for mobile, tablet, and desktop, selected by the
browser with stable focal points, priority loading, cinematic readability
layers, and a seamless crossfade when the one-time greeting film plays.

All eleven Digital Humans are voice-capable in addition to their existing work.
Agent runs narrate their actual completion state and returned summary, including
realtime completions; they do not replace execution or fabricate activity. A
shared audio arbiter prevents overlap and ensures specialist speech cannot
interrupt ARIA. Audio waits for a real browser gesture, and users have a
persistent mute control.

## Retained v1.4 security and release integrity

Version 1.4 closes three production-grade boundaries. ARIA file uploads now
enter a service-role-only quarantine space, undergo server-side signature,
extension, active-content, Office archive, macro, traversal, expansion-ratio,
and known test-signature inspection, and are promoted only after approval. The
rate-limit dependency fails closed. An optional enterprise malware scanner can
be configured with `ARIA_FILE_SCAN_URL`; once configured, any scanner timeout
or invalid response also fails closed. The audit ledger stores only hashes,
verdicts, and technical metadata—not file contents or raw filenames.

ARIA now has one authenticated TTS endpoint, one root-mounted interface, one
conversation owner, and one voice owner. The former `/api/tts` endpoint is only
a permanent compatibility redirect. The duplicate Digital Twin dock and the
legacy assistant conversation runtime no longer mount; historical assistant
URLs, the former `/aria` console, and lesson conversations open the canonical
ARIA surface instead. Integration status pages are read-only health probes and
cannot mint a parallel conversation token.

Cloudflare deployment is no longer an independent push workflow. It can run
only as the reusable final job of CI after lint, TypeScript, unit tests,
production dependency audit, a real authenticated security E2E leg, production
build, and enforced asset budgets all pass. The Hajj platform remains outside
this release and was not modified.

## Retained v1.3 identity and governance foundation

NEXIOS now opens as a premium evaluation journey: the executive presentation is
available without credentials, and the email/password or Google controls do not
exist in the rendered interface until the visitor explicitly accepts the
transition to secure activation. Acceptance is a presentation checkpoint only;
every protected route still requires Supabase authentication, role checks, and
tenant-scoped RLS.

Identity System 4.0 introduces an obsidian/cyan/emerald/gold spatial language,
living but restrained auroras, precision grids, glass edge-light, stronger
focus states, and coherent sidebar/mobile/ARIA surfaces. All motion has a
static reduced-motion counterpart and the access gate suppresses unrelated
global overlays so the presentation remains visually focused.

ARIA email and SMS are no longer direct side effects. An administrator or
manager creates an encrypted durable draft, sees the exact recipient and
content, checks an explicit acknowledgement, and consumes a content-bound
ten-minute approval token. The database transition permits one dispatcher;
provider calls are never automatically retried. Signed Twilio and Resend
webhooks reconcile delivered/failed states, while retention controls purge
encrypted content after 30 days and metadata after 24 months.

The core-platform PDPL baseline now contains no placeholder fields. It defines
contractual party identity, residency and transfer activation gates, a 30-day
rights workflow, breach response, subprocessors, retention and disposal, and
official Saudi references. A seventh, fail-closed PDPL dimension now prevents
the internal readiness report from declaring a release candidate until the
actual controller, DPO, residency, DPA, retention, breach-owner, and legal
approval facts are configured. Their values are never exposed in the report.
The Hajj platform is explicitly outside this release and its code and data were
not changed.

Executive surfaces outside Hajj use one truthful source selector. Authenticated
users receive only their organisation's live RLS-scoped KPIs; anonymous visitors
receive clearly labelled simulation values. This applies to the sovereign
command deck, decision queue, ARIA daily recommendations, and the first two
Executive Command Bridge chapters. The protected operations room, sections,
and circles screens now also read their tenant-scoped Supabase records instead
of regional demo fixtures. Public marketing cards are explicitly labelled demo
and no longer poll a fixed snapshot as if it were live.

## Retained command-bridge and multimodal capabilities

The Executive Command Bridge remains a complete seven-chapter, Arabic-first
board-room experience. It moves from the enterprise command pulse through the
governed decision engine, four-color regional grid, ARIA agent council,
operational twin, sovereign trust architecture, and a concrete 90-day
activation path. Any chapter that still uses simulated operational values is
explicitly labelled.

Each chapter has a purpose-written Arabic and English executive script delivered
through ARIA's canonical ElevenLabs voice after an explicit user gesture. The
tour uses the global ARIA audio arbiter, real playback progress, safe
preemption, a living waveform, bilingual voice state, and an honest setup error
instead of substituting a robotic browser voice or silently advancing.

The unified spatial-window system remains the visual foundation. Dialogs,
sheets, drawers, menus, tooltips, cards, and form controls share responsive
executive glass, precise focus states, subtle living light, and static
reduced-motion fallbacks. The design is CSS-native and adds no animation runtime
to the JavaScript bundle.

ARIA exposes voice, governed email/SMS, and file channels directly in the
copilot. Real delivery activates only after the provider, approval secret, and
signed delivery callback are configured.

The reply contract is explicit and covered by tests: a voice question captured
inside Conversation Mode receives ARIA's ElevenLabs voice response and reopens
the microphone, while a keyboard question streams text without surprise audio.
Images, video, audio, PDFs, office documents, and text files can be attached from
the same composer. A migration now creates the private 25 MB attachment bucket
idempotently on fresh deployments.

The single global pre-system welcome now plays the supplied 64.62-second ARIA
film. It is self-hosted as a fast-start H.264/AAC asset with a matching WebP
poster, responsive portrait framing, a cinematic blurred backdrop, sound
recovery, mute and skip controls, and a reduced-motion entry path. Its measured
72-second safety cap allows the full greeting and exit fade to complete, while
the versioned session guard presents the new film once per browser session.

The supplied ARIA film is now the canonical executive-presentation media on the
showcase, guided demo, and standalone player. It is self-hosted, optimized for
progressive web playback, paired with a poster and bilingual chapters, and
synchronized to the six presentation scenes. The UI keeps sound behind an
explicit user gesture and provides cinematic framing, progress, seeking,
pause/replay, mute, and a non-blank error fallback.

Every command-centre icon now carries a live edge in its own sector or region
colour. The selected region breathes with a stronger multi-layer halo, a light
sweep travels around the perimeter, and pointer or keyboard activation produces
an immediate bloom before navigation. Region switcher and 3D globe controls use
the same visual language, with a non-animated but fully coloured fallback for
users who prefer reduced motion.

The requested executive artwork is preserved with 44 active controls. Central,
western, eastern, and southern controls use `#3B82F6`, `#22D3EE`, `#22C55E`,
and `#F59E0B` respectively. Selecting a region updates the operating context,
the active icon edges, and the transparent pulsing 3D selector mounted at the
top-left of the application workspace.

The source archive is verified through lint, TypeScript, Vitest, the production
Cloudflare build, and the production npm advisory audit. Production deployment
remains an operator action because credentials, the target database, migrations,
and live-send verification evidence are not contained in source control.
