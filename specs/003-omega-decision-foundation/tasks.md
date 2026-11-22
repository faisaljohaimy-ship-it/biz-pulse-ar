# Tasks: SADEED OMEGA Decision Foundation

**Branch**: `feature/sadeed-omega-foundation-20261122` from c55.
**Input**: [spec.md](spec.md), [plan.md](plan.md), source inventory and 37 official competitor references.
**Status**: All required local checks passed. Final guardian clearance is complete; post-commit remote delivery remains open; the new bounded cycle was captured at 0/4 before first push.

## Phase 1: Scope and evidence setup

- [x] T001 Inspect existing instructions, 001/002, graph/simulation/decision sources and the capability inventory; record selected01/04/06 in `specs/003-omega-decision-foundation/spec.md`.
- [x] T002 Resolve the installed Spec Kit templates/hooks and create `specs/003-omega-decision-foundation/plan.md` plus design/contract/quickstart/checklist artifacts.
- [x] T003 Record exactly 15 owner capabilities with current status, evidence, gaps and next checks in `docs/strategy/OMEGA_CAPABILITY_ROADMAP_2026-11-22.md`.
- [x] T004 Produce eight-vendor official-source/date/availability/limit comparison and bounded gap analysis in `docs/audit/OMEGA_INNOVATION_GAP_MATRIX_2026-11-22.md`.
- [x] T005 Add short batch/evidence/targets-not-results OMEGA discipline to `AGENTS.md`, preserving its permanent delivery/safety rules and leaving CLAUDE/old feature reports unchanged.

## Phase 2: Pure contract foundation

- [x] T006 Add validated scenario/assumption contracts and baseline defaults in `src/lib/sadeed/omega-security-lab.ts`: booleans for camera/route/connectivity, integer patrolCount 0..12 and responseMinutes 1..120; reject coercion/nonfinite/out-of-range/unknown inputs.

## Phase 3: US1 — Evidence-linked world projection (P1)

**Independent check**: Each existing fixture yields a small coherent graph with valid source/evidence references and a bounded dependency trace, without store mutation.

- [x] T007 [US1] Implement transient projection and dependency tracing (default3; validated integer0..6) in `src/lib/sadeed/omega-security-lab.ts`, reusing existing graph types as type-only imports.
- [x] T008 [US1] Test graph identity/reference integrity, nonempty synthetic evidence, source/unknown semantics, cycle/depth/unknown-node behavior and no mutation/IO in `src/lib/sadeed/omega-security-lab.test.ts`.
- [x] T009 [US1] Render source-labelled context/dependencies accessibly in `src/components/sec/SecurityDecisionOmegaLab.tsx` and verify it in the adjacent UI test.

## Phase 4: US2 — Rule hypotheses and missing facts (P1)

**Independent check**: Every risk interpretation identifies its rule, evidence, assumptions, missing facts and next verification; no proven cause or probability is claimed.

- [x] T010 [US2] Add categorical review-priority/control-gap hypotheses in `src/lib/sadeed/omega-security-lab.ts`, preserving original event severity and distinguishing assumptions from evidence.
- [x] T011 [US2] Test rule/reference consistency, incomplete context, deterministic explanation and no causal/probability assertions in `src/lib/sadeed/omega-security-lab.test.ts`.
- [x] T012 [US2] Present hypotheses/support/missing facts/limitations in both languages through `src/components/sec/SecurityDecisionOmegaLab.tsx` and its UI test.

## Phase 5: US3 — Isolated what-if and exact report (P1)

**Independent check**: Every control changes only a labelled variant; stale review/export is invalidated, scenario/reset defaults work, locale semantics persist, and downloaded reports match the validated inputs.

