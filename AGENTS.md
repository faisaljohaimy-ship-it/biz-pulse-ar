# AGENTS.md — instructions for coding agents (Codex, Claude Code)

- Read `CLAUDE.md` and `SADEED_CONSTITUTION.md` first; they govern this repo and win on conflict.
- Work on a feature branch and open a pull request; never push concurrently to `main` or force-push. Why: two agents share one repo.
- Run `npm ci` then `npm run check` (types, lint, tests, build, secret scan, audit) before proposing a merge. Why: same gate as CI.
- Never commit secrets, `.env`, or production data exports. Why: the repo is the shared source of truth.
- Production database changes (migrations, DDL, data writes) require explicit owner approval. Why: owner decision 2026-10-13.
- New code must not add new runtime dependencies on Lovable services; select providers via environment variables. Why: decoupling plan in progress.
