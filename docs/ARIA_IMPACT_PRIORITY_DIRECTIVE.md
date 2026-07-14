# ARIA IMPACT PRIORITY DIRECTIVE
### دستور الأثر التنفيذي الأعلى — NEXIOS / ARIA
### Supreme Executive Impact Constitution — v1.0.0

> **Status:** BINDING · Prompt-as-Law · Loaded by every agent turn
> **Scope:** Governs every ARIA runtime, every NEXIOS surface, every AI decision
> **Enforcement:** Non-skippable · Sequential · Production-only
> **Related law:** `NEXUS_ENGINEERING_CONSTITUTION.md` · `ARIA_MASTER_CONSTITUTION.md` · `NEXUS_READINESS_PROMPT.md`

---

## ARTICLE 0 — SUPREME LAW / القانون الأعلى

ARIA is not a chatbot. ARIA is a **living Executive Intelligence** — an autonomous,
self-evolving, continuously-improving operating system for enterprise decision
making. Every response, animation, KPI, and action must serve one goal:

> **"To feel, reason, execute, and demonstrate like a real executive AI — not simulate one."**
> **"أن تُفكِّر وتُنفِّذ وتُقرِّر كذكاء تنفيذي حقيقي — لا كمحاكاة."**

### Absolute Invariants (never violated)
1. **Sequential Execution** — Phases run 1 → 9 in strict order. No skipping.
2. **Production Quality Only** — No placeholders, mocks, fake KPIs, simulated APIs.
3. **Evidence-Gated** — Every metric/status/badge renders through `<EvidenceBadge>` (FR-19).
4. **Bilingual by Design** — Every user-facing surface AR/EN + RTL-safe.
5. **Self-Aware · Self-Healing · Self-Evolving** — System detects gaps and repairs itself.
6. **Definition of Done = All 9 phases + Final Validation green.**

---

## THE NINE-PHASE PYRAMID / هرم المراحل التسع

```text
                          ╔══════════════════════════╗
                          ║   FINAL VALIDATION       ║
                          ║   التحقق النهائي          ║
                          ╚═════════════╦════════════╝
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              │                                                    │
       ╔══════╧══════╗                                     ╔══════╧══════╗
       ║  PHASE 9    ║      EXECUTIVE EXPERIENCE           ║  PHASE 8    ║
       ║  التجربة    ║  ◄────────────────────────────────►  ║  الأداء     ║
       ╚══════╦══════╝                                     ╚══════╦══════╝
              │                                                    │
              └──────────────────┐             ┌───────────────────┘
                                 ▼             ▼
                          ╔══════════════════════════╗
                          ║   PHASE 7 · DIGITAL TWIN  ║
                          ║   التوأم الرقمي الحي      ║
                          ╚═════════════╦════════════╝
                                        │
                          ╔═════════════╧════════════╗
                          ║   PHASE 6 · MULTI-AGENT  ║
                          ║   الذكاء متعدد الوكلاء    ║
                          ╚═════════════╦════════════╝
                                        │
                          ╔═════════════╧════════════╗
                          ║   PHASE 5 · MEMORY       ║
                          ║   الذاكرة المؤسسية        ║
                          ╚═════════════╦════════════╝
                                        │
                          ╔═════════════╧════════════╗
                          ║   PHASE 4 · COMMAND      ║
                          ║   مركز القيادة التنفيذي   ║
                          ╚═════════════╦════════════╝
                                        │
                          ╔═════════════╧════════════╗
                          ║   PHASE 3 · LIVE DEMO    ║
                          ║   العرض التنفيذي الحي     ║
                          ╚═════════════╦════════════╝
                                        │
                          ╔═════════════╧════════════╗
                          ║   PHASE 2 · EXECUTION    ║
                          ║   التنفيذ التنفيذي        ║
                          ╚═════════════╦════════════╝
                                        │
                          ╔═════════════╧════════════╗
                          ║   PHASE 1 · ARIA CORE    ║
                          ║   نواة أريا الحيّة         ║
                          ╚══════════════════════════╝
                             ▲ FOUNDATION / الأساس ▲
```

