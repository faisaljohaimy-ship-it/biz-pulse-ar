# Observed checkpoint verification — 2026-11-24

This reconciles the archived005/006 pre-commit check state for source content delivered
as `539cc26fbeed0b8f6c1d8c6e8eacb3669ec9e23e`. It is evidence for that checkpoint,
not acceptance of later concurrent system/media changes. The owner explicitly
requested direct publication without CI; no CI success is claimed.

## Observed local checks

| Check                        | Observed result                                                                                                                      | Scope / limit                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript                   | exit0                                                                                                                                | Existing application typecheck                                                                                                                                           |
| Full ESLint                  | exit0;0 errors,32 existing warnings                                                                                                  | Warnings were not presented as repaired                                                                                                                                  |
| Focused media regression     | 4 files,88 tests passed                                                                                                              | Home image/source/order, home twin section, shared film player and original media asset contracts                                                                        |
| Initial full Vitest          | 433 suites passed,15 failed;8400 passed,83 failed,30 skipped; one unhandled localhost-listen error                                   | Sandbox subprocess/listen `EPERM` and two intentionally quadratic mutation timeouts prevented a green single run                                                         |
| Failed-suite retry           | All15 suites and505 tests passed;exit0 in29.32s                                                                                      | Network-enabled command permissions,2 workers and30-second test harness bound; source unchanged. This includes the retrieval suite that failed during initial collection |
| Combined suite coverage      | All448 suite files passed across initial run and targeted retry                                                                      | This is not a claim that the initial full run was green. Skipped cases remain skipped                                                                                    |
| Production build             | exit0                                                                                                                                | Built the checkpoint source with existing target/settings                                                                                                                |
| Performance budget           | 701 files;45.98/52MiB total;9.54/10.05MiB JS;1.20/1.40MiB largest JS;CSS0.62MiB within the existing ceiling;6.28/14MiB largest media | No ceiling increase                                                                                                                                                      |
| Contrast                     | exit0 with documented `CHROMIUM_PATH=/usr/bin/chromium`                                                                              | All measured floors met, including historical owner-accepted floors; not a universal WCAG AA claim                                                                       |
| Tracked secret guard         | 3611 files clean                                                                                                                     | No environment values/credentials copied into this evidence                                                                                                              |
| Production dependency audit  | exit0 at high threshold;0 high/critical                                                                                              | 10 advisories remained:3 low,7 moderate                                                                                                                                  |
| Home browser acceptance      | Arabic/English at390/1280 after hydration: one exact-source image before film,contain,no horizontal overflow,no page errors          | Film headings matched the selected language. This does not prove full film listening, login, real QR authorization or iPhone Safari                                      |
| Asset provenance/size        | Original1280×698 SHA-256 matched owner attachment;both derivatives matched manifest;public/home406391/409600bytes                    | Responsive image payload decreased2606bytes;phone source versioned to invalidate the old image cache                                                                     |
| Independent source/QA review | Scoped clearance:«مصرَّح بالدفع»                                                                                                     | Clearance covered the observed checkpoint and explicit no-CI instruction; production verification remains a separate observation                                         |

The subprocess/listen restriction was reproduced with minimal `spawnSync` and
`net.createServer().listen` probes. The successful permission-corrected retry
resolved all formerly failed suites without repairing unrelated application code.

Logs retained in the active execution workspace when observed:
`/tmp/sadeed-tests.log`, `/tmp/sadeed-qa-failed-suites-retry.log`,
`/tmp/sadeed-performance.log`, `/tmp/sadeed-qa-contrast.log`,
`/tmp/sadeed-browser-check.log`, `/tmp/sadeed-typecheck.log`,
`/tmp/sadeed-lint.log`, `/tmp/sadeed-build.log`, `/tmp/sadeed-secrets.log`
and `/tmp/sadeed-audit.log`. These are temporary local evidence, not durable
repository artifacts or evidence of future builds.

## Remaining acceptance and receipt reconciliation

The historical004/005/006 source-only statuses are superseded for the checks above.
Do not retain the assertion that guardian/local build clearance has never happened.
The earlier four-attempt question is historical:006's release-recovery record
already records the owner's same-cycle approval for six attempts with two emergency
attempts retained; do not request the obsolete four-attempt decision again.

## Observed Production receipt

The release operator confirmed `dpl_4hNC94YrXEDAnBQuynEw2pqjFbs1` READY and promoted
at full revision `539cc26fbeed0b8f6c1d8c6e8eacb3669ec9e23e`. Both `neexios.com`
and `www.neexios.com` aliases pointed to that artifact. The preserved verification
receipt was read from `/tmp/sadeed-production-verification.json`: at
`2026-11-24T15:37:58Z`, both domains returned `/api/public/live`200 with that exact
revision; `/`, `/auth`, `/sec/decision-center` and `/sec/incidents` returned200
with valid local asset MIME. The homepage receipt confirms image-before-film
order. The operator also verified the served WebP bytes against their exact hashes.

The preserved `/tmp/sadeed-production-browser-check.json` was read separately:
AR/EN at390/1280 on Production each showed one image before the film, `contain`,
no horizontal overflow, the correct language-specific film heading and zero page
errors. These are observed checkpoint outcomes, not predicted delivery IDs or
acceptance of subsequent changes. Publication was direct under the owner's
explicit no-CI instruction; no new green CI run was claimed.

Actual canonical-voice listening/pronunciation, complete VTT alignment, actual
iPhone Safari, live login/session/role isolation, real-row QR scan, live AI latency/
cost and workflow save acceptance are not established by these checks. New work is
tracked in [009](../009-archived-system-completion/spec.md). The earlier archived
statements “no push/deployment/new guardian clearance” are historical and must not
be repeated as the current539cc26 delivery state. This release receipt does not
close004's actual-account/device acceptance or certify all archived live features.
