# Tasks: Enterprise Decision and Delivery Iteration

**Input**: [spec.md](spec.md), [plan.md](plan.md), and supporting design artifacts.
**Branch**: `feature/sadeed-enterprise-delivery-20261122` from `60b3f2f`; new PR supersedes unmerged #453 when ready.
**Status**: Implementation, full local gate, CD offline regressions, and browser matrix passed. Final QA clearance, exact-head CI/PR/merge and verified Production delivery remain open.

## Phase 1: Setup and discovery

- [x] T001 Read existing rules, fixture/route, CI/deployment workflows, and prior feature evidence; record scope in `specs/002-enterprise-decision-delivery/spec.md`.
- [x] T002 Resolve installed Spec Kit templates/hooks and produce `specs/002-enterprise-decision-delivery/plan.md`, design documents, and requirements checklist.
- [ ] T003 Confirm the feature branch/PR base, required exact-revision CI checks, automation permissions, deployment target, and known-good recovery discovery in the delivery evidence linked from `specs/002-enterprise-decision-delivery/tasks.md`.

## Phase 2: Foundation

- [x] T004 Extend `src/lib/sadeed/security-decision-scenarios.ts` with a coherent bilingual scenario/decision catalog while preserving existing consumed fixture contracts and simulation/approval invariants.
- [x] T005 Define local scenario selection/reset and executive-brief serialization in `src/lib/sadeed/security-decision-scenarios.ts`, `src/lib/sadeed/security-decision-report.ts`, and the existing component/reducer; keep scenario data isolated and safely encoded.

## Phase 3: US1 — Accountable scenario comparison (P1)

**Independent check**: Every scenario presents responsible role, fictional deadline/status, evidence/rationale, and at least two alternatives; scenario changes clear stale review state.

- [x] T006 [US1] Add catalog, metadata/alternative completeness, scenario-switch isolation, review/reset, and no-execution tests in `src/lib/sadeed/security-decision-scenarios.test.ts` and existing model tests.
- [x] T007 [US1] Add selection, accountable metadata, alternatives/tradeoffs, and stage-consistent review to `src/components/sec/SecurityDecisionCenter.tsx`.
- [x] T008 [US1] Verify selection, both review outcomes, acknowledgement, reset, and locale continuity in `src/components/sec/SecurityDecisionCenter.test.tsx`.

## Phase 4: US2 — Executive brief export (P1)

**Independent check**: Export disabled before local review, then completed-review exports in both languages are self-contained, accurately scoped to the selected synthetic scenario, and cause no operational call.

- [x] T009 [US2] Test export fields, language/source/disclosures, encoding, and state fidelity in `src/lib/sadeed/security-decision-report.test.ts`.
- [x] T010 [US2] Add local executive download controls and resource cleanup in `src/components/sec/SecurityDecisionCenter.tsx`.
- [x] T011 [US2] Verify rendered export behavior and absence of feature-triggered mutations/provider calls in `src/components/sec/SecurityDecisionCenter.test.tsx` and browser evidence.

## Phase 5: US3 — Permanent gated delivery (P1)

**Independent check**: Policy preserves existing safeguards, all invalid/stale eligibility cases fail closed, and the observed release follows current-head PR/CI and merged-SHA deployment.

- [x] T012 [P] [US3] Persist the owner's permanent feature → CI → PR → conditional auto-merge → Production → verify → recovery rule in `AGENTS.md` and reconcile superseded delivery statements in `CLAUDE.md` without deleting unrelated rules.
- [x] T013 [US3] Implement the smallest guarded automatic delivery path in `.github/workflows/ci.yml`, `.github/workflows/deploy-vercel.yml`, and selected existing release helpers; bind eligibility to required checks on exact head and deployment to merged SHA.
- [x] T014 [US3] Add offline regression coverage for stale/missing/running/skipped/failed checks, changed head/conflicts, target/revision mismatch, and inconclusive health in the relevant workflow/release-helper tests.
- [x] T015 [US3] Document known-good target capture, verification, and authorized recovery in `ROLLBACK.md` and the selected delivery runbook; preserve protected settings, emergency reserve, and branch history.

