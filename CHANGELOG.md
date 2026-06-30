# Changelog

All notable changes to NEXIOS AI OS.

## [1.0.0] — 2026-06-30

### Production Readiness Certification
- **Security**: 0 active findings across 4 scanners (Supabase, supabase_lov, connector, supply chain).
- **Type safety**: `tsgo --noEmit` passes with 0 errors across the full codebase.
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
