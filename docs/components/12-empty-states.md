# 12 — Empty States · حالات الفراغ الفاخرة

**Emptiness is a screen too. A blank region is a broken promise; a designed empty state
is guidance. Every list, table, panel, feed and search in SADEED ships WITH its empty
state — no component review passes without one.**

---

## Anatomy (`NxEmptyState`)

```
        [ icon-32/48, white 24%, optional layer tint ]
              العنوان — ماذا كان سيظهر هنا (H3)
        سطر واحد: لماذا فارغ الآن، وماذا يعني (Body 72%)
              [ الإجراء الأول (Secondary) ] [ ثانوي (Ghost) ]
                 provenance line if data-backed (Micro)
```

Centered in the content zone, max-width 400, vertical padding ≥ 48. Never an
illustration circus — one stroke icon, two lines, ≤ 2 actions. Tone: calm, factual,
guiding; never cute, never apologetic.

## The empty grammar — three honest kinds

| Kind                                  | Meaning                        | Rules                                                                                                                                                        |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **فارغ بحق** True empty               | Nothing exists yet             | Title names what will live here; action creates/starts the first one ("أضف أول توصية") or explains how items arrive ("تظهر التوصيات هنا فور صدورها من FINN") |
| **فارغ بالتصفية** Filtered empty      | Items exist, filters hide them | States the active filters as chips + "مسح التصفية" action; NEVER looks identical to true empty (the executive must know data exists)                         |
| **فارغ بالنتيجة** No results (search) | Query matched nothing          | Echoes the query ("لا نتائج لـ «…»"), offers مسح البحث + broaden suggestion when computable                                                                  |

## Per-surface empties (binding examples)

| Surface                 | Empty state                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approval queue          | "لا اعتمادات معلّقة — كل القرارات محسومة" + ✓ icon success-tinted; this is GOOD news and may look like it (the one celebratory-calm empty)                        |
| Event stream            | "لا أحداث في هذه النافذة" + time-range chips to widen                                                                                                             |
| KPI panel (no data yet) | KPI skeleton → after 4s: reference values with `is_simulation` badge (بيانات لا تفرغ doctrine) — the empty state here is the _simulation fallback_, never a blank |
| FINN conversation       | Opening prompt suggestions (3 chips of high-value questions) — FINN's empty is an invitation                                                                      |
| Shell registry views    | "لا عناصر من هذا النوع بعد" + "أنشئ عبر NDK" pointer (doc-linked, no execution affordance)                                                                        |
| Audit views             | True empty never shown once system live; zero-result filters only (audit trails always have a genesis)                                                            |
| Twin viewport           | Asset silhouette + "بانتظار أول قراءة" + connection state chip                                                                                                    |
| Error-adjacent empty    | If emptiness is caused by a failure, it is an ERROR state (doc 13), not an empty — do not disguise failures as calm emptiness                                     |

## Laws

1. Every empty answers three questions: what belongs here · why it's empty · what to do
   next. Missing any = finding.
2. Empty states inherit the panel's layer accent (a runtime panel's empty is
   runtime-tinted at 24% icon) — the OS stays recognizable even when vacant.
3. Empties are static — no looping animation begs attention toward nothing.
4. Mobile: same anatomy, padding 32, actions stack.
5. The executive never meets a dead end: at minimum, one action or one explanation of
   how content arrives. **Never show blank screens** — this sentence is the law.
