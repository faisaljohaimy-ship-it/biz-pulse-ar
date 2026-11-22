# Initial discovery and design decisions

- **Baseline**: The checked-out feature is `60b3f2f1a7f9d5b9325f88d6a195f41ac1a768ad`; the prior one-scenario center has local evidence and a verified Preview (recorded in feature 001). That evidence does not validate new code or Production.
- **Scenario catalog**: Extend the existing deterministic fixture/reducer rather than create a live incident service. Preserve unauthorized access and add at least two fictional cases; choose cases that can be explained without real identities or sensor data.
- **Accountability**: Responsible roles and due windows are synthetic. Local review never grants operational approval. Alternatives explain decision tradeoffs without executing the suggested actions.
- **Executive export**: Use an existing dependency-free client download mechanism; export a self-contained safe text/structured brief with language/source/limits. Do not call an external service or export production data.
- **Existing CI**: `.github/workflows/ci.yml` currently checks PRs and main, with a fuller scheduled/manual gate; its comments document an older CI/release separation. The new owner policy requires reconciliation, not an assumption that automation is already enforced.
- **Existing deployment**: `vercel.json` disables main Git deployment; `deploy-vercel.yml` is manual with target confirmation. Automatic merged-SHA delivery needs an explicit guarded path, exact target/identity checks, and credentials/capabilities confirmed by the primary agent.
- **Prior policies**: `CLAUDE.md` contains direct-to-main delivery; `AGENTS.md` records the prior conflict. Persist the new owner directive as the current delivery rule while retaining unrelated requirements. Do not amend the constitution or silently drop safeguards.
- **Reproduced resource defect — FINN input**: Initial code inspection found `request.text()` before existing rate/quota/deadline work, with character-count validation rather than received-byte limits. Reuse the established bounded body reader rather than invent another ingestion mechanism; preserve owner/auth/spend gates.
- **Reproduced resource defect — Task Bus**: A local in-memory probe reported a never-settling agent left dispatch pending beyond its 20ms task timeout and a 40ms parent abort, observed by a 100ms watchdog. Race logical completion against deadline/abort, reject preabort before starting, clean listeners/timers, and consume/ignore late results. This does not force-kill noncooperative work or confer tool authorization.
- **Readiness evidence**: Repository implementations/tests can prove code behavior locally. They cannot prove current live RLS/auth/provider configuration, production isolation, or provider reliability without real measured checks; list those gaps explicitly.

No user clarification blocks this bounded iteration. Service capabilities and final safety gates remain verification tasks, not assumed research results.

The new feature branch starts from `60b3f2f` and includes the prior unmerged decision-center work. A new PR supersedes #453 when ready; do not partially merge the earlier draft as a separate release.
