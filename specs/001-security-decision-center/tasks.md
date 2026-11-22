# Tasks: Security Decision Center

**Input**: [spec.md](spec.md), [plan.md](plan.md), and linked design artifacts.
**Branch**: `feature/sadeed-security-decision-demo-20261122`
**Tests**: Explicitly requested by the owner. Verification boxes remain open until actual evidence is recorded.

## Phase 1: Setup

- [x] T001 Resolve the Spec Kit templates, inspect empty hooks, and record scope in `specs/001-security-decision-center/spec.md`.
- [x] T002 Record technical decisions and constitutional constraints in `specs/001-security-decision-center/plan.md` and supporting design documents.

## Phase 2: Foundation

- [x] T003 Extend the compatible fixture with bilingual fields and synthetic evidence in `src/lib/sadeed/security-decision-demo.ts`.
- [x] T004 Add guarded local stages, review outcomes, and reset to `src/lib/sadeed/security-decision-demo.ts`; preserve `approvalRequired: true` and operational status `awaiting_human_approval`.

## Phase 3: US1 — Understand the scenario (P1, MVP)

**Independent check**: The guest can open the center and identify fictional event, evidence, rationale, source, and available demonstration action.

- [x] T005 [US1] Verify nonempty bilingual fixture/evidence and simulation invariants in `src/lib/sadeed/security-decision-demo.test.ts`.
- [x] T006 [US1] Present the fixture, persistent disclosure, evidence, and rationale in `src/components/sec/SecurityDecisionCenter.tsx`.
- [x] T007 [US1] Register the route in `src/routes/_authenticated/sec.decision-center.tsx` and generated `src/routeTree.gen.ts`.
- [x] T008 [P] [US1] Add section discovery to `src/components/sec/sec-shell.tsx`, `src/lib/nav/screen-names.ts`, and `src/routes/_authenticated/sec.index.tsx`; preserve fixed main navigation.

## Phase 4: US2 — Explore stages and review (P1)

**Independent check**: Advance a fresh scenario to review, try both local outcomes on separate runs, reset, and confirm no operational approval or action occurs.

- [x] T009 [US2] Verify valid/invalid/repeated transitions, review invariants, and reset in `src/lib/sadeed/security-decision-demo.test.ts`.
- [x] T010 [US2] Connect progression, recommendations, local audit, simulated review, and reset in `src/components/sec/SecurityDecisionCenter.tsx`.
- [x] T011 [US2] Verify the rendered interaction journey using the repository's UI test conventions for `src/components/sec/SecurityDecisionCenter.tsx`.

## Phase 5: US3 — Bilingual responsive presentation (P2)

**Independent check**: Switch language mid-flow, verify direction and preserved state, and inspect keyboard/mobile controls in both themes.

- [x] T012 [US3] Complete Arabic/English copy, route-scoped RTL/LTR, keyboard focus, token colors, and 44px controls in `src/components/sec/SecurityDecisionCenter.tsx`.
- [x] T013 [US3] Run Arabic/English and dark/light browser checks at 360/390/430/768/1280px against `src/routes/_authenticated/sec.decision-center.tsx`; record actual results below.

## Phase 6: Quality and Preview

- [x] T014 Run `npm ci` and the full `npm run check` gate from `package.json`; record checks, fixes, and limitations below.
- [x] T015 Obtain explicit QA guardian clearance for the final diff under `SADEED_CONSTITUTION.md` Article 17, including protected-file and forbidden-pattern checks.
- [ ] T016 Fetch/check the current feature ref, preserve concurrent changes, and commit/push only the requested branch after successful checks; record SHA below.
- [ ] T017 Verify the final matching Preview deployment and `/sec/decision-center` route, recording URL/status/commit or concrete blocker below. Do not deploy Production.

## Dependencies and parallel work

T001–T002 precede T003–T004. US1 and US2 share the fixture/state foundation; implement the model and tests while the UI is built in a separate file. T008 navigation work can proceed alongside UI after the route path is settled. US3 refines the completed UI. Quality/Preview follows implementation and evidence, with a single final session commit.

## Evidence

