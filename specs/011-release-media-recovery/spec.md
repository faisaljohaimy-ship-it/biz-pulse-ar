# 011 — Release identity and film-load recovery

## Owner request and scope

On 2026-11-25 the owner requested correction of errors, an update, and immediate
publication. The existing session instruction is to avoid a new optional CI run.
This batch applies two narrow repairs against reviewed main
`daaef200a4eb2433ae42a1b27ce5b04276e0f91f`; it does not weaken branch/environment
protections, change provider spending, or modify production data.

## Confirmed failures

1. The release controller verifies baseline and rollback liveness with a default
   ref of `main`. A valid manual Vercel deployment uses its exact 40-character SHA
   as `build.ref`. Its matching SHA therefore still fails the baseline probe.
2. A release failure is written to the GitHub step summary but not to the console.
   The mobile log can show only `Process completed with exit code 1`.
3. `HomeTwinSection` catches a rejected player import but renders an unavailable
   placeholder with no local error message or recovery action. The neighboring
   identity/reference players already provide `TwinLoadState` recovery.

## Acceptance criteria

- Baseline identity is accepted only after verifying the expected project,
  Production target, READY status, exact SHA and both aliases. The expected ref
  comes from the verified deployment and is limited to `main` or that same full
  SHA. Missing, unrelated, or conflicting identity metadata fails closed.
- Baseline and rollback probes use that verified expected ref. The newly staged
  controller candidate continues to require its exact `main` identity; no wildcard
  or fallback that ignores a mismatched stamp is allowed.
- A failed release emits an actionable, sanitized console diagnostic and retains
  a failing exit code. Secret values, raw provider bodies and untrusted exception
  text must not enter console diagnostics or summaries.
- A rejected film-player import renders a localized alert and reload action in
  each unavailable film card. Arabic and English both work. The poster,
  disclosure, neighboring content and successful player behavior remain intact.
- Focused regression checks reproduce each defect before repair and pass after
  repair. These are local checks; no optional GitHub CI is dispatched for this
  owner-authorized batch. No broad test result is claimed without execution.

## Delivery and limits

- Work in the independent `fix/sadeed-release-recovery-20261125` branch and review
  the diff before merging. Preserve concurrent writers and all actual required
  checks. Review current main again before merge and promotion.
- Capture the last verified live artifact and its SHA/ref. Stage a Production
  build, verify its exact identity and critical pages/assets, then promote the
  same artifact and verify both custom domains within 90 seconds.
- Roll back a failed promotion to the verified prior artifact only after checking
  that no other production writer has taken over.
- Existing GitHub credential/cycle settings remain prerequisites of the automated
  controller. Fixing its diagnostics does not create a Vercel token or imply that
  automatic GitHub delivery is configured.
- No new narration, voice/provider enablement, dependency upgrade, migration,
  runtime authorization change, or comparative AI/performance claim is included.

## Evidence checkpoint

- Production at intake: `dpl_GcwVcyURS3gSGaUdz7z2cdaMZ7qR`, matching current main.
- Current media and release code were inspected at the pinned main SHA.
- Open PRs #401, #398 and #392 were checked against main; equivalent fixes and
  regression tests already exist. They are not merged again in this batch.
- Release-controller regression: six newly added assertions failed before the
  implementation; all 65 cases pass after it. This executes the workflow script
  with isolated fake GitHub/Vercel/HTTP adapters, without live publishing.
- Film recovery regression: two localized cases failed before the component
  repair; all four cases pass after it. The failed-card assertions are scoped to
  each original film so an adjacent identity-player alert cannot mask a defect.
- `npm run typecheck` and `npm run build` completed successfully locally. The
  build retains existing advisory TanStack deprecation/code-splitting warnings.
- The actual PR, merge and deployment IDs belong in post-execution delivery
  evidence; none are predicted in this checkpoint.
