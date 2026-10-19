# SADEED migration readiness

## OpenAI integration

- [ ] Add an opt-in server-side OpenAI path to the existing chat endpoint; preserve Gemini routing, UI, auth and database.
- [ ] Request OPENAI_API_KEY through the secure secret form.
- [ ] Run focused tests and verify a real OpenAI response through the existing endpoint before enabling any default change.

## Current assistant audit

- [x] Inspect saved history and confirm the three prior assistant fixes exist; GitHub connection and backup warning are not inspectable through project tools.
- [x] Verify targeted Stop/session and terminal-error fallback repairs: 480 assistant tests passed; preview chat returned HTTP 200 with safe text protocol in 7.9 seconds. Full visual verification is blocked by the existing employee-number gate overlay.
- [x] Complete available project checks: 2,579 tests passed, 28 skipped; lint has 0 errors/33 warnings; automatic build OK; secret scan clean; official-registry audit has no high/critical vulnerabilities (9 low/moderate remain). No manual build/typecheck, dependency reinstall, restoration, database changes, or publication.
- [ ] Confirm connected GitHub repository/branch, synchronization and backup warning; blocked by owner-only Project settings → Git visibility.

- [x] Reuse existing source export and validate its integrity.
- [x] Measure current relation sizes and inspect active schedules, retention, statuses, and foreign keys.
- [x] Run focused retry tests and unused-code analysis without removing candidates.
- [x] Clean cron.job_run_details (>7d): 293,913 rows archived to cron_job_run_details_archive then purged; audit_logs bloat reclaimed (was empty); DB 989→604 MB.
- [ ] Drop cron_job_run_details_archive (156 MB) after owner downloads full platform export; blocked by owner export step.
- [ ] Archive/clean workflow_runs, workflow_step_runs, tool_executions older than 30 days (~270 MB); awaiting owner decision.
- [ ] Correct the existing retention job that deletes audit history; blocked by archive gate and separate owner approval for changing a production task.
- [ ] Migrate and verify destination services; blocked by owner-controlled destination accounts, full database export, storage transfer, and integration credentials.
- [x] Produce and verify the seven requested downloadable reports and manifests.
