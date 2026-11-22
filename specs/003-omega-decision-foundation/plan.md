# Implementation Plan: OMEGA Decision Foundation

**Branch**: `feature/sadeed-omega-foundation-20261122` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

## Summary

Connect a transient scenario-world projection (#01), rule-based risk hypotheses (#04), and isolated what-if comparison (#06) inside the accepted decision center. Reuse the existing scenario/reducer/report and type-only knowledge-graph vocabulary. No server graph store, DB seed, provider, new route or heavy renderer is activated. Maintain an evidence-based fifteen-capability roadmap and eight-vendor comparison; preserve prior verified behavior.

## Technical Context

- **Stack**: Existing TypeScript 5.8 / React 19 / TanStack / npm lockfile and installed UI/i18n/token system. No runtime dependency added.
- **Core**: `src/lib/sadeed/omega-security-lab.ts` and test; pure `getOmegaBaselineAssumptions(id)`, `buildOmegaSecurityLab(id, assumptions?)`, and `traceOmegaDependencies(world,nodeId,maxDepth)` with default depth3 and validated integer depth0..6; the canonical graph is small and bounded.
- **Inputs**: `cameraAvailable: boolean`, `patrolCount: integer 0..12`, `responseMinutes: integer 1..120`, `routeOpen: boolean`, `connectivityAvailable: boolean`.
- **UI**: `SecurityDecisionOmegaLab.tsx` accepts `{ ar, scenarioId, inputs, onChange }` and keyed reset identity. Controlled parent UI state invalidates review/export/acknowledgement when inputs change; locale retains semantics; scenario/reset restores defaults.
- **Report**: Existing `buildSecurityDecisionReport` gets optional fifth `{scenarioId, assumptions}`; validate and rebuild the full canonical fixture and lab/rule data, refusing modified event/severity/evidence, foreign scenario, extra result fields and malformed assumptions. Preserve existing four-argument consumers and escaping. The caller supplies review state; this is input consistency plus UI state binding, not authentication of actor/history, a signature or durable/tamperproof audit.
- **Storage/authority**: Local transient state only. Existing `knowledge-graph/types.ts` may be imported as types; do not import/mutate server graph maps in the browser. No live domain/action/API integration.
- **Tests**: Pure model/traversal/invalid-input invariants, report safety, UI state invalidation and actual browser exports; existing full static/unit/build/performance/contrast/secrets/audit gates and exact-revision CI/release.
- **Performance**: Baseline c55 measured `2026-11-22T22:34:12.735Z`: aggregate JS 10,525,742 bytes against 10,538,188.8, leaving 12,446.8 bytes; CSS 651,139 against 655,360, leaving 4,221 bytes. This is baseline headroom, not a new-feature result. Existing caps remain; no 3D or provider bundle activation.

## Constitution Check

- Articles **1,3,13–15,21,32–34**: SADEED identity, bilingual clear source/limits, RTL/LTR, tokens, keyboard/44px and responsive/theme evidence.
- Articles **5,7**: No protected Vite/regions/Nusuk changes, secrets or production exports.
- Articles **6,8,12,23,24,27**: Synthetic provenance throughout; no prediction/confidence percentages, proven-cause claims, live execution, writes, biometrics, training or authority promotion.
- Articles **16,17,30**: Full gates and explicit QA guardian clearance; rejection tests demonstrate failure under real injected defects and assertions over lists require nonempty data.
- Articles **18,28,29,35**: Preserve concurrent work; exact-head CI/PR and staged same-artifact release; finite new-task budget with two-deployment reserve and observed verification/rollback evidence. The previous cycle is closed, not reset to spend its reserve.
- Existing AGENTS permanent delivery policy governs; add only OMEGA batch/evidence/target discipline. No constitutional amendment or duplication of release rules.

**Design gate**: Compatible with a synthetic/local first version. Existing graph types/rules are not proof of a live twin, causal validity, model quality, durable orchestration, tenant isolation or standing CD configuration. Re-evaluate against actual implementation/test evidence.

## Project Structure

```text
specs/003-omega-decision-foundation/
  spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md
  contracts/omega-ui.md, checklists/requirements.md
src/lib/sadeed/omega-security-lab.ts, omega-security-lab.test.ts
src/components/sec/SecurityDecisionOmegaLab.tsx, SecurityDecisionOmegaLab.test.tsx
src/components/sec/SecurityDecisionCenter.tsx, SecurityDecisionCenter.test.tsx
src/lib/sadeed/security-decision-report.ts, security-decision-report.test.ts
AGENTS.md
docs/strategy/OMEGA_CAPABILITY_ROADMAP_2026-11-22.md
docs/audit/OMEGA_INNOVATION_GAP_MATRIX_2026-11-22.md
docs/audit/OMEGA_QUALITY_EVIDENCE_2026-11-22.md
docs/operations/OMEGA_EXECUTIVE_DEMO_AR.md
```

The root agent separately owns the narrow CD pagination correction/regression and adding the actual eight-case Chromium decision suite after the existing health E2E job (one worker, unchanged job name/permissions/browser configuration); document its real evidence in the release report without treating that delivery repair as a fourth OMEGA product capability.

## Delivery Sequence

1. Freeze scope/contracts from source inventory and official-source research; create the specification using installed templates/hooks.
2. Core model/tests and isolated UI/tests proceed in separate files; parent/report integration remains with root.
3. Validate invalidation, canonical export, bilingual/keyboard/theme/mobile flow and zero side effects; compare the existing budgets on the new built output.
4. Run the full gate, obtain guardian clearance, and establish the new task's bounded cycle before first push. Planned finite cap: 4 = one Preview + one Production + two emergency deployments, counting every state. The start boundary is observed and recorded; do not reset it after an attempt or exclude failed artifacts.
5. Push feature, require exact-head CI, PR/eligible merge, merged-SHA main CI, staged verification and same-artifact promotion; verify both domains within 90 seconds or follow known-good recovery. Missing standing credentials/configuration are reported; no claim that a manual fallback configured permanent CD.
6. Report observed release IDs/URLs/metrics and honest maturity of all fifteen capabilities. No success prediction in pre-release artifacts.
