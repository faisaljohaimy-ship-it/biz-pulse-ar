# Archived batch release recovery — 2026-11-23

## Acceptance and plan

Resume PR456/specs004–008, reconcile current main without rewriting history, preserve
latest Arabic media bytes and both original films, repair the stale copy assertion,
then satisfy automatic exact-head PR gates, merge the expected head, satisfy exact-main
push CI and stage/promote the same verified Production artifact. Do not run optional
test suites, manually dispatch CI or weaken any protection/budget. No DB write,
provider activation, paid-AI probe or operational action is part of this release.

## Verified starting evidence

- PR453 closed/unmerged; merged454 then455 are historical releases.
- PR456 open head9569d6042a0ca5009c56ff1780e830f334d8e684;
  CI45140118234 failed the stale `فيلمان أصليان.` copy assertion. Its other
  static/build/readiness jobs passed; those results do not certify a new head.
- main43f0a1adfcc18b656c7a8f5bac6f49bbfb02a36c is a direct media-only commit,
  not a PR456 merge. It skipped push CI. Scheduled Hourly CI45202954032 passed,
  but does not substitute for the required CI Verification push event.
- Staged Production dpl_29MzJsz6rLqTFD9suHQNwoC6LkeA is READY at43f0; no
  promotion is authorized until the established gates are satisfied.
- Both custom aliases still point to READY Production dpl_9nwbCuVbRBoNr27NF1WEezkrEVrW
  /03ff299bcf1dc1ced9d7f923179aba6da39e4e72. Re-read aliases and live stamps
  immediately before promotion; this is a baseline observation, not new delivery.
- Owner approved raising this existing cycle4→6 attempts, explicitly preserving two
  emergency attempts. Existing Preview dpl_D42mGCjnXYwX9UVzwNwk1zT6ow4A and
  staged dpl_29MzJsz6rLqTFD9suHQNwoC6LkeA count as spent2. No reset of start
  boundary or exclusion of failures is permitted. Recount before each creation.
- GitHub branch-protection/variables read403; rulesets list empty. Do not infer
  bypass authority or credentials from those responses.

## Reconciliation

Merge current main into the existing feature history (no force-push). Keep its latest
Arabic MP4/VTT and model clock; preserve archived executive/refinery/asset/assistant
work. Reuse executive/TwinLoadState and remove the duplicate main-only copy. Repair
only the stale bilingual copy expectation in the existing contract. Source review
found no new operational write or permission expansion in the recovered changes.
Historical Arabic generation/edit receipts are explicitly labelled historical; the
replacement's stems and source receipt are not available in recovered Git files.

## Current limits

No optional Unit/Integration/E2E/load/eval or manual CI is run in recovery. Fresh
PR/main automatic gates and Vercel build results will be recorded in the delivery
report after they happen, not predicted here. Live login, authorized real-row QR,
role isolation, full listening/AR pronunciation/caption fidelity, real iPhone Safari,
and actual AI latency/cost remain unverified. Page context is an editable navigation
hint; presence is updated-row sampling, not a complete event-history implementation.
Workflow save is blocked by missing INSERT privilege; video search, durable shared
decisions and production what-if integration are not activated by this batch.

## Source checkpoint before push

Independent QA source clearance `QA-456-RECOVERY-SOURCE-20261123-01` authorizes
commit/push only, conditional on fresh remote gates before merge/release. The focused
response auditor found no new response-contract violation. Local `npm ci` succeeded
with an explicit writable `/tmp` cache after the first attempt failed on inaccessible
home-cache storage; no dependency/lock change. TypeScript exit0; full ESLint exit0
with32 existing warnings; tracked secret guard clean3611 files; diff check clean.
No local production rebuild or optional test suite was run; existing automatic CI and
Vercel perform the candidate builds. No result for those new builds is claimed here.
