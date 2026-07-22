# لوحة قيادة الوكلاء — /agents-flow

## الجزء صفر — إصلاح الرسم العربي (يسبق كل شيء)

**السبب الجذري:** النصوص العربية داخل `<text>` SVG لا تُشكّل حروفها ولا تحترم اتجاه bidi، فتظهر مفككة/معكوسة («ي رآ» بدل «FINN»).

**الإصلاح:**
1. في `AgenticFlowCanvas.tsx` وأي مخطط SVG آخر: استبدال كل `<text>` يحمل نصًا عربيًا بـ `<foreignObject>` يحتضن `<div dir="rtl" style="unicode-bidi:isolate">` — الحروف تُشكَّل بمحرك المتصفح الطبيعي.
2. مكوّن مشترك `<SvgLabel>` في `src/components/flow/SvgLabel.tsx` لإعادة الاستخدام (يقبل ar/en/description ويرسم البطاقة كاملة داخل foreignObject).
3. استخدام `command_agents.name_ar` كسطر رئيسي، والاسم الإنجليزي كسطر ثانوي رمادي صغير.
4. حذف كل عقدة بلا `name_ar` أو `description` من الاستعلام.
5. حساب `viewBox height` من عدد العقد + هامش سفلي كافٍ ⇒ لا قص.

## الجزء الأول — صفحة `/agents-flow`

### الملفات الجديدة
```text
src/routes/agents-flow.tsx                      — الصفحة العامة (خارج _authenticated)
src/lib/agents-flow.functions.ts                — server fns:
  ├─ getFlowTopology()      : nodes + edges + groups
  ├─ getAgentDetail(slug)   : capabilities + last 10 runs + queue + pending approvals + upstream/downstream slugs
  └─ getFleetSummary()      : counts (total/running/queued/pending-approval/avg-duration)
src/components/agents-flow/
  ├─ FlowHeader.tsx         — الترويسة التنفيذية + PageBriefing
  ├─ FlowChainStrip.tsx     — شريط «السابق ← الوكيل ← التالي» (RTL)
  ├─ FlowCanvasFull.tsx     — نسخة موسّعة من AgenticFlowCanvas بمجموعات تخصص + focus mode
  ├─ SvgLabel.tsx           — bidi-safe label داخل foreignObject (مشترك)
  ├─ AgentDrawer.tsx        — Sheet جانبي بتبويبات (نظرة/مهام/سجل/مخرجات معلّقة/ربط FINN)
  ├─ FlowTimelineStrip.tsx  — تدفق 24س + زر «تشغيل السيناريو»
  ├─ AgentListView.tsx      — جدول تنفيذي بديل
  ├─ FleetQueueView.tsx     — الطابور الشامل
  └─ view-mode-toggle.tsx   — الشبكة/القائمة/الطابور + وضع العرض
```

### الترويسة التنفيذية
شريط علوي مباشرة من `getFleetSummary()`:
`13 وكيلًا · N قيد التشغيل · M في الطابور · K بانتظار اعتمادك · متوسط زمن التشغيل`. شارة المحاكاة + `PageBriefing`.

### المخطط الحي (البطل)
- أربعة أعمدة RTL: مصادر ← وكلاء ← FINN ← بوابة الاعتماد.
- عمود الوكلاء مجمّع بصريًا حسب `specialty`: امتثال · عمليات · تنبؤ · أمن · معرفة (عناوين مجموعات خفيفة أعلى كل تجميعة).
- روابط bezier بألوان `link_type` (بيانات cyan · أمر amber · نتيجة emerald · مقترح اعتماد rose) + مفتاح ألوان صحيح الاتجاه.
- نبضات من `agent_runs.completed_at` الأخيرة، إعادة تدوير، ≤24 عنصر متحرك.
- لمسة ذهبية دقيقة على بوابة الاعتماد فقط.
- لا خط يعبر البوابة (يتوقف عند حافتها اليسرى).

### التركيز على وكيل
- نقر عقدة ⇒ CSS class على `<svg>` تعتم كل ما ليس في `data-agent-chain="<slug>"` (opacity 0.15) وتبرز السلسلة كاملة.
- `FlowChainStrip` أعلى الكانفاس يعرض ثلاث بطاقات مرقّمة مع أسهم RTL: **السابق ← الوكيل ← التالي**. مصادر السابق/التالي من `agent_connections`.
- `AgentDrawer` (Sheet من shadcn) بخمسة تبويبات:
  1. نظرة (من `agent_capabilities` + metadata).
  2. مهامه الحالية (`agent_runs` قيد التشغيل + طابور).
  3. سجل تشغيل — آخر 10.
  4. مخرجات معلّقة من `approval_pipeline` — أزرار اعتماد/رفض معطلة بأناقة مع tooltip «يتطلب تفويض المدير».
  5. ارتباط FINN — جملة واحدة من `aria_knowledge`.

### شريط التدفق الزمني السفلي
نقاط لآخر 24س من `agent_runs`. زر «تشغيل السيناريو» يبث النبضات تسلسليًا حتى البوابة عبر rAF (نفس pool النبضات).

### أوضاع العرض
Toggle: شبكة (افتراضي) · قائمة · طابور. زر «وضع العرض» يخفي التنقل ويكبّر الكانفاس (fullscreen div).

### الجوال (390–430)
- تدفق رأسي بأربع مراحل مطوية (`<details>`).
- اختيار وكيل يفتح `AgentDrawer` كصفحة كاملة (`side="bottom"` مع full-height).
- `FlowChainStrip` ثابت أعلى الصفحة (`sticky top-0`).

### الأداء (قيد الإنتاج)
- SVG + CSS فقط. لا reactflow/d3/canvas.
- حركة على `transform`/`opacity` فقط.
- `IntersectionObserver` يوقف rAF خارج الشاشة.
- `prefers-reduced-motion`: كل شيء ساكن.
- الصفحة lazy عبر `React.lazy` + `<ClientOnly>`.
- SSR: نسخة ساكنة كاملة المعلومة.

### الربط
- `/agents-flow` عام (خارج `_authenticated`) لأن الصفحة الرئيسية عامة أيضًا.
- في الرئيسية: أيقونة/بطاقة «شبكة التنسيق الحية» تصبح `<Link to="/agents-flow">` + اللوحة المصغّرة تحته تحتفظ بـ onClick يفتح الصفحة الكاملة.
- `aria_knowledge`: التأكد من وجود سطر لكل وكيل + رابط `/agents-flow?agent=<slug>`.

### الجمالية
- Navy عميق (`--nx-bg`) · خطوط cyan/emerald رفيعة (`stroke-width: 1.25`) · ذهبي حصريًا على البوابة.
- IBM Plex Sans Arabic (مُحمّل بالفعل).
- بطاقات زجاجية موحّدة الحجم `160×64` (وكلاء) و`140×48` (مصادر).

## بوابة التحقق قبل الدفع
- لقطات 390 + 1280 لعقدة FINN مكبّرة تُظهر «FINN» صحيحة.
- 3 وكلاء مختلفين مع سلسلتهم.
- الأرقام العلوية = SQL count.
- iOS Safari: 10 تحميلات + ≥55fps.
- vitest + typecheck + performance budget + qa-guardian.
- commit واحد: `feat(agents-flow): agent operations dashboard with upstream/downstream chain & Arabic SVG rendering fix`.

## سؤال واحد قبل التنفيذ
هل تريدين `/agents-flow` **عامًا** (يفتحه الزائر مباشرة، كما الرئيسية) أم داخل `_authenticated` (يفتح بدون بريد لأن البوابة مفتوحة أصلًا)؟
