---
name: engineering-sdk
description: Discover pinned engineering capabilities and verify offline integrity and deployment identity before project releases.
---

Read the project's AGENTS.md and CLAUDE.md first. Use the vendored SDK, never fetch
or execute the public hub's current branch during a product build.

1. Run `python3 .engineering/sdk/engineering_sdk.py discover --query <task>`.
2. Read only relevant reviewed skills and capability records. Candidate, adapter-only
   and environment-specific status is not installation, authorization or runtime proof.
3. Run `python3 .engineering/sdk/engineering_sdk.py verify`. This proves local checksum
   integrity only. Upstream provenance is verified by `hub.py verify --strict` during
   a reviewed dependency update, independently of production builds.
4. Before a release, run `target` with the exact repository, team, Vercel project and
   tested commit, then `release` with captured provider receipts. Require all mandatory
   checks and exact-head review; stage Production without domains, smoke it, promote
   that same artifact, smoke Production, and use the captured rollback on failure.
5. Keep the complete engineering registry and migration receipts private. Do not copy
   customer source, private project inventory, provider config dumps or secrets here.

MCP: opt into the local read-only server with the command
`python3 .engineering/sdk/engineering_sdk.py mcp --project /absolute/project/path`.
Do not overwrite existing MCP configuration. It exposes catalog and integrity checks,
not deployment or provider calls. Confirm real Codex/Claude discovery in each host;
copied files alone do not prove the agent has invoked the capability.

Updates arrive as reviewed PRs with immutable hub SHA, file checksums, tests and
zero-additional-cost evidence. Never auto-merge new tools or enable paid resources.
