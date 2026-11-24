# E03 — Comparable readings and history boundary, 2026-11-24

## Implemented

`src/lib/sadeed/presence/change-comparison.ts` compares only validated readings
whose account, organization, region/site scope, source version and bounded query
window match. It refuses a newer baseline, malformed values/dates, partial
coverage and absent measurements. Actual zero remains zero, signed count deltas
stay signed, and percentage comparisons are percentage-point differences.
An incompatible baseline's values are omitted from the result, not exposed as
another user's comparison.

The existing authenticated `/api/public/sadeed-presence` now scopes its warm
cursor with `[verified account, server-resolved organization, session hint]`.
GET and POST share that scope. Client org/role inputs do not select a tenant;
missing membership fails closed. Existing GET greeting fields remain available.
The optional `view=changes` reads only the existing presence count/sample engine,
without calling the executive briefing/model path, and returns private/no-store.
All source queries have both time bounds and the existing organization filter.
Source errors/missing counts remain null; the inspection percentage remains an
explicit bounded sample with no claimed improvement.

`PresenceChangesCard` is connected to `/sec/exec` in AR/EN. It displays the
organization-wide scope (not the currently selected region), Riyadh-time window,
measured values/zero, partial sample notice and an explicit unavailable-baseline
state. Account query keys and response identity checks prevent stale prior-account
values; no authenticated reading is sent or shown for a guest. Its refresh is a
read, not an operational action. Session discovery plus fetch has a four-second
UI deadline. Links point only to existing incident/risk routes; no inspection or
alert route was invented.

## Actual local evidence

- Six focused suites / 141 tests passed together in 7.18 seconds:
  comparator, existing count reader, authenticated route, AR/EN card,
  native film player and general film contracts.
- The tests include zero/missing/error, malformed and partial readings, account/org/
  source/window mismatch, future cursor, known source bounds, server-membership
  selection, legacy GET shape, no guest request, foreign-account response rejection
  and immediate invalidation during an account switch.
- The general film acceptance helper now allows only explicitly guarded native
  controls/poster with default custom mode. Unconditional controls/poster mutations
  remain rejected; the existing general film suite passed 56 tests.
- Targeted ESLint and diff whitespace checks passed. Final full-revision TypeScript,
  build, browser and production checks are root-owned; concurrent writes elsewhere
  made interim TypeScript output unsuitable as a final release receipt.
- No CI, migration, production write test, provider generation or deployment was
  performed by this workstream. Fixtures are not production account/tenant evidence.

## G-HISTORY: concrete missing dependency and proposal

The existing `presence/tiers.server.ts` store is a bounded process-local Map with
expiry. Its cursor stores visit time and seen incident/alert hints only. It is
neither durable nor a metric baseline, so the current view never uses it to claim
an improvement/decline.

Existing `reports/snapshot.server.ts` builds a current executive report in memory;
it does not retain snapshots. `events/useEventStream.ts` reads a bounded RLS event
sample; its current contract does not prove complete presence-state transitions or
as-of reconstruction. The existing `hajj_kpi_snapshots` table is a Hajj-specific
operator-managed metric store, with different sources, coverage and authority.
None is silently reused as an account-scoped complete presence baseline.

A separately reviewed history change would need the following concrete contract:

| Field/boundary | Required rule                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner          | Server-verified `account_id` and current `org_id`, never a client-selected identity                                                                  |
| Measurement    | Versioned metric payload plus per-metric completeness, source table/version, region/site scope                                                       |
| Time           | `captured_at`, exact `window_from/window_to`, source timestamps and declared timezone                                                                |
| Baseline       | Explicit immutable snapshot ID chosen within the same authorized measurement contract; no prior visit timestamp as a substitute                      |
| Reads          | Caller must match account and current organization membership; different account/org/window/source returns no comparison                             |
| Capture        | User-authorized capture through an existing reviewed write path; no service-role or browser privilege expansion implicit in viewing this card        |
| Retention      | Owner-approved duration/deletion policy and bounded indexes before activation                                                                        |
| Acceptance     | Two isolated authorized accounts/organizations, missing/partial sources, stale snapshot, real zero, denied cross-tenant IDs and actual save/readback |

No compatible authorized capture transport/storage or approved retention contract
was verified in this workstream. Durable history and as-of selection therefore
remain unavailable. This is the reviewable G-HISTORY proposal, not an applied
schema, permission grant or claim that E06 persisted history is finished.

## T016 — Existing OMEGA acceptance audit (read-only)

The existing bounded what-if feature is intact in this candidate. No application
repair or new engine was justified by this audit.

| Contract                                | Current source and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical baseline and isolated variant | `src/lib/sadeed/omega-security-lab.ts` rebuilds the selected canonical scenario baseline, validates exactly five assumptions, copies proposed inputs, and returns input-labelled before/after differences. Its adjacent test checks frozen-input isolation, fresh baseline independence, deterministic outputs, numeric bounds/unknown keys and no IO.                                                                                                                                       |
| Explainable assumptions and evidence    | The same engine keeps `demo_fixture`, `is_simulation=true`, `operationalApproval=false`, `executedActions=[]`, policy version, evidence IDs, unknown facts and measurement plans. The graph rejects foreign evidence, duplicate/cyclic/altered relations and fabricated live provenance. Improved assumed barriers do not lower the original incident severity or become a risk probability.                                                                                                 |
| Review invalidation                     | `src/components/sec/SecurityDecisionCenter.tsx` calls `resetDecision()` for every assumption change, invalidating acknowledgement, temporary review and export. Scenario/reset restores its own baseline; locale changes preserve the selected assumptions and state. `SecurityDecisionCenter.test.tsx` exercises each of the five controls, both simulated review outcomes and explicit human acknowledgement.                                                                              |
| Exact local export                      | `src/lib/sadeed/security-decision-report.ts` validates/recomputes canonical scenario and rule data for supplied assumptions, escapes report fields, rejects cross-scenario/forged-result/operational inputs and labels the result a simulation rather than an operational audit or scientific forecast. Its adjacent tests verify the AR/EN input/rule/evidence/missing-fact content and reject injected locale/HTML. The UI test verifies local Blob/download generation only after review. |
| Existing browser acceptance contract    | `tests/e2e/16-security-decision-center.spec.ts` already defines AR/EN scenarios, controlled assumptions/review invalidation, actual downloaded HTML inspection, viewport/theme/keyboard checks and prevention of feature-triggered writes. Its historical results are in specification003; this audit did not rerun that browser suite or relabel its historical result as a fresh browser run.                                                                                              |