- [x] T013 [US3] Implement immutable baseline/variant comparison for all five controls in `src/lib/sadeed/omega-security-lab.ts`.
- [x] T014 [US3] Test each control, boundary/invalid values, baseline immutability and nonoperational invariants in `src/lib/sadeed/omega-security-lab.test.ts`.
- [x] T015 [US3] Add controlled what-if inputs/comparison and reset semantics to `src/components/sec/SecurityDecisionOmegaLab.tsx` and `SecurityDecisionOmegaLab.test.tsx`.
- [x] T016 [US3] Integrate the isolated panel into `src/components/sec/SecurityDecisionCenter.tsx`; controlled local UI state invalidates acknowledgement/review/export on any assumption change, scenario/reset restores defaults and locale preserves semantics.
- [x] T017 [US3] Test post-review input invalidation, scenario/reset/locale continuity and no operational calls in `src/components/sec/SecurityDecisionCenter.test.tsx`.
- [x] T018 [US3] Extend `src/lib/sadeed/security-decision-report.ts` with optional fifth `{scenarioId,assumptions}`, validating/recomputing the full canonical fixture/rules and rejecting altered fixture/event/severity/evidence, foreign scenario, extra result fields or malformed inputs while preserving existing callers/escaping; no actor/history/signature/durable-audit authentication claim.
- [x] T019 [US3] Test exact input/rule/evidence/missing-fact export, stale/mismatched/forged payload rejection, draft/review limits and zero IO in `src/lib/sadeed/security-decision-report.test.ts`.

## Phase 6: US4 — Honest program/differentiation/demo (P2)

**Independent check**: All15rows and8vendors carry evidence/limits, ten quality targets remain unscored targets, and a3–5minute safe presentation connects the three selected capabilities.

- [x] T020 [US4] Create the target/evidence matrix in `docs/audit/OMEGA_QUALITY_EVIDENCE_2026-11-22.md` and planned repeatable walkthrough in `docs/operations/OMEGA_EXECUTIVE_DEMO_AR.md`.
- [x] T021 [US4] Update roadmap/matrix/demo/quality documents with observed implementation/test outcomes, preserving unknowns and separating local demo from live operation.

## Phase 7: Delivery repair and full gates

- [x] T022 Verify root's narrow terminal-pagination API-shape correction and red/green regressions in `scripts/cd-gate.mjs` and `scripts/cd-gate.regression.test.mjs`; do not change deployment authority or budgets.
- [x] T023 Run focused core/UI/parent/report regressions for the new files above; demonstrate rejection tests catch intentionally injected violations without leaving mutants.
- [x] T024 Run full TypeScript, ESLint and Vitest from `package.json`; record passes/failures/skips/warnings for the exact revision.
- [x] T025 Run build, existing performance budgets, contrast, secrets and production-dependency audit from `package.json`; compare actual bytes to the c55 baseline without silently raising caps.
- [x] T026 Verify three scenarios, five controls, both languages/themes, 360/390/430/768/1280px, keyboard/44px/no overflow, actual downloads and zero feature-triggered network/mutation attempts via `tests/e2e/16-security-decision-center.spec.ts` or the established isolated harness.
- [x] T027 Obtain explicit final QA guardian clearance and complete the observed results in `docs/audit/OMEGA_QUALITY_EVIDENCE_2026-11-22.md`.
- [x] T028 Before first feature push, record the new task's fixed start boundary and finite 4-deployment cycle (Preview 1 + Production 1 + reserve 2), counting all states and confirming the prior cycle is closed without spending/resetting its reserve.
- [ ] T029 Fetch current base, push only the feature, open PR and require exact-head checks before eligible merge; record PR/head/CI/merge in the delivery evidence.
- [ ] T030 Require merged-SHA main CI; capture known-good target; create and verify one staged artifact and promote that same artifact within the finite cycle under `docs/operations/CONTINUOUS_DELIVERY_AR.md`.
- [ ] T031 Verify both Production domains/build identity/new flow/critical routes within 90 seconds, or follow known-good recovery; report actual status, metrics, limits and recovery result without predicting IDs or complete enterprise readiness.

## Dependencies and parallel work

T001–T006 establish intent/contracts. Core projection/hypothesis/comparison work shares one module and owner; isolated panel implementation can proceed against the agreed contract in a separate file. Root owns parent/report integration; documentation and the narrow CD correction remain independent. Full verification converges all paths before exact-head CI/PR and same-artifact release. Source existence, earlier tests or an old Preview never substitute for current evidence.

## Final pre-commit evidence checkpoint

These are observed local results. This checkpoint does not predict a commit SHA, remote check, merge, deployment or Production verification. Post-commit receipts belong in the PR body and standalone delivery report.

