# تقرير التدقيق والهجرة — NEXIOS (biz-pulse-ar)

تنفيذ مفوَّض كامل، مرحلةً مرحلة، مع commit + push بعد كل مرحلة.
**بوّابة البناء النهائية:** `tsc --noEmit` ✅ صفر · `eslint .` ✅ صفر أخطاء (84 تحذيراً) · `vitest` ✅ 79/79.
القواعد المطلقة المحترمة: لا secrets في أي ملف/commit · نشر Lovable الحيّ لم يُمَس · عربي أولاً RTL · بيانات المحاكاة `is_simulation=true` · DNS لم يُمَس.

---

## المرحلة 0 | شبكة الأمان ✅
- **فرع نسخة احتياطية `backup/pre-migration`** مدفوع إلى GitHub عند `873b572` (نقطة استعادة كاملة).
- وسم `v-pre-migration` أُنشئ محليّاً؛ دفعه إلى الريموت رفضه الوكيل (خلل بروتوكول تكرّر)، والفرع الاحتياطي يؤدّي نفس الدور تماماً.
- **`docs/ROLLBACK.md`**: خطة تراجع كاملة (إبقاء Lovable الحيّ + `git checkout v-pre-migration`/الفرع + إعادة Supabase Redirect URLs + عدم مسّ TXT/MX).

## المرحلة 1 | الحوكمة ✅
- **`CLAUDE.md` المادة 2 (القسم 7 — الحوكمة)**: تفويض تنفيذ تلقائي كامل؛ الاستثناء الوحيد للتوقّف = بيانات PII حقيقية + حذف بيانات إنتاجية. كل تغيير جذري = نسخة أمان + خطة تراجع + بوابة تحقّق ثم يُنفَّذ بلا اعتماد.
- **قاعدة DNS**: لا يُغيَّر إلا ببوابة تحقّق، `TXT`/`MX` لا تُمَسّ، نشر Lovable الحيّ محفوظ.
- القاعدة الثابتة قائمة: build ناجح→commit→push · لا secrets · `is_simulation=true` · عربي RTL.

## المرحلة 2 | الإصلاح الشامل ✅ (التقسيم جزئي موثّق)
- **الأسرار**: صفر في الكود وتاريخ git (المطابقات تعليقات/أنماط كشف). `.env` علني فقط (`sb_publishable_`)، `.env.example` وهمي.
  - **قرار تقني (‏.env و.gitignore)**: أُبقي `.env` متتبَّعاً **حتى تُتأكّد حياة Vercel ويُتقاعد Lovable** — إدراجه في `.gitignore` الآن يكسر إنتاج Lovable الحيّ (عُطل موثّق: خط بناء Lovable يحترم gitignore فيُفرّغ `VITE_SUPABASE_*`)، وهو شبكة أماننا. بعد الانتقال يُدرَج في `.gitignore` (Vercel يقرأ المتغيّرات من لوحته).