Fresh execution: the six existing engine/scenario/reducer/report/panel/parent
suites passed **56/56 tests** in **10.98 seconds** at 16:44:27 UTC. Log:
`/tmp/sadeed-omega-readonly-acceptance.log`. No source change to those application
modules, provider call, production write or operational action was made. These
existing tests overlap the main suite and must not be added to its unique count.

The baseline is an isolated canonical demo value, not a durable authenticated
operational snapshot. Review remains local caller-supplied simulation state;
export has no authenticated actor/history signature or durable collaboration
receipt. Those limits are preserved, not regressions to repair through a new
store during release.

## T027/T028 — Archive provenance and actual persistence boundary

Tracked archive evidence distinguishes the desired capability names from a
previously implemented or fully specified transport:

- `specs/005-twin-reference-motion/spec.md` describes local reference-region,
  department/layer/detail interaction and a manual illustrative video. FR-005
  explicitly excludes a new API, provider, database write or 3D engine. It does
  not specify an operational historical reconstruction service.
- `specs/006-cinematic-voice-activation/spec.md` says the twelve-feature inventory
  does not mean twelve implementations. Its tracked `source-inventory.md` rows6/7
  explicitly record **no as-of transport/snapshot reconstruction** and **no
  verified durable shared comments/versions/conflicts/evidence**. Row10 records
  the already implemented local OMEGA alternative comparison.
- The original detailed twelve-feature intake is referenced under ignored
  `.audit-tmp/`, but that source text was not present in this checkout. The
  tracked inventory establishes desired temporal/shared capabilities; it does
  not establish the exact data schema, revision protocol or ownership/retention
  acceptance for a new implementation.
- Therefore009 T027's stand-alone pure revision/conflict protocol and T028's
  generic temporal selector are **new technical planning elaborations** of those
  inventory gaps, not recovered evidence that such contracts existed or were a
  completed task whose code was merely lost. This audit does not silently mark
  the end-user capabilities delivered, and does not create an arbitrary runtime
  schema just to check an inventory box during the frozen release.

Current reusable sources and real limits:

| Existing source                                                                                                                      | What it provides                                                                                                                                  | What it does not prove                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/executive-presentation.functions.ts` — `listPendingDecisions`, `approveDecision`, `dismissDecision`, `getExecutiveTimeline` | RLS-mediated pending/current decision reads, authenticated existing approval/dismissal operations and a bounded mixed event/decision/run timeline | No selected revision/CAS token, versioned comments/evidence transport or immutable shared review history is exposed. Approval can trigger an existing workflow or insert an event; it must not be reused as a harmless collaboration/comment write. No such operation was invoked. |
| Historical `aria_decisions` migration and current `finn_decisions` application/type references                                       | Existing per-user/current-status decision persistence and timestamps                                                                              | Schema/source references are not a fresh live catalog/ACL proof. They do not supply a verified collaborative revision protocol, comment versions or conflict acceptance.                                                                                                           |
| `src/routes/_authenticated/decisions.tsx`                                                                                            | Explicit reference-simulation recommendations and local review state/toasts                                                                       | No durable shared write endpoint or cross-user collaboration receipt.                                                                                                                                                                                                              |
| `src/lib/sadeed/knowledge-graph/graph-store.server.ts`                                                                               | Frozen current entities/relationships in process Maps; replacement of the current ID entry                                                        | No retained durable as-of history; `replaceEntity`/`replaceRelationship` replace the Map entry. Existing timestamps alone are not a historical version transport.                                                                                                                  |
| `src/routes/_authenticated/sec.timeline.tsx` and `getExecutiveTimeline`                                                              | Bounded views sorted using source event/created timestamps                                                                                        | No complete event coverage or distinction sufficient to reconstruct all prior state; a current row/update/fetch timestamp must not become an event history.                                                                                                                        |
| `src/components/twin/executive/executive-twin-model.ts` and `TwinReferencePanel.tsx`                                                 | Owner-reference metrics and locally interactive illustrative scene, explicitly simulated                                                          | No authorized as-of query or registered historical snapshot.                                                                                                                                                                                                                       |
| Existing executive report snapshots and `events/useEventStream.ts`                                                                   | Current report projection and a bounded authorized event stream                                                                                   | No verified complete, retained twin snapshot/replay contract.                                                                                                                                                                                                                      |

G-HISTORY remains the genuine missing boundary for durable temporal/shared
acceptance: a compatible existing source with complete timestamp semantics and
coverage, revision identity/conflict/readback behavior, server-verified actor and
organization access, plus owner-approved retention/write authority where needed.
The concrete measurement/history proposal above records that boundary. No new
collaboration store, generic history schema, fake time slider or as-of readiness
claim was introduced. Real account/tenant acceptance remains separate G-AUTH.
