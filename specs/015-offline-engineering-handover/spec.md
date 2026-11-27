# Recover the existing offline engineering SDK and durable handover

Resume PR464 without rewriting its author's history. Keep the dependency/WebKit recovery
already merged in PR465 and the staged f3f847ad artifact. No application feature,
dependency, database, provider, voice, media or visual engine changes belong to this batch.

Acceptance:
1. Hub12f067d is a merged immutable revision. All13 registered file checksums pass strict
   upstream verification; the SDK verifies locally without the hub or network at runtime.
2. Selective CLI discovery and stdio MCP work. Only discovery/integrity tools are exposed;
   deploy requests and corrupted vendored bytes fail closed. No automatic tool installation.
3. Project identity matches independently read official Vercel repo/team/project/main facts.
   Identity verification is not release approval. Exact-head CI and staged verification remain required.
4. Preserve main's existing deployment setting and disable Git Preview only on this named
   continuation branch, using Vercel's documented git.deploymentEnabled exact-branch rule.
   This conserves the approved cycle's emergency reserve while allowing source review and CI.
   Update the existing exact configuration contract to require precisely these two false
   entries; reject additional rules/wildcards and preserve all existing security/build assertions.
5. Durable handover identifies source, stage, live baseline and unverified items without
   credentials or customer data. Hub remains independent of production availability.
6. Run normal npm ci, npm run check, strict Hub verification, SDK integration checks and
   QA guardian review before commit/push. No real Apple Safari, paid-model or production
   data-security certification is inferred from these checks.

Do not merge this new branch while f3f847ad is awaiting release verification. It would
invalidate the exact-main gate. After that release, obtain a bounded new deployment
cycle before creating any SDK Preview/Production build. Preserve PR464 as provenance.
