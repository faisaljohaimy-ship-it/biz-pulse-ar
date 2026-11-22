# Implementation Plan: Security Decision Center

**Branch**: `feature/sadeed-security-decision-demo-20261122` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

## Summary

Extend the existing deterministic fixture with bilingual content, synthetic evidence, and guarded local transitions. Present it at `/sec/decision-center` with scenario details, rationale, proposed actions, local audit progression, simulated review, and reset. Add `SecSubNav` and industrial-security landing discovery, preserving the guarded fixed main navigation.

## Technical Context

- **Language/Version**: TypeScript 5.8, React 19; Node 22–24 and npm lockfile.
- **Dependencies**: Existing TanStack Router, local i18n, shared UI primitives and tokens; no new dependencies.
- **Storage**: Component state only; no database, network, AI-provider, or operational-action integration.
- **Testing**: Vitest/Testing Library for fixture invariants and interaction; TypeScript, ESLint, build, full check scripts, and browser responsive/theme verification.
- **Target**: Responsive guest-accessible web application, industrial-security section.
- **Performance**: Synchronous local data/state; lazy route integration; existing build performance budget applies.
- **Scope**: One new route and scenario with bilingual interface and discovery links; exact synthetic-route staff-attribution exemption.

## Constitution Check

- Articles **1, 3, 13, 15**: SADEED branding, Arabic-first bilingual copy, RTL/LTR, existing tokens, 44px controls, required viewport checks.
- Articles **5, 7**: No changes to protected `vite.config.ts`, `regions.ts`, Nusuk integration, or credentials.
- Articles **6, 8, 12, 23, 24, 27**: Visible simulation; no measured-confidence claims, live integrations, operational approvals/writes, or agent-authority changes.
- Articles **14, 21**: Synchronous local content needs no remote loading state; immediately explain purpose, source, and next action; retain route boundaries.
- Articles **16, 17, 30**: Full gate before push, explicit QA guardian clearance, meaningful invalid-transition/safety checks.
- Articles **28, 29, 35**: Preview only; record deployment evidence, preserve other writers, fetch feature head before push. Current owner scope governs older main policy.
- Articles **32–34**: Existing providers own preferences; page direction follows locale; avoid inline final colors and verify dark/light.

**Pre/post-design result**: Compatible with authorized demo scope; no constitutional change required. Verification remains pending until evidence is recorded.

## Project Structure

```text
specs/001-security-decision-center/
  spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md
  contracts/ui.md, checklists/requirements.md
src/lib/sadeed/security-decision-demo.ts
src/lib/sadeed/security-decision-demo.test.ts
src/routes/_authenticated/sec.decision-center.tsx
src/routes/_authenticated/sec.index.tsx
src/components/sec/sec-shell.tsx
src/routes/__root.tsx
src/lib/access/staff-entry.test.ts
```

The route consumes the existing demo module. Browser verification found the blanket staff-number attribution overlay blocked this synthetic page; `isSecurityDecisionDemoRoute()` limits its exemption in `__root.tsx` to the exact path and one trailing slash. This avoids collecting or writing fake staff information. Operational-route gates and noindex behavior stay unchanged. Primary controls use literal 44px dimensions after browser measurements showed the application root size made rem-based targets 40px. Generated route-tree registration and the screen-name registry follow existing conventions. The separate `/security-center` access-administration page remains outside scope.

## Verification and Delivery

1. Test bilingual consistency, allowed/invalid transitions, review invariants, and reset.
2. Verify UI journeys in both languages/themes at supported widths, including deep links and keyboard focus.
3. Run `npm ci` and `npm run check`: lint, types, Vitest, build, performance, contrast, secrets, production-dependency audit. Repair authorized failures.
4. Obtain QA guardian clearance; commit once and push only the requested feature ref after checking concurrent updates.
5. Verify matching Preview commit, status, and route; report actual results and limitations. No Production action is part of this plan.
