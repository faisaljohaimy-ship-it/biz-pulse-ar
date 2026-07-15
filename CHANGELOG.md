# Changelog

All notable changes to NEXIOS AI OS.

## [1.3.0] — 2026-07-15

### Governed intelligence and live operations

- Replaced direct ARIA email/SMS execution with encrypted, tenant-scoped
  pending actions and an explicit one-use human approval surface.
- Added an idempotent outbound ledger, conservative unknown-state handling,
  cancellation, duplicate suppression, and verified Twilio/Resend delivery
  webhooks.
- Added a fail-closed PDPL release dimension covering controller identity, DPO,
  privacy channel, data region, DPA status, retention decisions, breach owner,
  and legal approval reference without inventing legal facts.
- Replaced simulated security KPIs with live tenant-scoped sources on protected
  security pages, the sovereign deck, and authenticated Executive Bridge
  scenes; unsupported sources remain explicitly labelled simulation.
- Upgraded confirmation and source-state surfaces with NEXIOS glass depth,
  living light, responsive Arabic layout, and reduced-motion fallbacks.
- Preserved the Hajj platform unchanged, as requested by the owner.

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
