# Changelog

All notable changes to NEXIOS AI OS.

## [1.5.1] — 2026-07-16

### Free bilingual voices for every specialist agent

- Replaced the paid specialist speech API with the free Web Speech catalogue
  supplied by each user's browser and operating system. Agent narration no
  longer needs `OPENAI_API_KEY` or incurs application-level TTS usage charges.
- Assigned ten distinct Arabic/English voice personalities with preferred
  names, language tags, cadence, pitch, and deterministic same-language local
  fallbacks for iOS, Android, Windows, macOS, and other supporting browsers.
- Added correct asynchronous `voiceschanged` loading, safe system-default
  fallback, and sentence-aware chunking so long execution summaries continue
  reliably without clipping.
- Kept every call behind the shared audio arbiter: ungoverned browser speech is
  blocked, specialist speech cannot interrupt ARIA, and ARIA can safely preempt
  a specialist. ARIA remains exclusively on her ElevenLabs identity.
- Removed `/api/agents/tts` and its provider secret/deployment dependency, while
  retaining actual-result narration, persistent mute, and animated lip cadence.

## [1.5.0] — 2026-07-16

### Responsive command environment and working agent voices

- Added the supplied command-room artwork as the permanent home environment,
  with purpose-built mobile, tablet, and desktop WebP crops, responsive source
  selection, priority loading, readability lighting, and a seamless greeting-
  film crossfade instead of stretching one image across every display.
- Voice-enabled all eleven Digital Humans. ARIA keeps her canonical ElevenLabs
  identity, while the ten specialist agents use an authenticated, rate-limited,
  server-governed speech route with fixed per-agent voices and instructions.
- Connected agent speech to real work: manual and realtime runs announce their
  actual status and returned summary, preserve the underlying execution, expose
  a persistent mute control, and never narrate invented progress.
- Added a shared audio priority arbiter so specialist speech cannot overlap or
  interrupt ARIA, and prevented provider calls before a genuine browser gesture.
- Added contract coverage for all agents, voice ownership, audio priority,
  responsive image sources, endpoint authorization, and server-side voice
  locking. The Hajj platform remains outside this release and unchanged.

## [1.4.0] — 2026-07-16

### Attachment security, one ARIA, and release integrity

- Moved ARIA attachments through a service-role-only quarantine bucket before
  promotion, added real signature/MIME/extension validation, executable and
  active-content blocking, Office macro/path/decompression-bomb inspection,
  EICAR detection, content hashing, and a privacy-minimal scan ledger.
- Made upload rate limiting fail closed and added an optional enterprise
  malware-scanner contract whose timeout, malformed response, or outage blocks
  promotion rather than bypassing the security boundary.
- Consolidated authenticated speech on `/api/aria/tts`, reduced `/api/tts` to a
  method-preserving compatibility redirect, and removed the separate Digital
  Twin and legacy assistant conversation/voice runtimes. Historical assistant
  links, the former `/aria` console, and learning dialogs now open the single
  root-mounted ARIA surface; command-center voice state reads that runtime
  instead of animating a parallel simulated assistant.
- Made Cloudflare deployment callable only from the successful CI workflow
  after unit, type, lint, production audit, authenticated security E2E, build,
  and performance-budget gates. Missing E2E user credentials now fail CI.
- Added enforced ceilings for total output, JavaScript, CSS, and media assets so
  material bundle regressions block release.
- Kept the Hajj platform outside this release and unchanged.

## [1.3.0] — 2026-07-15

### Identity, open presentation, and production governance

- Introduced NEXIOS Identity System 4.0 across public, activation, window,
  sidebar, mobile-header, and ARIA surfaces with spatial glass, restrained
  living light, responsive depth, and reduced-motion equivalents.
- Moved credentials behind an open executive presentation and explicit
  transition acceptance. Visitors can assess the system without an account;
  protected routes and data still require real authentication and RLS.
- Replaced direct ARIA email/SMS execution with durable drafts, exact previews,
  content-bound ten-minute approval tokens, one-time atomic dispatch, encrypted
  payloads, masked recipients, and signed Twilio/Resend delivery webhooks.
- Added database retention enforcement for outbound encrypted content and
  delivery metadata, mandatory audit events, and a no-retry reconciliation
  state when a provider may already have accepted a message.
- Published the completed core-platform PDPL operating baseline: 30-day rights
  handling, incident workflow, retention schedule, residency/subprocessor
  activation gates, and official Saudi references. The Hajj platform remains
  outside this release and was not modified.
- Added a fail-closed PDPL readiness dimension covering controller identity,
  DPO/contact, residency, DPA register state, retention decisions, breach
  ownership, and legal approval without exposing their configured values.
- Connected the public executive deck, decision queue, ARIA recommendations,
  and the first two command-bridge chapters to tenant-scoped live KPIs after
  authentication; anonymous presentation values remain visibly labelled demo
  data.
- Replaced regional simulation fixtures on the protected operations room,
  sections, and circles pages with authenticated RLS-scoped database sources,
  while relabelling public marketing snapshots as demo data.

## [1.2.0] — 2026-07-15

### ARIA Executive Command Bridge

- Rebuilt the public Executive Command Bridge as a complete seven-chapter,
  Arabic-first board-room story spanning command pulse, governed decisions,
  regional operations, the ARIA agent council, the operational twin,
  sovereign trust, and a 90-day activation path.
- Added dedicated Arabic and English executive narration scripts for every
  chapter, synthesized through ARIA's canonical ElevenLabs identity only after
  an explicit user gesture.
