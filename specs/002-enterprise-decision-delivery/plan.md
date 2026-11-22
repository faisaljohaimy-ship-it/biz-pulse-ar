# Implementation Plan: Enterprise Decision and Delivery Iteration

**Branch**: `feature/sadeed-enterprise-delivery-20261122` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

## Summary

Build on the verified `60b3f2f` decision-center Preview: add a small bilingual synthetic scenario catalog, accountable decision metadata, alternatives with tradeoffs, and client-side executive export. Persist the new owner's permanent feature/CI/PR/conditional-auto-merge/Production/verification/recovery policy without deleting current safeguards. Repair the two reproduced resource boundaries: bounded FINN body transport and Task Bus completion despite noncooperative agents. Audit architecture/security/orchestration with evidence levels, then release only after the actual required gates.

## Technical Context

- **Language/Version**: Existing TypeScript 5.8 / React 19 / TanStack application; Node 22–24 and npm lockfile.
- **Dependencies**: Reuse installed UI, i18n, router, browser download capabilities, and existing check/release scripts. Add no runtime dependency for export.
- **Resource repairs**: Reuse the existing bounded body reader in `src/routes/api/finn/chat.ts` so bytes/deadline are capped before a model call. Race Task Bus `agent.run` against existing deadline/parent abort, with preabort rejection, cleanup, and late-result handling. This bounds dispatch completion; it cannot forcibly terminate underlying signal-ignoring code or replace tool authorization.
- **Storage**: Scenario/decision state remains local and synthetic. Policy, audit, and release evidence are repository artifacts; no new production database surface.
- **Testing**: Vitest/Testing Library, export/transition/eligibility regressions, TypeScript, ESLint, build/performance/contrast/secrets/audit, responsive browser checks, exact-SHA CI, deployed identity/route/health verification.
- **Target/Scope**: Existing web route plus policy/audit and the smallest delivery-automation changes required by the new directive.
- **Performance**: Keep scenario and export implementation small; existing approved budgets apply. Any new budget change requires concrete evidence and authorization.

## Constitution Check

- Articles **1, 3, 13–15, 21, 32–34**: SADEED branding; bilingual/RTL/LTR, clear fictional source, 44px primary controls, accessible responsive themes, existing tokens/preferences.
- Articles **5, 7**: Protected Vite/region/Nusuk assets unchanged; no secrets/production exports in tracked artifacts.
- Articles **6, 8, 12, 23, 24, 27**: Synthetic owner/due/status/options remain explicitly fictional; no operational actions, permissions, writes, live-confidence or compliance claims.
- Articles **16, 17, 30**: Full checks, explicit QA guardian clearance, meaningful rejection/safety tests before delivery. Compare eligibility to the exact current revision.
- Articles **18, 28, 29**: Capture known-good recovery identity; Preview first as applicable; Production authorization now exists but gates still apply. Verify identity/routes/health within the required release window; missing evidence is inconclusive, not green. Record recovery and preserve the emergency reserve.
- Articles **2, 19, 35**: Do not amend the constitution. Current owner direction supersedes earlier Preview-only and direct-to-main policies for delivery; document the resolved policy and preserve unrelated safeguards and other writers' changes.
- Existing production DB/auth/RLS/provider opt-in/spend restrictions remain. The enterprise directive is not blanket authority to alter these systems.

**Discovery gate**: This design is compatible with the bounded synthetic-feature and delivery scope. Live tenant isolation, auth flows, provider reliability, repository auto-merge capability, required credentials, and final release checks are not assumed proven. Re-evaluate with implementation evidence before release.

## Project Structure

```text
specs/002-enterprise-decision-delivery/
  spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md
  contracts/decision-and-release.md, checklists/requirements.md
src/lib/sadeed/security-decision-demo.ts (existing reducer)
src/lib/sadeed/security-decision-scenarios.ts, security-decision-scenarios.test.ts
src/lib/sadeed/security-decision-report.ts, security-decision-report.test.ts
src/components/sec/SecurityDecisionCenter.tsx
src/components/sec/SecurityDecisionCenter.test.tsx
src/routes/api/finn/chat.ts, src/routes/api/-chat-guard.ts
src/lib/finn-agent/finn-chat-route.test.ts
src/lib/sadeed/task-bus/dispatcher.server.ts
src/lib/sadeed/task-bus/dispatcher.server.test.ts
AGENTS.md, CLAUDE.md
.github/workflows/ci.yml, .github/workflows/deploy-vercel.yml
scripts/ (existing verification/release helpers, as selected by implementation audit)
```

Reuse the existing route, exact synthetic staff-gate exception, noindex, model/reducer, navigation, and narration. Keep policy changes distinct from runtime authority. Prefer adapting existing workflow/verification helpers over duplicating release logic. The architecture/delivery evidence matrix is `docs/audit/ENTERPRISE_DELIVERY_REPORT_2026-11-22.md`; live catalog/security evidence is `docs/audit/ENTERPRISE_SECURITY_REVIEW_2026-11-22.md`. The repeatable presentation guide is `docs/operations/EXECUTIVE_DEMO_AR.md`.

## Verification and Delivery

1. Establish current code/workflow baseline and prior Preview evidence; record proposed final scope and gaps.
2. Implement catalog/decision/export behavior, bounded body/dispatch repairs, and regression cases; persist owner policy and audit findings.
3. Run full local gate and responsive checks; obtain QA clearance; push the feature and require CI green on that exact head.
4. Re-read PR eligibility/current head. Enable native auto-merge where available or use an explicit conditional merge path matching policy, preserving protections; a limitation is reported, not bypassed.
5. Deploy only the merged revision to the intended Vercel project/environment; record last verified recovery target first.
6. Verify deployed build identity, essential routes and health, including the decision center. On failure/inconclusive verification, execute/document the authorized known-good recovery path and verify recovery.
7. Report actual release outcome and remaining enterprise gaps. Do not call a reviewed architecture or synthetic UI production incident management.
