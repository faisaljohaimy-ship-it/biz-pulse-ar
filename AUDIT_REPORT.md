# تقرير الفحص والإصلاح — NEXIOS (biz-pulse-ar)

> تنفيذ متعدّد المراحل، commit + push بعد كل مرحلة. الفحوصات النهائية:
> `tsc --noEmit` ✅ صفر · `eslint .` ✅ صفر أخطاء (84 تحذيراً) · `vitest` ✅ 79/79.
> القاعدة: عربي أولاً RTL · لا secrets · بيانات المحاكاة `is_simulation=true` · بلا مساس بـ DNS/النشر.

---

## المرحلة 1 — الأمان وسلامة الواجهة ✅

| البند | النتيجة |
|---|---|
| أسرار في الكود | **لا شيء** (المطابقة الوحيدة تعليق يذكر `service_role`). |
| أسرار في تاريخ git | **لا شيء** (مطابقات «PRIVATE KEY» أنماط كشف داخل أدوات الفحص). |
| `.env` | مفاتيح علنية فقط (`sb_publishable_…`)؛ **غير متجاهَل عمداً** (المادة 13 — تجاهله يكسر بناء Lovable). |
| `.env.example` | موجود بقيم فارغة/وهمية. |
| بطاقات KPI الفارغة | `/os` (‏`os-overview.ts` + `OsExecutiveStrip`) صار **`is_simulation: true`** + شارة «محاكاة» بدل «لحظي» (المادة 11). |
| شارات ISO 27001 / SOC 2 | `dpa.tsx` + `government-brief.tsx` + `trust.tsx` → **«قيد الاعتماد»** (StatusPill والمفتاح التفسيري). |

## المرحلة 2 — البنية ✅ (مُحقَّقة، لا تغيير مطلوب)

- **`regions.ts` مصدر وحيد**: 13 وحدة تستهلكه عبر `useRegion`/الاستيراد المباشر؛ `region-markers.ts` يستورد نوع `RegionId` منه. المطابقات الأخرى للمناطق مجرّد نصّ سردي وصفي، لا بيانات منافسة.
- **حظر TTS المتصفح عالميّاً**: `audio-bus.ts` يستبدل `window.speechSynthesis.speak` بدالة تبتلع الصوت صامتةً (لا nativeSpeak، لا throw)، مع مراقب يُلغي أي نطق مارق. كل الردود ElevenLabs حصراً؛ الفشل = صمت.

## المرحلة 3 — ARIA ✅

- **نصوص الـ31 نافذة (‏`page-scripts.ts`)**: تحقّق آليّ — **0 من 99 حقلاً عربيّاً ناقص التشكيل** (كلها مُشكَّلة بالكامل). أُضيف شكل **`display` + `tts`**: المصدر الواحد النص المُشكَّل (`tts` مُشكَّل، `display` منزوع التشكيل للعرض النظيف) عبر `pageScriptSpeech()` و`stripTashkeel()` — فتحمل كل نافذة الزوجين دون تكرار 99 نصّاً.
- **إكمال مشغّل العرض التنفيذي (`ExecutivePresentationPlayer`)**: السرد يسار RTL والمعاينات تتقدّم على cue timestamps (قائمة أصلاً) + **جديد**: شريط تقدّم قابل للسحب بعلامات المشاهد، زرّ **تخطّي** للمشهد التالي، صفّ تحكّم تشغيل/إيقاف/تخطّي، وتعزيز **glassmorphism navy/emerald** (backdrop-blur على اللوحة وشريط التحكّم).

## المرحلة 4 — الجودة والتقرير ✅ (جزئي موثّق)

**معالجة أخطاء Supabase — أُصلح (غير كاسر):**
- `enterprise-pulse.ts` (بذر يُعاد عند الفشل) · `tool-orchestrator.server.ts` (لا نجاح وهمي للقبول/الرفض) · `event-bus.server.ts` (markEvent) · `api/chat.ts` (إدخالات void) — [الفحص الأول]
- **جديد:** `agent-runtime.server.ts` (‏`workflows` و`workflow_runs`) · `tool-registry.server.ts` (مسار rollback الحوادث).

**تقسيم الملفات > 800 سطر:**
- **مولَّدة آليّاً — يُمنع تقسيمها**: `types.ts`، `routeTree.gen.ts`.
- **أُنجز**: `kb-seed.data.ts` (‏991 سطر) قُسّم إلى `kb-seed.base.ts` (35) + `kb-seed.articles.a.ts` (457) + `kb-seed.articles.b.ts` (504) + `kb-seed.data.ts` (13، يبقى واجهة الاستيراد العامة). المقالات محفوظة كاملةً (‏22+27)، وtsc يؤكّد صحّة التقسيم.
- **مؤجّل (يحتاج قرارك) — 21 ملفاً**: أغلبها ملفات مسارات/مكوّنات مليئة بالمنطق (‏`mission-control.tsx`، `AriaCopilot.tsx`، `digital-twin.tsx`، `oms-dialogs.tsx`، `AriaDock.tsx`، `tool-registry.server.ts`، `oms.functions.ts`، `aria-tools.server.ts`، `operations.tsx`، `investor.tsx`، `agents.tsx`، `sec.functions.ts`، `command-center.tsx`، `executive-reports.tsx`، `NexusRevealHero.tsx`، `enterprise-pulse.ts`، `executive-bridge.tsx`، `executive-showcase.tsx`، `cinematic-demo.tsx`، `page-narrations.ts`، `learn/scenarios.ts`). تقسيمها الجماعي في دفعة واحدة خطر انحداري يخالف قاعدتك «لا push لكود مكسور»؛ **الخطة**: ملفاً-ملفاً باستخراج وحدات مترابطة مع فحص كامل لكلٍّ (أبدأ بملفات البيانات `page-narrations.ts` و`learn/scenarios.ts` ثم طبقات الخادم ثم المكوّنات) — أنفّذها كسلسلة عند إشارتك.

**الفحوصات:** `tsc` صفر · `eslint` صفر أخطاء (84 تحذيراً: `no-explicit-any`، `react-refresh` — نمط shadcn المقصود، `exhaustive-deps`؛ إصلاحها الجماعي الأعمى يخاطر بانحدارات) · `vitest` 79/79.

---

## بنود بانتظار قرارك (موثّقة، غير منفّذة عمداً)

1. **تقسيم الـ21 ملفاً المتبقية** — كسلسلة PRs مع فحص لكل ملف (خطة أعلاه).
2. **بقية فجوات معالجة أخطاء Supabase** — قائمة أطول في طبقات `exec/*` و`api/public/hooks/*` وكتابات السجلّات؛ النمط: `if (error) throw` للحرِج، `console.error` لِما هو best-effort.
3. **بطاقات `?? 0`** في صفحات مصادَقة (‏`dashboard`, `mission-control`, `live-dashboard`, `sec.kpi`, `sec.vehicles/visitors/…`) — تصيب نقاطاً حقيقية حيث 0 قد يكون قيمة صحيحة؛ تحتاج تأكيد مصدر بيانات كل صفحة قبل وسمها.
4. **تبنّي `display`/`tts`** في مستهلكي `page-scripts` (اختياري) — الحقول متاحة الآن عبر `pageScriptSpeech()`.
5. **`bun run build` الكامل** لا يعمل في البيئة البعيدة (سجلّ Lovable الخاص يرفض التثبيت)؛ اعتُمدت بوّابة الدستور: `tsc` + `eslint` + `vitest`.