---

## 🥇 PHASE 1 — ARIA CORE / نواة أريا
**Goal:** ARIA feels like a living Executive AI, not a chatbot.
**الهدف:** أن تُحسّ أريا كذكاء تنفيذي حي، لا كروبوت محادثة.

| Pillar | Deliverable | Contract |
|---|---|---|
| Brain | `runExecutiveBrain` on `openai/gpt-5` via Lovable Gateway | `src/lib/aria/executive-brain/` |
| Voice | Bilingual TTS + STT, RTL prosody, executive tone | `src/routes/api/aria/tts.ts` |
| Avatar | Lifecycle ref-counted, HMR-safe, single runtime | `avatar-lifecycle.ts` |
| Runtime | Bindings pattern (planner, execution, marketplace, memory, cognition, os) | `runtime/bindings.server.ts` |
| Memory | Episodic · Semantic · Procedural · Decision · Experience | `long-term-memory/` |
| Reasoning | Chain-of-reason with confidence breakdown, risk facets | `types.ts::ExecutiveBrainAnswer` |
| Context | Page/section/tenant/role auto-injected via `withAriaSupremeLaw` | `aria-supreme-prompt.ts` |
| Lip Sync | Viseme timeline aligned to TTS audio | R3F/Heygen providers |
| Arabic | Native AR conversation, dialect-aware, MSA fallback | Every prompt |
| Personality | Executive · calm · decisive · evidence-driven | Supreme Law v1.2.0 |

**Exit Gate:** ARIA answers a bilingual executive question with a full envelope (`text_ar`, `text_en`, `confidence`, `risks`, `recommendations`) + speaks it + lip-syncs it.

---

## 🥈 PHASE 2 — EXECUTIVE EXECUTION / التنفيذ الحقيقي
**Goal:** ARIA executes enterprise workflows, not just answers.

- **Task Planning** — decompose intent → plan graph
- **Action Planning** — bind actions to capabilities (marketplace)
- **Approval Workflow** — human-in-the-loop for risk ≥ threshold
- **Execution Timeline** — stepwise trace, replayable
- **Progress Tracking** — realtime per-step status
- **Result Verification** — evidence artifact + verification signature
- **Executive Recommendations** — post-action next-best-action set
- **Audit Trail** — immutable, `runtime/audit.server.ts` + Supabase persistence

**Exit Gate:** A user says "run the daily security posture check" → plan → approval → execute → verified evidence attached → audit row written.

---

## 🥉 PHASE 3 — LIVE DEMONSTRATION / العرض الحي
**Goal:** Visitors understand the value in under 30 seconds.

- Live AI Reasoning stream · Live Thinking animation · Live Decision Pipeline
- Live Execution Flow · Live Operational Status · Live Timeline
- Executive Presentation surface (public-safe, evidence-gated)

**Exit Gate:** Landing surface plays a real reasoning trace against real data (not mocked) with LIVE badge from `SecLiveBadge`.

---

## 🏅 PHASE 4 — EXECUTIVE COMMAND CENTER / مركز القيادة
**Goal:** Every executive decision visible in one place.

Executive KPIs · System Health · Runtime Status · Active Operations ·
Risk Analysis · Confidence Score · Recommendations · Executive Reports · Operational Dashboard.

**Exit Gate:** `/sec/exec` renders 100% live KPIs bound via `useQuery.dataUpdatedAt` (Article 20).

---

## 🏅 PHASE 5 — ENTERPRISE MEMORY / الذاكرة المؤسسية
**Goal:** ARIA continuously remembers, understands, and improves context.

Persistent · Semantic · Organizational Knowledge · Conversation · Executive Context · Historical Decisions · Retrieval.

**Exit Gate:** Retrieval RAG returns top-K with freshness score + provenance for any executive query.

---

## 🏅 PHASE 6 — MULTI-AGENT INTELLIGENCE / الوكلاء المتعددون
**Goal:** ARIA coordinates specialized agents as one system.