## Phase 6: US4 — Resource-boundary repairs (P1)

**Independent check**: Isolated hostile streams and noncooperative agents settle the caller within configured limits without a real provider/security operation.

- [x] T016 [P] [US4] Replace unbounded FINN body ingestion in `src/routes/api/finn/chat.ts` with the existing bounded transport exported from `src/routes/api/-chat-guard.ts` (its existing default remains unchanged); enforce received-byte/upload-deadline limits before model execution and preserve current identity/rate/spend gates.
- [x] T017 [US4] Add FINN oversized, multibyte, never-completing, and ordinary-body regression cases in `src/lib/finn-agent/finn-chat-route.test.ts` using the established isolated test conventions.
- [x] T018 [P] [US4] Bound `agent.run` logical completion in `src/lib/sadeed/task-bus/dispatcher.server.ts` using existing deadline/abort signals with preabort no-start, cleanup, and safe late completion.
- [x] T019 [US4] Add never-settling, preabort, deadline, parent-abort, listener/timer cleanup, and late success/failure regressions in `src/lib/sadeed/task-bus/dispatcher.server.test.ts`; document that ignored-signal work is not forcibly killed and tool authority remains independent.

## Phase 7: US5 — Architecture/security/orchestration assessment (P2)

**Independent check**: Each material finding cites code or measured evidence, distinguishes its verification level, and gives a bounded next action; live readiness is not inferred from a demo.

- [x] T020 [P] [US5] Produce the evidence-linked architecture/security/orchestration assessment in `docs/audit/ENTERPRISE_DELIVERY_REPORT_2026-11-22.md` and `docs/audit/ENTERPRISE_SECURITY_REVIEW_2026-11-22.md`.
- [x] T021 [US5] Record behavioral tenant/region isolation, Auth/provider, and operational-orchestration proof gaps, impact, and next validation steps in that audit and the final delivery report; do not claim complete enterprise readiness.

## Phase 8: Full verification and release

- [x] T022 Run focused/complete tests plus TypeScript, full lint, build, performance, contrast, secret scan, and production-dependency audit from `package.json`; record actual outcomes, skips, repairs, and limitations below.
- [x] T023 Verify Arabic/English, both themes, 360/390/430/768/1280px, keyboard/44px controls, no overflow, scenario isolation, export, and feature side-effect boundaries for `src/components/sec/SecurityDecisionCenter.tsx`; obtain explicit final QA guardian clearance.
- [ ] T024 Push only the feature after checks; open/update its PR and observe required exact-head CI before conditional auto-merge. Record PR, checked head, checks, and resulting merged SHA below; retire superseded draft #453 only when appropriate.
- [ ] T025 Capture last verified recovery identity; deploy only the merged revision to the intended Production project and verify build identity, required routes, and health within the required window. Record deployment/time/URL/results below.
- [ ] T026 If release verification fails or is inconclusive, perform and verify authorized known-good recovery; record the actual outcome and unresolved blocker below. If release passes, record recovery as unnecessary rather than performed.

## Dependencies and parallel work

T001–T003 establish scope/capability evidence; T004–T005 unblock scenario/export stories. UI and model tests may proceed in separate files with an agreed contract. Policy/release work (US3), the two resource repairs (US4), and the read-only audit (US5) can proceed in parallel without shared-file edits. Final verification converges all changes before exact-head CI, PR merge, merged-SHA deployment, and observed health/recovery. No earlier Preview or green revision substitutes for the final release evidence.

## Evidence and remaining scope

