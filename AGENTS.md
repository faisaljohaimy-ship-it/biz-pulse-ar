# AGENTS.md — instructions for coding agents (Codex, Claude Code)

- Read `CLAUDE.md` and `SADEED_CONSTITUTION.md` first; they govern this repo and win on conflict.
- Work on a feature branch and open a pull request; never push concurrently to `main` or force-push. Why: two agents share one repo.
- Run `npm ci` then `npm run check` (types, lint, tests, build, secret scan, audit) before proposing a merge. Why: same gate as CI.
- Never commit secrets, `.env`, or production data exports. Why: the repo is the shared source of truth.
- Production database changes (migrations, DDL, data writes) require explicit owner approval. Why: owner decision 2026-10-13.
- New code must not add new runtime dependencies on Lovable services; select providers via environment variables. Why: decoupling plan in progress.
- The assistant transport forwards Stop into its existing deadline controller and cleans session timers/listeners; explicit provider 400/401/402/403 errors never trigger backup routing. Why: cancellation must be immediate and terminal failures must not create additional spend.

- Keep direct OpenAI as explicit opt-in on the existing chat route until real generation is verified; reuse auth and spend gates, never auto-switch the default on key presence. Why: preserve Gemini and avoid duplicating the assistant.

- Coordination between the Claude and Codex/GPT writers, and who may call the owner by phone, is in `docs/operations/AGENT_COORDINATION_AR.md`; `scripts/notify-owner-call.mjs` works for either agent once the four env vars are set in that agent's own environment. Note the unresolved conflict recorded there: this file says "open a pull request", `CLAUDE.md` says direct-to-`main` — `CLAUDE.md` wins until the owner decides. Why: Article 35, two writers share one branch.