- Implemented T003–T012: compatible bilingual fixture/evidence, guarded local reducer, interactive route/component, section discovery, locale/direction, and literal 44px primary controls. Browser measurement found rem-based targets were 40px under the application root size; explicit 44px dimensions correct that.
- Focused verification reported by the primary agent: 11 model tests (including exact route-scope coverage), 4 UI tests, and axe checks in initial Arabic and interactive English review states passed. UI cases cover progression, acknowledgement, both simulated outcomes, reset, and retained language-switch state.
- Browser discovery: the blanket `StaffNumberGate` blocked the synthetic route. `isSecurityDecisionDemoRoute()` now exempts only `/sec/decision-center` and the same path with one trailing slash from staff attribution in `src/routes/__root.tsx`. No fake employee number is collected or written; neighboring operational gates and noindex remain unchanged. `src/lib/access/staff-entry.test.ts` records this boundary.
- Initial full ESLint: 0 errors, 32 preexisting warnings; TypeScript passed. These are preliminary results, not completion of T014.
- The first full Vitest attempt hit the existing n8n deliberately quadratic mutant test timeout at 6857ms under default parallel load. The run was stopped for isolation; the full suite and final gate remain pending.
- T013 browser matrix, final full quality gate, guardian clearance, push, and Preview verification remain open.

### Browser and harness evidence

- Playwright: **6/6 passed**. Covered both simulated outcomes/reset/evidence/language continuity with zero mutating HTTP requests, clean guest entry without staff data, retained noindex, and attribution on neighboring `/sec/incidents`. All 20 width/language/theme combinations passed; primary and new navigation controls measured at least 44 CSS pixels. The active English link is fully visible at 390px.
- Scoped navigation centering responds to locale changes; shared navigation policies remain unchanged.
- The initial n8n failure was reproduced in isolation: the deliberately quadratic envelope mutant took about 6.9s against the runner's default 5s. Its per-case runner timeout is now 15s; the real-code 400ms assertion, 20,000-character hostile fixture, and mutation are unchanged. **105/105** n8n checks then passed. No n8n runtime/workflow change.
- Secret scan: **3,479 staged/tracked files clean**. Production-dependency audit passed the configured high-severity gate, with **0 high/critical and 10 existing lower-severity findings (3 low, 7 moderate)**. Lockfile and dependencies are unchanged.

### Final verification and approved performance allowance

- `npm test -- --maxWorkers=1` completed all **435 files**: **433 passed**, with **8,431 tests passed, 30 skipped, and 2 failed**. Both failures were repaired: the server multipart test now uses native Node web APIs (13/13 passed), and the new route has a bilingual, simulation-aware page narration (9/9 passed). The four affected narration/multipart/finn/twin suites then passed **187/187**. This is composite verification, not a claim that the original full invocation was green.
- `npm run typecheck` and full `npm run lint` passed after those repairs; lint retains 32 preexisting warnings in untouched files. `npm run build` succeeded. Protected Vite/region files and all operational APIs remain unchanged.
- The successful build measured **51.08 MiB public output**, **10.02508 MiB JavaScript**, **0.620975 MiB CSS**, **1.20 MiB largest JS**, and **10.96 MiB largest media**. The original aggregate limits failed by **26,299 JS bytes and 1,022 CSS bytes**.
- A concrete, technically reviewed proposal changes only aggregate JS **10 → 10.05 MiB** (+0.5%) and CSS **0.62 → 0.625 MiB** (+0.806%). The lazy route chunk is 18,140 bytes; bilingual fixture/narration/navigation account for the additional feature code. Total-output, largest-JS, media, symlink, empty-output, and target-selection checks remain intact. The proposed limits pass the completed build; **24/24** budget tests passed, including new aggregate one-byte-over boundary cases. **Owner explicitly approved these exact two bounded changes on 2026-11-22 in response to the concrete approval question, limited to completing Preview. No Production authority was granted.**
- `CHROMIUM_PATH=/usr/bin/chromium npm run check:contrast` passed all existing dark/light floors on the built output.
- Post-commit checkpoints T016/T017 are delivery evidence: their final commit and Preview status belong in the delivery report after this document is committed. No Production action is authorized.

- Final TypeScript after the two new budget boundary tests: passed. Final targeted ESLint and diff checks passed. Owner response: «أوافق على الزيادة المحدودة وإكمال Preview». The feature ref remained `ab3310c`; read-only `main` ref remained `968206f` before delivery.

- QA guardian reviewed the final staged diff and all evidence and issued explicit clearance: **«مصرَّح بالدفع»**. Delivery is restricted to the named feature branch and Preview. T016/T017 are post-commit checkpoints; their actual SHA/status are reported in the final delivery response rather than predicted here.