- **بطاقات KPI الفارغة**: `/os` صار `is_simulation:true` + شارة «محاكاة» بدل «لحظي» (‏os-overview + OsExecutiveStrip). الصفحات المصادَقة ذات `?? 0` تصيب نقاطاً حقيقية (0 قيمة صحيحة) — لا تُوسَم محاكاةً.
- **شارات ISO 27001/SOC 2** → «قيد الاعتماد / Pending certification» في `trust.tsx` (StatusPill + المفتاح) و`dpa.tsx` و`government-brief.tsx`.
- **المناطق الأربع**: `src/lib/regions.ts` **المصدر الوحيد** (لا `sec/regions.ts`، لا تكرار)؛ `region-markers.ts` يستورد نوع `RegionId` منه؛ 13 وحدة تستهلكه.
- **حظر browser TTS**: `audio-bus.ts` يستبدل `window.speechSynthesis.speak` بدالة تبتلع الصوت صامتةً (لا nativeSpeak/لا throw) + مراقب يُلغي أي نطق مارق. ElevenLabs حصراً؛ الفشل = صمت.
- **نصوص ARIA الـ31**: كلها مُشكَّلة بالكامل (تحقّق آليّ: **0 من 99 حقلاً ناقص التشكيل**)؛ أُضيف شكل **`display` + `tts`** عبر `pageScriptSpeech()`/`stripTashkeel()` (المصدر الواحد النص المُشكَّل؛ tts مُشكَّل، display منزوع للعرض النظيف).
- **ExecutivePresentationPlayer**: السرد يسار RTL، المعاينات تتقدّم على cue timestamps، + **شريط تقدّم قابل للسحب بعلامات المشاهد**، **زرّ تخطّي**، صفّ تحكّم تشغيل/إيقاف/تخطّي، **glassmorphism navy/emerald**، وخطوط **Cairo/IBM Plex Sans Arabic** (`var(--font-arabic)`).
- **معالجة أخطاء Supabase**: أُصلحت فجوات عالية القيمة (غير كاسرة): `enterprise-pulse` (بذر يُعاد عند الفشل)، `tool-orchestrator` (لا نجاح وهمي للقبول/الرفض)، `event-bus`، `api/chat`، `agent-runtime` (workflows/workflow_runs)، `tool-registry` (rollback الحوادث). فجوات أخرى في `exec/*` وخطّافات `api/public/hooks/*` موثّقة للمتابعة.
- **تقسيم ملفات +800 سطر**: **7 ملفات قُسّمت** (كلٌّ محتوى محفوظ + واجهة استيراد ثابتة + بوّابة بناء خضراء):
  `kb-seed.data.ts`، `page-narrations.ts`، `learn/scenarios.ts`، `enterprise-pulse.ts`، `sec.functions.ts`، `oms.functions.ts`، `executive-reports.tsx`.
  - **متبقٍّ 15 ملفاً** (مكوّنات/دوال ضخمة تتطلّب استخراج مكوّنات فرعية — إعادة هيكلة لا نقل بيانات): `AriaCopilot`، `mission-control`، `oms-dialogs`، `digital-twin`، `AriaDock`، `executive-bridge`، `tool-registry.server`، `aria-tools.server`، `operations`، `investor`، `agents`، `executive-showcase`، `cinematic-demo`، `command-center`، `NexusRevealHero`. تُقسَّم بحذر مع تحقّق تشغيلي (البناء الكامل محجوب في بيئة الفحص) — أُكملها ملفاً-ملفاً.
- **صفر أخطاء TypeScript/ESLint** محفوظ عبر كل الدفعات.

## المرحلة 3 | تجهيز Vercel ✅
- **`vercel.json`**: ترويسات أمان على كل المسارات (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` مع `microphone=(self)` لمخاطبة آريا)، `buildCommand: vite build`، `framework: null`.
- **قرار تقني**: **لا** `rewrites` إلى `/index.html` — التطبيق **SSR** (TanStack Start/nitro) بمسارات `/api` خادمية؛ SPA rewrite يكسر SSR وكل نقاط API. الاعتماد على مخرجات nitro لِـ Vercel عبر متغيّر البيئة **`NITRO_PRESET=vercel`** (موثّق في بطاقة Vercel).
- **الخطر/المجهول الوحيد**: إعداد البناء ملفوف بـ `@lovable.dev/vite-tanstack-config` (يفترض هدف Cloudflare)؛ `NITRO_PRESET=vercel` هو الطريق المتوقّع لتوجيهه إلى Vercel، لكن **لا يمكن اختبار بناء Vercel داخل بيئة الفحص** — يُتحقَّق فعليّاً عند أول نشر على Vercel (بطاقة ①).

## المرحلة 4 | بطاقات التنفيذ اليدوي ✅
- **`docs/GO_LIVE_CARDS.md`**: 3 بطاقات بعربي بسيط جدًا، خطوات مرقّمة بأسماء الأزرار الحرفية:
  ① Vercel (استيراد + متغيّرات البيئة بالاسم مع مصدر كل قيمة + `NITRO_PRESET=vercel` + Deploy)،
  ② Supabase Redirect URLs (‏vercel.app ثم neexios.com)،
  ③ الدومين (سجلّات A/CNAME إلى المسجِّل، إبقاء TXT/MX، التحقّق).

## المرحلة 5 | التسليم ✅
- هذا التقرير + git نظيف + GitHub متزامن.

---

## بنود مفتوحة (موثّقة)
1. **تقسيم 15 ملفاً** (مكوّنات React ضخمة) — يحتاج تحقّقاً تشغيليّاً؛ يُنفَّذ ملفاً-ملفاً.
2. **بقية فجوات Supabase** في `exec/*` وخطّافات `api/public/hooks/*`.
3. **بعد حياة Vercel**: إدراج `.env` في `.gitignore` وتقاعد نشر Lovable.
4. **`bun run build` الكامل** محجوب في بيئة الفحص (سجلّ Lovable الخاص)؛ اعتُمدت بوّابة `tsc`+`eslint`+`vitest`.
