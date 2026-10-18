# SADEED migration readiness

- [x] Reuse existing source export and validate its integrity.
- [x] Measure current relation sizes and inspect active schedules, retention, statuses, and foreign keys.
- [x] Run focused retry tests and unused-code analysis without removing candidates.
- [ ] Delete eligible historical records only after a verified archive restore; blocked by absence of a verified archive and independent restore environment.
- [ ] Correct the existing retention job that deletes audit history; blocked by archive gate and separate owner approval for changing a production task.
- [ ] Migrate and verify destination services; blocked by owner-controlled destination accounts, full database export, storage transfer, and integration credentials.
- [x] Produce and verify the seven requested downloadable reports and manifests.