- Unified chapter and full-tour playback behind the global ARIA audio arbiter,
  with real media progress, preemption safety, visible voice state, animated
  waveform feedback, and honest failure when the voice provider is unavailable.
- Restored the promised seven-scene contract, applied the exact four regional
  colors to the regional grid, strengthened simulation labels, and added unit
  coverage for story completeness and public TTS length limits.

## [1.1.0] — 2026-07-15

### Spatial windows and ARIA action channels

- Replaced the shared dialog, sheet, drawer, menu, popover, card, tooltip, and
  form primitives with one responsive glass-window language, animated light
  rails, clearer focus states, and reduced-motion fallbacks.
- Rebuilt ARIA's copilot surface with a spatial glass frame, an explicit voice,
  email, SMS, and file action rail, live tool-result cards, and a more visible
  multimodal upload path.
- Added role-gated email delivery through Outlook or Resend and SMS/MMS delivery
  through Twilio, with rate limits, provider-safe errors, idempotent email
  requests, and no automatic retry of side-effecting sends.
- Locked the modality contract: voice questions inside Conversation Mode receive
  ElevenLabs voice replies; keyboard questions receive streaming text only.
- Added idempotent creation of the private 25 MB `aria-attachments` bucket and
  unit coverage for messaging validation and reply-channel behavior.

## [1.0.4] — 2026-07-15

### Cinematic welcome film

- Replaced the global pre-system welcome with the supplied 64.62-second ARIA film.
- Added a self-hosted, fast-start H.264/AAC source and a matching WebP first-paint poster.
- Preserved sound recovery, mute, skip, reduced-motion entry, and responsive portrait framing.
- Raised the hard playback cap to 72 seconds and versioned the session guard so the new film is shown once to existing sessions.

## [1.0.3] — 2026-07-15

### Living regional icon edges

- Gave every command-centre artwork control a persistent edge in its assigned semantic colour.
- Added staggered breathing halos, perimeter light sweeps, inner blooms, and a high-energy press response.
- Strengthened the selected region as a continuously living pulse while retaining instant region-context updates.
- Applied the same colour-bound edge system to the sidebar region switcher and transparent 3D globe controls.
- Added static reduced-motion states so region identity remains clear without animation.

## [1.0.2] — 2026-07-15

### Executive presentation

- Replaced the remote narrator dependency with the supplied 46.85-second ARIA executive film.
- Added a web-optimized, fast-start H.264/AAC source, WebP poster, and bilingual chapter track.
- Re-timed all executive showcase surfaces to one canonical six-chapter media contract.
- Added cinematic framing, responsive portrait presentation, graceful media fallback, and accessible custom controls.

## [1.0.1] — 2026-07-15

### Closed

- Restored reproducible npm installation, strict CI gates, public/PWA assets, and production build.
- Re-enabled the authenticated route boundary and server-side bearer validation.
- Added executive role gates, fail-closed rate limits, lead abuse controls, and privacy-safe logging.
- Replaced vulnerable `xlsx` with the maintained `@e965/xlsx` alias; production audit is clean.
- Removed the deprecated unused HeyGen SDK and disabled paid token minting until LiveAvatar support exists.
- Added the interactive 44-control ARIA command-center artwork, exact regional colors, active-region glow, and transparent 3D region selector.
- Normalized integration status reporting, Power BI credential testing, role names, deployment docs, and GitHub workflows.

## [1.0.0] — 2026-06-30

### Production Readiness Certification

- **Security**: 0 active findings across 4 scanners (Supabase, supabase_lov, connector, supply chain).
- **Type safety**: `tsc --noEmit` passes with 0 errors across the full codebase.
- **Code hygiene**: 0 TODO/FIXME/HACK markers in shipped source.
- **Runtime**: Workflow engine, agent runtime, tool registry, RAG, memory, and pulse subsystems verified against live production tables.

### Added

- Industrial Security Knowledge Repository (`sec_knowledge_*`) with HNSW vector search.
- Living Executive Narrator + Digital Humans platform (R3F fallback).
- Multi-tenant org isolation across 50+ tables with RESTRICTIVE RLS.
- Public API surface: `/api/public/health`, `/api/public/version`, `/api/public/hooks/run-agent`.
- ElevenLabs TTS/STT for ARIA + executive agent voices.
- Emergency Response Framework skill + Industrial Security Policy (IS-001 to IS-012).
- Tool Runner v2 with schema-driven validation and payload previews.
- Charter v10.0 enforcement: zero fabrication, every claim runtime-backed.

### Hardened

- `sec_visitors` / `sec_vehicles` / `sec_contractors` PII restricted to creator/admin.
- `audit_logs` actor spoofing closed by enforcing `actor_id = auth.uid()`.
- `cost_budgets` writes restricted to organization admins.
- `user_roles` admin self-grant blocked by SECURITY DEFINER policy.
- HeyGen streaming dependency isolated behind provider abstraction (graceful fallback on HTTP 410).

### Accessibility

- aria-label added to all icon-only buttons in JsonSchemaForm, executive-reports, binary-reports-panel.
- Bilingual aria-labels (AR/EN) on AriaDock transport controls.

### Release Hardening

- Production simulation controls are development-gated and absent from production UI.
- Public metadata, sitemap, OpenRouter referer, and email preview URLs point to the canonical NEXIOS domain.
- HeyGen LiveAvatar remains isolated behind a provider abstraction; the production R3F/SVG digital human fallback is fully operational when vendor credentials are absent.

## [0.9.0-RC] — 2026-06

- Initial release candidate with full Executive Theater, Run Agent forensic chain (10/10), and bilingual i18n.
