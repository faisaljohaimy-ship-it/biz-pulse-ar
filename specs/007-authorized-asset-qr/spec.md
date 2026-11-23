# Feature Specification: Authorized asset QR read pilot

**Feature Branch**: `feature/sadeed-authorized-asset-qr-20261123`

**Created**: 2026-11-23

**Status**: Implementation for source review; runtime authorization unverified.

**Input**: Feature 12 connected read-only asset QR. Preserve the frozen media worktree and the owner-hidden legacy assets screen.

## User Scenarios & Testing

### User Story 1 — Open the same authorized real asset (P1)

An administrator opens an existing real asset alert, reads its exact record and source timestamps, then reveals a QR linking to that same protected record.

**Acceptance**: Only a signed-in, non-simulation UUID alert links to the singular detail route. The server validates the UUID, verifies the caller, checks the existing admin condition and reads one real `sec_assets` row through the caller's RLS client. The QR appears only after that read succeeds. Unauthenticated, forbidden, unavailable and source-failure outcomes contain no asset data. Source-update time is distinguished from fetch time. Internet access and existing permissions remain required.

## Requirements

- No legacy-route unhide, service-role client, optional auth, simulation substitution, writes, migrations, provider call or offline cache.
- Keep responses private/no-store, query state user-bound and immediately disposable, and hide old data on refetch/error/account changes.
- Accept successful data into the query only when the server's verified caller ID matches the captured account; check that identity again before rendering. Account changes and query cancellation invalidate pending reads.
- A 15-second client deadline bounds the entire promise, including auth waits, and provides an honest retry state. It is a configured bound, not a measured service-level guarantee; unchanged auth helpers may continue waiting internally, while the aborted transport prevents a late client request from starting.
- Do not disclose whether a row outside the caller's RLS scope exists.
- Current live metadata permits global app admins who are viewer-or-higher members of the row's organization; this pilot does not broaden that scope.

## Success Criteria

Source and generated-route review must establish a complete real-alert → protected-record → QR → same-record path. No live role/tenant execution, performance or deployment success is claimed without separate evidence. Optional tests/CI are excluded by the owner's current instruction.
