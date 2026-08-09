# 13 — Error States · حالات الخطأ

**Failure is information. SADEED errors are neutral, specific, Arabic, and always paired
with a way forward. Doctrine: no authentication jargon ever reaches the user (any
/authenticat|unauthor|token/i is replaced by neutral Arabic + retry — Constitution-level
law inherited from engineering doctrine).**

---

## Anatomy (`NxErrorState`)

Same skeleton as EmptyState (icon → title → line → actions) with the error grammar:

- Icon: stroke glyph in `--nx-warning` (recoverable) or `--nx-critical` (blocked) at 32.
- Title: what failed, named ("تعذّر تحميل مؤشرات الأداء").
- Line: honest cause class + what the OS is doing/did ("انقطاع مؤقت في الاتصال — سنعيد
  المحاولة تلقائيًا").
- Actions: **إعادة المحاولة** (Secondary, always first when retry is possible) + Ghost
  secondary (تفاصيل / الدعم / رجوع).
- Detail disclosure: error code + trace id (mono Latin, copyable) behind "تفاصيل تقنية"
  — visible for support, never shouting.

Inline field errors use the input error slot (doc 02); operation failures use
notifications (doc 09); zone/screen failures use this component.

## The eight error surfaces

| Error             | Treatment                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Network**       | Warning-class; auto-retry with backoff + countdown chip ("محاولة خلال ٥ث"); stale data stays visible with a "قديم" chip rather than being torn down; recovery announces via SuccessNotice                                                           |
| **Runtime**       | Module failure zone: RuntimePanel renders error state with module name + last healthy time; "أعد تشغيل الوحدة" only for permitted roles, else "أبلغ التشغيل"; OS-level degradation adds the Banner                                                  |
| **Authorization** | Session-class failure. NEVER the word "authentication/unauthorized/token": neutral "انتهت الجلسة — استأنف من فضلك" + resume action; guest-viewable surfaces silently fall back to public/simulation data (doctrine: authed-first → public fallback) |
| **Permission**    | Role-class: "هذا الإجراء يتطلب صلاحية أعلى" + who to ask ("مدير المنطقة") ; the control renders disabled-with-reason tooltip BEFORE the attempt where known (prevention over error)                                                                 |
| **Knowledge**     | Source unavailable: title + source name + freshness of cached copy if shown ("نسخة بتاريخ…"); never render half a document silently                                                                                                                 |
| **Agent**         | SADEED/specialist failure: presence ring dims to 38%; honest line ("تعذّر إكمال التحليل") + retry; voice flow: SADEED speaks one status line and returns to listening (guaranteed-reply doctrine) — the conversation never dies silently            |
| **System**        | Whole-screen failure (route error boundary): full ErrorState with obsidian calm, trace id, "الرئيسية" + retry; TopNav stays functional — the OS never fully whites/blacks out                                                                       |
| **Unexpected**    | The catch-all boundary: generic-but-calm ("حدث خطأ غير متوقع") + trace id + retry; auto-reported; NEVER exposes stack traces, raw English, or library names to the executive                                                                        |

## Laws

1. Every error: named subject + cause class + one action. "خطأ" alone is a defect.
2. Color: warning = recoverable/degraded, critical = blocked; body surfaces never flood
   with status color (chips/bars/icons only — Ch. 03).
3. Errors never destroy user input; forms preserve state through failure.
4. Retry is idempotent-safe: destructive operations never auto-retry; they re-confirm.
5. Every error state has a designed reduced form for inline/small contexts (chip + tooltip).
6. Honesty beats reassurance: if data may be stale, say "قديم"; if simulation replaced
   live, the badge shows. Calm and truthful — like the rest of the OS.
