# AGENTS.md — instructions for coding agents (Codex, Claude Code)

- Read `CLAUDE.md` and `SADEED_CONSTITUTION.md` first; they govern this repo and win on conflict.
- Use GitHub Spec Kit by default for features, bug fixes and idea assessment. Resume the active specification across Codex and Claude Code. For a small change use one acceptance criterion and a focused check. See [the project workflow](docs/operations/SPEC_KIT_AR.md).
- Work on a feature branch and open a pull request; never push concurrently to `main` or force-push. Why: two agents share one repo.
- Run `npm ci` then `npm run check` (types, lint, tests, build, secret scan, audit) before proposing a merge. Why: same gate as CI.
- Never commit secrets, `.env`, or production data exports. Why: the repo is the shared source of truth.
- Production database changes (migrations, DDL, data writes) require explicit owner approval. Why: owner decision 2026-10-13.
- New code must not add new runtime dependencies on Lovable services; select providers via environment variables. Why: decoupling plan in progress.
- The assistant transport forwards Stop into its existing deadline controller and cleans session timers/listeners; explicit provider 400/401/402/403 errors never trigger backup routing. Why: cancellation must be immediate and terminal failures must not create additional spend.

- Keep direct OpenAI as explicit opt-in on the existing chat route until real generation is verified; reuse auth and spend gates, never auto-switch the default on key presence. Why: preserve Gemini and avoid duplicating the assistant.

- Coordination between the Claude and Codex/GPT writers, and who may call the owner by phone, is in `docs/operations/AGENT_COORDINATION_AR.md`; `scripts/notify-owner-call.mjs` is not tied to any agent, but no call has been placed yet and its prerequisites (a telephony account and more than the env vars) are listed there; extending phone calls to a second agent is an owner decision. The former direct-to-main conflict is resolved by the owner's continuous-delivery directive below. Phone-call authority is unchanged.

## Permanent owner delivery policy — 2026-11-22

The owner's **SUPREME OWNER ENGINEERING DIRECTIVE** replaces older direct-to-main,
manual-only release, and Preview-only delivery instructions for future authorized
engineering tasks. This changes the delivery process, not constitutional safety,
protected assets, production-data permissions, provider spending, or human approval
of sensitive operational actions. Preserve other writers' work.

1. Discover and audit the actual repository/integrations; resume or create a Spec Kit
   specification. Prioritize measurable value and low risk; do not claim enterprise
   readiness or live integrations solely from code review or simulation.
2. Create an independent feature branch; implement maintainable changes and tests.
   Use existing engines and providers. Never represent synthetic events as real data.
3. Run TypeScript, full ESLint, Vitest, relevant integration/browser checks, the build,
   performance/contrast budgets, secret scan, and production-dependency audit. Fix
   regressions. Use isolated test databases; never aim write-testing RLS suites at
   production. Keep measured performance increases bounded and explicitly justified.
4. Obtain QA guardian clearance, fetch the current base, push the feature branch,
   and open a PR with actual evidence. Respect branch/environment protections.
   Automatically merge an authorized, low-risk PR only when all required checks
   succeed for its exact current head SHA and no unresolved review/blocker remains.
   Never merge failed, pending, cancelled, skipped-required, or stale checks.
5. Deploy the exact merged main SHA through the approved Vercel release controller:
   successful main CI, serialized release, staged Production build without domain
   assignment, verify the staged artifact, then promote that same artifact. Keep
   main Git auto-deployment disabled to prevent competing release paths.
6. Capture the last verified Production deployment ID/SHA before release. Verify
   both custom domains, build identity, new feature, login surface, and critical
   routes within the post-promotion verification window (90 seconds). Use the
   write-free `/api/public/live` probe. Health endpoints may write rate counters;
   chat/provider probes may incur cost and require their own authorized scope.
7. On failed staged verification, stop promotion. On failed promoted verification,
   restore the captured known-good deployment using artifact rollback; never
   force-push main or select an unverified deployment by list position.
8. Report feature/files/architecture, checks passed/failed/skipped, security and
   performance evidence, PR, merge SHA, Vercel status/Production URL, rollback
   readiness, limitations, and next priorities. Delivery without successful
   Production verification is **incomplete**; state the actual blocker.

Routine implementation, gated merge, deployment, and verification within an
authorized task do not require repeated owner approval. Missing permissions,
destructive database changes, high-risk security/authority changes, and material
business decisions still require the appropriate explicit approval. Secrets stay
server-side; never assume free API credit or enable paid model calls by key presence.
The executable release process and credential prerequisites are documented in
`docs/operations/CONTINUOUS_DELIVERY_AR.md`.

## Offline engineering handover

Resume from ENGINEERING_HANDOVER.md and TASK_STATE.json, checking live provider facts
before using any recorded release identity. The engineering SDK is development tooling:
`python3 .engineering/sdk/engineering_sdk.py verify` and selective `discover --query`.
Read .engineering/integration-manifest.json; local CLI/MCP verification does not prove
that a host has registered the MCP server. Never replace the existing release controller.
This continuation branch alone has Git Preview creation disabled to preserve the two
emergency attempts. All CI/review gates remain required; no extra deployment is authorized.


## OMEGA evidence and iteration discipline — 2026-11-22

Deliver small connected batches from an actual capability inventory and official-source
Innovation Gap Matrix; the first OMEGA slice selects capabilities 01/04/06 under its
Spec Kit specification. Keep the fifteen-capability roadmap explicit about working,
partial, demo and unavailable status; source existence or a simulated run is not live
operation. Reuse established engines/contracts and preserve hidden-route decisions.

The owner's ten OMEGA targets — Functional Reliability, AI Grounding Accuracy,
Cybersecurity, UX, Performance, Data Integrity, Architecture, Observability,
Operational Readiness, Innovation Differentiation — are targets, not achieved scores.
Record measured evidence, limits and missing facts; do not invent probabilities,
causal proof, comparative superiority, uniqueness or patentability. Hypothetical
controls do not grant operational authority. Existing safety, provider/data permissions,
quality budgets and the permanent delivery policy above remain unchanged.


Resume this OMEGA batch from [specification 003](specs/003-omega-decision-foundation/spec.md),
the [15-capability roadmap](docs/strategy/OMEGA_CAPABILITY_ROADMAP_2026-11-22.md), and the
[Innovation Gap Matrix](docs/audit/OMEGA_INNOVATION_GAP_MATRIX_2026-11-22.md). Committed
spec/tasks record the honest pre-commit checkpoint; observed post-commit release IDs
and receipts belong in the PR body and standalone delivery report, without predicting
SHAs or creating an extra source commit solely to record the first commit's receipt.
