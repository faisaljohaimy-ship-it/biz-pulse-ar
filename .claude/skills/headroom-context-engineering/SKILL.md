---
name: headroom-context-engineering
description: Optimize selected tool JSON or logs with the pinned local Headroom SDK, preserve protected and short inputs, and verify original retrieval. Use for scoped context preparation, not provider routing or automatic chat interception.
---

Read the project's `AGENTS.md` and `CLAUDE.md`. At the reviewed Hub revision use
`docs/headroom-context-engineering.md` and `catalog/capabilities/headroom.json`;
in a registered product use `.engineering/headroom/README.md` and the full pin
and file hashes in `.engineering/capabilities.json`. Discovery or a
catalog row alone does not authorize an environment change or prove native host access.

1. Select only non-sensitive tool JSON or logs needed for the current task. Keep
   owner instructions, policies, credentials and code contracts out of compression.
   Use `--kind policy` or `--kind code` for explicit passthrough; preserve short
   inputs (below 1,024 bytes). Inputs are UTF-8 and at most 2 MiB. Do not rewrite
   project instructions, production data or provider settings.
2. Use a separately reviewed venv containing `headroom-ai==0.45.0`, upstream commit
   `ce0460cfa8598dc939243dbc7aec4b2d35f4e44a`. Invoke its Python directly; the worker
   uses the same interpreter with `-I`. The SDK is optional and never installed
   automatically into the Hub or product runtime.
3. Invoke the reviewed venv's Python with `tools/headroom_context.py status` at the
   Hub, or `.engineering/headroom/headroom_context.py status` inside a product,
   optionally with `--store PRIVATE_DIR`.
   Use an absolute private store outside Git. Keep original bytes, their SHA256,
   result metadata and retrieval records; an SDK cache with TTL is not a backup.
4. Run `optimize --input PATH --store PRIVATE_DIR --kind tool-json|log|code|policy`.
   Read its status/reason, SDK losslessness, original/output hashes, byte counts,
   network boundary and exact-versus-estimated token fields. A passthrough/fallback
   is a valid disclosed outcome, not measured compression or a missing dependency
   to install silently. System/user compression stays false; ML stays disabled.
5. Before any sensitive action based on optimized material, run
   `retrieve --store PRIVATE_DIR --id SHA256 --full` and verify the original SHA256.
   Use `--query TEXT` only for bounded navigation; it does not prove that omitted
   context is irrelevant. Recover the full original whenever exact context matters.
   Default context is at most 4,096 characters; query text is literal, 1–128
   characters with no controls. `--full` is bounded by the original 2 MiB limit.
6. Keep `HEADROOM_OFFLINE=1`, beacon/telemetry off, and task-local state paths. Do
   not start a proxy, run `wrap`/`mcp install`, change authentication/global host
   configuration or call a model. Unavailable network isolation must be disclosed.
7. Record actual source, interpreter/package version, tests, status and limitations.
   Byte reduction is not model-context utilization, exact token savings, answer
   fidelity or a billing result. Codex tool-session subprocess execution and native
   Codex/Claude MCP activation are separate evidence surfaces; the latter remains
   unverified. Preserve existing SDK, skills, motions and release gates.
