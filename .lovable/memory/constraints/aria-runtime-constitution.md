---
name: ARIA Runtime Constitution
description: Speed + self-learning + self-healing invariants (INVARIANT-9..12) for the chat pipeline, learning pipeline, and incident ledger. Full text in docs/ARIA_INTRO_CONSTITUTION.md.
type: constraint
---

Governs: `src/routes/api/chat.ts`, `src/components/aria-core/AriaCopilot.tsx`,
`src/lib/aria/learning/*`, `src/lib/aria/self-healing/*`, and DB tables
`aria_interactions`, `aria_learned_patterns`, `aria_incidents`.

**INVARIANT-9 — Measure every reply.** Every completed assistant turn for
an authenticated user is persisted into `aria_interactions` with
`latency_ms`, `first_token_ms`, `model`, `device_class`. No learning
without measurement.

**INVARIANT-10 — Safe injection.** No learned pattern is injected into
system prompt unless `safety_passed = true`, `confidence ≥ 0.7`, AND
`hits ≥ 3`. Enforced in SQL — never relax client-side.

**INVARIANT-11 — Renewal.** Patterns unseen for 30 days are pruned; every
7 days confidence is recomputed. Self-healing watchdog writes to
`aria_incidents` on every fallback (model switch, TTS failure, timeout,
rate-limit).

**INVARIANT-12 — Zero-latency baseline** on mobile / tablet / desktop:
1. `service_tier: "priority"` on every gpt-5 family model that supports Fast mode.
2. AudioContext primed on dock open, before first keystroke.
3. TLS preconnect to gateway + ElevenLabs on dock open.
4. First-sentence TTS threshold ≥8 chars (not 12).
5. Composer refocuses after every send.
6. `abortSignal: request.signal` wired into `streamText`.

**Why:** ARIA is the executive AI face of NEXUS AI OS. Every ms of latency
degrades executive trust; every uncalibrated instinct risks propagating a
bad answer forever. Measuring on every turn, gating injection behind
safety+confidence+hits, and renewing weekly turns ARIA into a self-
improving agent WITHOUT introducing drift.

**How to apply:** Before editing any file under jurisdiction, cite this
constraint in commit rationale and confirm INVARIANT-9..12 still hold.
Self-evolution engine auto-rejects proposals that don't cite it.