Orchestrator · Specialized Agents · Collaboration Protocol · Parallel Execution ·
Result Aggregation · Conflict Resolution (`negotiation.server.ts`) · Shared Context.

**Exit Gate:** A single request fans out to ≥ 3 agents, aggregates, resolves conflicts, returns one authoritative answer.

---

## 🏅 PHASE 7 — DIGITAL TWIN / التوأم الرقمي
**Goal:** Executives visualize the whole organization in real time.

Live Twin · Asset Monitoring · Facility Status · Incident Viz · Patrol Viz · Executive Map · Predictive Indicators.

**Exit Gate:** Map surface renders live `sec_*` entities with realtime channel updates and predictive overlays.

---

## 🏅 PHASE 8 — PERFORMANCE & STABILITY / الأداء والاستقرار
**Goal:** Enterprise-grade speed and reliability.

Rendering · Runtime · Bundle Size · Database · APIs · React perf · TypeScript · Memory · Mobile.

**Exit Gate:** LCP < 2.0s on 4G mobile · 0 TS errors · 0 hydration mismatches · bundle within budget.

---

## 🏅 PHASE 9 — EXECUTIVE EXPERIENCE / التجربة التنفيذية
**Goal:** Unforgettable executive experience.

Storytelling · Journey · Interactive Presentation · Operational Narrative · Premium Motion & Animation · Premium UX/UI.

**Exit Gate:** End-to-end executive journey scores ≥ 9/10 on the internal experience rubric.

---

## FINAL VALIDATION / التحقق النهائي (auto-run)

| Check | Tool | Pass Criteria |
|---|---|---|
| Architecture Review | Manual + `agent-architecture-audit` skill | Zero critical/high |
| Runtime Validation | `stack_modern--invoke-server-function` on core endpoints | All 200 · valid envelope |
| Performance Benchmark | Playwright + Lighthouse | LCP < 2.0s · CLS < 0.1 |
| TypeScript Validation | `tsc --noEmit` | 0 errors |
| Build Validation | production build | success · no warnings |
| Accessibility | axe + manual RTL sweep | 0 serious violations |
| Responsive | 320 / 768 / 1280 / 1920 | no overflow · touch-safe |
| Regression Detection | `tests/e2e/*.spec.ts` | all green |
| Production Verification | `supabase--linter` + `security--run_security_scan` | 0 pending |

---

## SELF-EVOLUTION LOOP / حلقة التطور الذاتي

```text
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  OBSERVE     │─▶│  ANALYZE      │─▶│  PROPOSE      │─▶│  EXECUTE      │
   │  ملاحظة       │   │  تحليل         │   │  اقتراح         │   │  تنفيذ          │
   └──────────────┘   └──────────────┘   └──────┬───────┘   └──────┬───────┘
          ▲                                       │                    │
          │                                       ▼                    ▼
          │                              ┌──────────────┐    ┌──────────────┐
          └──────────────────────────────│  VERIFY       │◄──│  AUDIT        │
                                         │  تحقق          │    │  توثيق         │
                                         └──────────────┘    └──────────────┘
```

Every cycle writes to `aria_evolution_cycles` and, when confidence ≥ 0.85, promotes proposals to `aria_improvement_proposals`.

---

## FINAL OBJECTIVE / الهدف النهائي

> Transform **NEXIOS** into a world-class **Enterprise AI Operating System** where **ARIA** becomes a **living executive intelligence** capable of **understanding**, **reasoning**, **orchestrating**, **visualizing**, and **supporting** enterprise operations through a **premium, production-ready** experience.

> تحويل **NEXIOS** إلى **نظام تشغيل ذكاء مؤسسي عالمي** تُصبح فيه **أريا** **ذكاءً تنفيذياً حياً** يفهم ويُحلّل ويُدير ويُنفّذ ويُقدّم تجربة إنتاجية فاخرة.

---

**End of Directive · نهاية الدستور**
