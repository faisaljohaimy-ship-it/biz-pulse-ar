# SADEED engineering handover — checkpoint2026-11-27

This repository is public. This file is a public-safe resume index, not a private
operations archive. Keep detailed security findings, provider dumps, credentials,
customer data and local recovery inventories in authorized restricted audit storage.

Resume this branch and specs/015-offline-engineering-handover/spec.md. Do not replace
or recreate the application or mass-merge archived PRs. The mandatory production build
still runs as part of npm run check. Source baseline f3f847ad11147a15823da8ab59f19a149e470081
already includes dependency and WebKit recovery (PR465). SDK work from PR464 was
merged locally into codex/engineering-handover-20261127, retaining both histories.

Latest observed Claude PR461 at44ea372f293c76c9dbe6af7847d3a42aa0f271a4 contains
three onboarding commits/three files. It was superseded by main's verified registration;
do not reintroduce its older declaration-only pin. This is not a claim that all of
Claude's unavailable local sessions were saved. Existing original worktrees, stash and
Git bundles remain recovery sources; never drop them as cleanup.

SDK1.0.0 is pinned to merged Hub12f067d42c2bcad4256e3aa130503044af16e5b3. Only local
discovery/integrity are exposed through stdio MCP. It does not install catalog tools,
call providers, deploy, or replace scripts/cd-gate.mjs. Hub is not a production runtime
dependency. Preserve existing .codex/config.toml and register MCP separately per host.

Historical release checkpoint: f3f847ad Production artifact dpl_73AD3tePkoZ3sBrad5A2VkF5F9Cg
is READY but not functionally verified or promoted. Known-good live baseline remains
dpl_12FbSBiXioP2QPwun5EctQB8Yooa /0361a1c55b3cf9cadea84a4913b7764b9c3ccd56 on both
neexios.com and www.neexios.com. Re-read provider evidence before trusting these facts.
The approved cycle start2026-11-27T22:10:00.000Z has total4, spent2, reserve2. Do not
consume the reserve on an ordinary SDK build. The named continuation branch disables
Git Preview creation through documented per-branch configuration; CI remains enabled.

Finish protected verification and the pending f3 release before merging this SDK batch;
changing main would invalidate the pending release's exact-main guard. A new bounded
cycle is required for a later SDK deployment. Record new source SHA/CI/artifact receipts
outside this pre-commit checkpoint, rather than predicting this document's own commit.

Digital Twin remains Partial and what-if remains Demo; live autonomous agents, Apple
Safari, paid-provider generation and production database cleanliness are not certified.
No production DB/RLS, voice, protected Vite configuration or media bytes changed here.