| Check | Final observed result | Scope / limit |
|---|---|---|
| Contracts and documentation | Installed Spec Kit v1.3.1 resolver/setup-plan/setup-tasks executed; hooks empty. Roadmap: 15 rows; competitors: 8 vendors / 37 official sources. | No `specify` CLI invocation or comparative benchmark claimed. |
| Full unit suite | **440 files passed; 8,486 tests passed + 30 skipped = 8,516 total**, one worker, 508.34s; started 23:03:49 UTC. | Includes all 105 n8n and 39 focused cases; do not add them again. Root and guardian read `/tmp/sadeed-omega-quiet-vitest.log`. |
| Types and lint | Fresh full TypeScript exit 0; full ESLint 0 errors / 32 existing warnings; final six changed-code files also exit 0. | Earlier five invalid test options were fixed; warnings are not hidden. |
| Build / budget / contrast | PASS at **2026-11-22T23:02:56.354Z**. JS 10,537,975 / 10,538,188.8 bytes; CSS 651,497 / 655,360 bytes; output 53,590,098 bytes / 684 files. Largest JS 1.20 / 1.40 MiB; media 10.96 / 14 MiB. | Only **213.8 JS bytes** and 3,863 CSS bytes remain. Caps, SVG, functionality and security preserved; measured optimization is required before further feature growth. |
| Browser | **8/8 passed**, exit 0, 2.5 minutes. All 60 scenario/language/theme/width combinations; 44px/no overflow; **12 baseline + 4 changed HTML downloads** with five exact inputs. | Graph keyboard, unknowns, all controls, stale-review invalidation/reset and neighboring staff gate verified. No writes; known health GETs mocked. Owned Vite/Chromium stopped at 23:16:45.827 UTC. |
| Visual review | Root reviewed changed Arabic desktop/full shell; guardian found both Arabic mobile themes readable. | This observation is not final push clearance or a full manual assistive-technology audit. |
| Secrets / audit | **3,515 files clean**; production audit threshold exit 0 with **12 package findings: 3 low / 9 moderate / 0 high / 0 critical**. | No manifest/lock change. See [dependency triage](../../docs/audit/OMEGA_DEPENDENCY_TRIAGE_2026-11-22.md); application exploit reachability remains unproven. |
| CD regression | **53/53 native offline cases passed**. | The pre-fix 46 pass / 1 fail run proved the valid terminal-pagination shape was rejected; no deployment authority expanded. |
| New task cycle | Start **2026-11-22T23:18:10.826Z**, sinceMs 1795389490826, cap 4. Complete all-state MCP listing count **0**; budget allowed: remaining 4 / routine 2 / reserve 2. | Captured before first push. Operator-bounded plan under OMEGA delegation: Preview 1 + Production 1 + emergency 2; not a new explicit numeric owner approval or standing default. Predecessor 002 remains closed at cap 5 / spent 3 / reserved 2. |
| Remote delivery | **Not yet performed**: commit/push, exact-head CI/PR/merge and staged/verified Production release. | Freshly fetched main remains c55; current known Production baseline is c55 / dpl3HX, not old dpl87. T027 is closed by explicit guardian clearance; T029–T031 remain open. |

Useful history: earlier budget failures (+1,233.2 bytes, then +230.2) were superseded by the optimized passing build. Concurrent work on the 8 GiB / 2 vCPU environment caused OOM/timing failures; the interrupted run was never counted green. The quiet full suite supersedes it. Only the capped quadratic n8n mutant received a 15s runner timeout after the default 5s failed at 5,381ms; its 6000 × 10 × 2 payload and real-code 400ms guard stayed unchanged. The other 15s mutant was not weakened; all 105 n8n cases passed in the final quiet run.

Review binding is controlled local UI state. The serializer validates/rebuilds the complete canonical fixture and rule projection and rejects modified event/severity/evidence, foreign scenario, extra result fields or malformed inputs. It receives caller-supplied review state; it does not authenticate history/actor or provide a cryptographic signature or durable/tamperproof audit. This remains a bounded synthetic implementation of 01/04/06, not the complete fifteen-capability program.
