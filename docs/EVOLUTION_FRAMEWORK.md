# ARIA Autonomous Evolution Framework / إطار التطور الذاتي لـ ARIA

> Enterprise engineering doctrine for the ARIA platform.
> دستور هندسي لمنصة ARIA — تطور ذاتي محكوم بالأدلة.

## 1. Purpose / الهدف

Continuously **analyze → plan → validate → benchmark → report** without violating production invariants. No autonomous code mutations. Every proposal is evidence-first and requires human approval.

تطوير مستمر مبني على الأدلة، بدون تعديل تلقائي للإنتاج، وبمراجعة بشرية لأي تغيير.

## 2. Architecture / المعمارية

```
src/lib/aria/self-evolution/     ← THIN orchestrator (this framework)
├── engine.server.ts             ← runSelfEvolution()
├── types.ts                     ← EvolutionReport, EvolutionIssue, invariants
└── index.ts                     ← public barrel

Composes (never duplicates):
├── src/lib/aria/production/      ← readiness + release gate
├── src/lib/aria/self-improvement/← evidence → gaps → proposals
└── src/lib/aria/evolution/       ← reflection, benchmarks, trends

Entry points:
├── src/lib/self-evolution.functions.ts  ← auth-gated createServerFn
└── src/routes/_authenticated/self-evolution.tsx  ← operator UI (AR/EN)
```

## 3. Pipeline stages / مراحل الأنبوب

| Stage | Contract | Failure mode |
|---|---|---|
| `analyze` | `evaluateRelease()` → readiness snapshot | fail → NO_GO, rollback |
| `plan` | `runSelfImprovementPipeline()` (only when input.improvement provided) | fail → NO_GO |
| `estimate_risk` | surfaces regressions + gaps counts | pass through |
| `apply_safe_changes` | records manifest of approved proposals; **never mutates code** | always safe |
| `detect_issues` | aggregates blockers/warnings/regressions/gaps → `EvolutionIssue[]` | warn if any |
| `validate` | readiness ≠ NO-GO AND improvement ≠ NO_GO | fail → decision NO_GO |
| `benchmark` | reports comparison count | unknown when 0 |
| `report` | final `EngineDecision` + reasons | always emits |

## 4. Invariants (runtime-enforced) / الثوابت المحمية

Returned in every `EvolutionReport.invariants`:

| Invariant | Guarantee |
|---|---|
| `preserveArchitecture` | orchestrator only, no new engines |
| `preservePublicApi` | no barrel change in `evolution/`, `self-improvement/`, `production/` |
| `preserveSingletons` | ARIA brain/provider/store untouched |
| `preserveSecurity` | server fn wrapped in `requireSupabaseAuth` |
| `preserveAriaIdentity` | no changes to `aria-core/*` from this framework |
| `zeroBreakingChanges` | additive files only |
| `zeroPlaceholders` | evidence-first; nothing invented |
| `zeroDuplicateEngines` | composes existing engines, does not fork them |

## 5. Operator surface / واجهة المشغّل

**Route:** `/_authenticated/self-evolution` (bilingual AR/EN).
Renders:
- decision badge + readiness score
- pipeline stages with pass/warn/fail/unknown status
- detected issues grouped by severity
- release gate blockers / warnings / next-actions
- protected invariants checklist
- applied vs deferred proposal counts

**Server function:** `runSelfEvolutionFn` (POST, auth required):
```ts
const run = useServerFn(runSelfEvolutionFn);
const report = await run({ data: { enableApply: false } });
```

## 6. Contracts / العقود

```ts
type EngineDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";

interface EvolutionReport {
  startedAt: string; finishedAt: string;
  decision: EngineDecision;
  readinessScore: number;              // 0..1
  readiness: ReleaseDecisionReport | null;
  improvement: SelfImprovementReport | null;
  issues: EvolutionIssue[];
  stages: EvolutionStageResult[];
  applied: string[];                   // approved proposal ids (manifest)
  deferred: string[];                  // everything else
  reasons: string[];
  invariants: EvolutionInvariants;
}
```

## 7. Language & output policy / سياسة اللغة

Every engineering surface renders both Arabic (primary) and English (secondary). RTL-safe. No serif fonts. Uses the project's semantic ARIA-HUD tokens; no hardcoded colors in the operator route.

## 8. Definition of done / تعريف الإنجاز

A cycle is complete only when:
1. TypeScript compilation passes (`npm run typecheck`) — ✅
2. Build passes (harness-managed) — ✅
3. Zero duplicate engines/singletons introduced — ✅
4. Public API of composed modules unchanged — ✅
5. Auth middleware attached to every server surface — ✅
6. Report emits a decision AND a reasons list — ✅

## 9. Non-goals / خارج النطاق

- Autonomous code refactoring.
- Auto-merging proposals.
- Bypassing `requireSupabaseAuth`.
- Introducing a second brain, avatar, voice, or provider.
- Direct AI-model calls from page components.
