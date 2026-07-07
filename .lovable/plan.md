# 🏛️ برومبت هندسي دستوري — تصفير تأخير ARIA + تعلّم ذاتي

## الهدف
جعل ردّ ARIA في الشات بوت **فوريّاً بلا تأخير محسوس** على الجوال/التابلت/اللابتوب/الديسكتوب، مع تحويلها إلى وكيل ذاتي التعلّم والإصلاح كقاعدة هندسية دائمة (INVARIANT‑9..12).

---

## 1) تشخيص فعلي (audit قبل التغيير)
- تشغيل E2E عبر Playwright على viewport `440×799` و`1280×1800`:
  1. فتح `/`، فتح ARIA، إرسال سؤال، قياس **TTFB**, **first-token**, **first-audio**, **total**.
  2. تسجيل console `[aria-latency]` + `[aria-motion]` + `network waterfall`.
- مراجعة `ai_gateway_logs--list_ai_gateway_requests` آخر 24 ساعة لرصد بطء الموديل/429.
- فحص `src/routes/api/chat.ts` و`AriaCopilot` (streaming, TTS gate, تقسيم الجُمل).

## 2) إصلاحات الأداء (كود)
- **Priority tier** لموديل الدردشة الحالي `openai/gpt-5` عبر `providerOptions.lovable.service_tier = "priority"` (Fast mode ✓).
- **Prewarm** على mount الـ dock: `POST /api/chat` warm-ping (خالٍ من tokens) + preconnect لـ gateway/ElevenLabs (موجود جزئياً — نُعمّمه).
- **Speculative send**: بدء `fetch("/api/chat")` عند أول keystroke بعد 250ms idle، وإلغاؤه إن حرّر المستخدم النص (AbortController).
- **Optimistic UI فوري**: عرض فقاعة المستخدم + shimmer "…" في نفس نبضة الإرسال (قبل أي شبكة).
- **Streaming أسرع**: خفض عتبة أول جملة إلى ≥8 أحرف بدل 12 لتشغيل TTS مبكراً.
- **TTS gate**: زيادة التوازي من 3 → 4 (سقف الاشتراك 5) + تجميع أول جملتين في fetch واحد.
- **iOS unlock**: `primeIOSAudio()` عند فتح الـ dock وليس فقط عند submit.
- **Composer focus**: تركيز تلقائي بعد كل رسالة (متطلّب chat contract).

## 3) موبايل/تابلت (تكميلاً لإصلاح اليوم)
- تثبيت `-webkit-tap-highlight-color: transparent` و`touch-action: manipulation` على أزرار header الـ dock.
- ضمان أن zoom‑in لا يحدث عند focus: `font-size: 16px` على textarea في iOS.
- تحسين `h-[calc(100dvh-…)]` لتفادي قفزات keyboard على iOS بـ `visualViewport` listener.

## 4) ARIA ذاتيّة التعلّم (Self‑Learning Constitution)
إضافة طبقة `src/lib/aria/learning/`:
- `interaction-log.server.ts` — يسجّل (سؤال، ردّ، latency، رضا/إعادة‑محاولة) في جدول Supabase `aria_interactions` (RLS: قراءة للـ user، كتابة عبر serverFn مصدَّق).
- `pattern-miner.server.ts` — كل N رسائل يستخرج أنماط (أسئلة متكررة، أخطاء متكررة) ويكتب `aria_learned_patterns`.
- `prompt-injector.server.ts` — يحقن أفضل 5 أنماط عالية الثقة (≥0.7) في system prompt كـ "instincts".
- **INVARIANT‑9** (تعلّم): كل ردّ يُقاس ويُخزَّن؛ لا تعلّم بلا قياس.
- **INVARIANT‑10** (أمان التعلّم): لا نمط يُحقن ما لم يمرّ عبر safety filter + confidence≥0.7 + ≥3 مشاهدات.
- **INVARIANT‑11** (تجدد): كل 7 أيام تُعاد حساب الثقة؛ الأنماط غير المشاهدة 30 يوماً تُحذف.
- **INVARIANT‑12** (شفافية): لوحة `/aria/learned` تعرض ما تعلّمته آريا (للمالك فقط).

## 5) Self‑Healing (إصلاح ذاتي)
- `src/lib/aria/self-healing/watchdog.client.ts`:
  - يراقب `chat.status === "error"` → retry تلقائي مرة واحدة بـ exponential backoff (500ms).
  - عند 3 فشل متتالٍ → fallback موديل من `gpt-5` إلى `gpt-5-mini`.
  - يبثّ حدث `aria:degraded` تلتقطه لوحة الحالة.
- تسجيل الأعطال في `aria_incidents` لتحليل self‑evolution.

## 6) الدستور (ملف دائم)
تحديث `docs/ARIA_INTRO_CONSTITUTION.md` → إضافة قسم **"ARIA Runtime Constitution"** بـ INVARIANT‑9..12، ونسخة مختصرة في `mem://constraints/aria-runtime-constitution.md`، وربطها في `mem://index.md`.
حماية المسارات في `self-evolution/engine.server.ts` (`PROTECTED_PATHS`) لتشمل `learning/` و`self-healing/` — أي مقترح تعديل يجب أن يستشهد بالدستور صراحةً وإلا يُرفض.

## 7) قاعدة بيانات
Migration جديدة (مع GRANTs + RLS):
```
aria_interactions (id, user_id, question, answer, latency_ms, model, satisfied, created_at)
aria_learned_patterns (id, pattern_key, pattern_value, confidence, hits, last_seen)
aria_incidents (id, kind, detail, occurred_at)
```

## 8) اختبارات ومعايير النجاح (Definition of Done)
- E2E: `first-token ≤ 900ms` (p50), `first-audio ≤ 1800ms` (p50) على 3G-fast محاكاة.
- `bunx tsgo --noEmit` نظيف؛ صفر console errors؛ صفر 4xx/5xx حرجة.
- الاختبارات تعمل على viewports: 390×844, 440×799, 1024×1366, 1280×1800, 1920×1080.
- زر إغلاق ARIA مرئي وقابل للضغط على كل viewport (يبني على إصلاح اليوم).
- Playwright يوثّق before/after بلقطات + JSON قياسات.

## Technical implementation notes
- Priority tier: عبر AI SDK يُضبط بـ `providerOptions: { lovable: { service_tier: "priority" } }` في `streamText`.
- Speculative request في `AriaCopilot.submit` باستخدام `AbortController` مربوط بـ `draft` state.
- `visualViewport.addEventListener("resize", …)` لضبط ارتفاع الـ dock ديناميكياً على iOS keyboard.
- جميع serverFns الجديدة تحت `src/lib/aria/learning/*.functions.ts` مع `requireSupabaseAuth`.

---
هل أنفّذ هذا كاملاً الآن (audit + إصلاحات الأداء + طبقة التعلّم + Self‑Healing + الدستور + migration + اختبارات)؟
