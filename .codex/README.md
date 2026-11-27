# Shared engineering handover

Read AGENTS.md, ENGINEERING_HANDOVER.md and the selectively loaded skills under
.agents/skills/. The SDK also supplies the same reviewed skills to .claude/skills/.
Run `python3 .engineering/sdk/engineering_sdk.py discover --query <task>` and `verify`.
Local stdio MCP is opt-in; this batch does not overwrite config.toml, add credentials,
register remote servers or enable paid tools. CLI success is not host registration proof.