- Baseline feature `60b3f2f` has completed Preview evidence in [feature 001 tasks](../001-security-decision-center/tasks.md). It is not Production proof for this iteration.
- Installed extensions expose `hooks: {}`; no mandatory hook or branch mutation was invoked. Templates were resolved with the installed Spec Kit scripts; `.specify/feature.json` is a local ignored handoff pointer.
- Scenario/report/UI focused verification passed 3 files / 21 tests (6 scenario, 10 report, 5 UI), including bilingual scenarios, unknown-ID rejection, coherent severity, draft/review distinctions, escaped hostile content, malformed locale/window and nonsynthetic child-evidence rejection, operational-input rejection, local Blob download, acknowledgement/scenario reset, language continuity, and no fetch. The later real-browser run also verified 12 actual HTML downloads. An in-memory mutant without the new runtime guards accepted all three unsafe probes, proving the rejection cases detect real defects.
- Resources passed 3 files / 100 tests: `vitest run src/lib/sadeed/task-bus/dispatcher.server.test.ts src/lib/finn-agent/finn-chat-route.test.ts src/routes/api/-chat-guard.test.ts --maxWorkers=1`. Four new FINN and four of six new dispatcher cases failed before repair. Focused ESLint for the five resource files and diff checks passed. Virtual-time deadline assertions are not Production latency measurements.
- Existing mocked owner/failover/engine/provider-plan/step-cap/quota controls passed 6 files / 218 tests. These do not verify live providers or measured USD spending.
- Owner delivery policy is persisted in `AGENTS.md` with superseded policy reconciled in `CLAUDE.md`; rollback documentation was updated. CD stage/verify/promote and its exact-head/cycle/budget gate regressions passed 45 offline cases, with red proof after removing stage/budget guards. Credential metadata inspection returned 403, so actual credential readiness is not inferred.
- [Delivery/architecture QA matrix](../../docs/audit/ENTERPRISE_DELIVERY_REPORT_2026-11-22.md), [read-only live security review](../../docs/audit/ENTERPRISE_SECURITY_REVIEW_2026-11-22.md), and [three-minute demonstration](../../docs/operations/EXECUTIVE_DEMO_AR.md) are available. Live catalog checks proved RLS enabled on 148/148 public tables and fixed search paths on 39/39 public SECURITY DEFINER functions. Behavioral tenant/region isolation and full Auth/provider flows remain unproven.
- Pre-release Production identity reported `dpl_87SSgBf9CMcoJKLAh8JJRemABzSh` / `a384…`. Existing main `968…` includes 62 commits / 34 reviewed files beyond that Production baseline; 15 offline suites / 155 tests passed. The reviewed delta includes shared chat/voice hardening but no migration/dependency/provider-flag/role-auth/DNS change reported. Release scope includes that delta, not only the new UI.
- Final browser verification passed 6/6 in about 1.7 minutes: all 60 scenario/language/theme/viewport combinations and 12 actual HTML downloads. Health GETs were intercepted before navigation; zero mutating attempts were observed. This is not a live backend-health claim. Final QA clearance remains open. Post-commit PR/merge/deployment/verification evidence belongs to the final release response or observed evidence addendum, not a predicted SHA in this checkpoint.
- Current live tenant isolation, authentication, provider reliability, final automation eligibility, and Production release/recovery remain unproven at this checkpoint. This iteration does not claim the entire enterprise program is complete.

- Final local gate: clean `npm ci` installed 1,159 packages in about 20s; TypeScript exit 0; full ESLint 0 errors / 32 preexisting warnings. Full Vitest passed all 438 files: 8,462 tests passed, 30 skipped, 8,492 total, two workers, 416.65s. Build succeeded, performance and contrast passed without a budget increase. Output 51.10 MiB, aggregate JS 10.04/10.05 MiB, largest JS 1.20/1.40 MiB, CSS 0.62/0.625 MiB, largest media 10.96/14 MiB, 684 files.
- Secret scan: 3,498 files clean. Latest dependency audit: no high/critical, 11 lower-severity findings (3 low, 8 moderate); earlier 10-finding evidence belongs to the prior iteration.
- CD requires a bounded configured cycle and actual deployment count using existing `checkBudget`, preserving two emergency deployments. Missing configuration fails before create. The current one-off plan is finite (cap 4 = Preview 1 + Production 1 + reserve 2), with actual count checked before delivery; future automatic-cycle capacity and standing credentials remain unproven. No final merge/deployment/Production-verification result is predicted here.

- Final QA guardian reviewed the staged source, report, and completed gate, closed HTML/controller findings, and issued **«مصرَّح بالدفع»**. This clears commit/push/PR only; merge and Production still require fresh exact-head CI, exact merged revision, actual cycle budget, and live artifact verification.
