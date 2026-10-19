# SADEED migration readiness

## Current assistant audit

- [x] Inspect saved history and confirm the three prior assistant fixes exist; GitHub connection and backup warning are not inspectable through project tools.
- [ ] Verify targeted Stop/session and terminal-error fallback repairs with tests and preview checks.
- [ ] Complete available project checks and report remaining blockers; no restoration, repository rewrite, database changes, or publication.

- [x] Reuse existing source export and validate its integrity.
- [x] Measure current relation sizes and inspect active schedules, retention, statuses, and foreign keys.
- [x] Run focused retry tests and unused-code analysis without removing candidates.
- [x] Clean cron.job_run_details (>7d): 293,913 rows archived to cron_job_run_details_archive then purged; audit_logs bloat reclaimed (was empty); DB 989→604 MB.
- [ ] Drop cron_job_run_details_archive (156 MB) after owner downloads full platform export; blocked by owner export step.
- [ ] Archive/clean workflow_runs, workflow_step_runs, tool_executions older than 30 days (~270 MB); awaiting owner decision.
- [ ] Correct the existing retention job that deletes audit history; blocked by archive gate and separate owner approval for changing a production task.
- [ ] Migrate and verify destination services; blocked by owner-controlled destination accounts, full database export, storage transfer, and integration credentials.
- [x] Produce and verify the seven requested downloadable reports and manifests.
