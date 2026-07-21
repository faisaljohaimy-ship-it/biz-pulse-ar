# الخطة — جزءان متتاليان في جلستين

## الجزء الأول — الوكلاء الخمسة الجدد (migration واحدة idempotent)

ملف: `supabase/migrations/<ts>_agents_fleet_expansion.sql`

1. جدول `agent_connections` جديد (idempotent):
   - `id, from_node, from_kind, to_node, to_kind, link_type` (enum: `command|result|data|approval_suggestion`), `status, is_simulation, org_id, created_at`.
   - GRANT + RLS بنفس نمط `command_agents` (قراءة عرضية مفتوحة، كتابة خلف auth).
2. إدراج 5 صفوف في `command_agents` (idempotent عبر `on conflict do nothing` بمفتاح `slug`):
   - `predictor` مُنبئ / Activity / تنبؤ
   - `investigator` مُحقِّق / Search / تحقيق
   - `readiness` مُدقِّق / ClipboardCheck / امتثال
   - `identity-guard` حارس الهوية / UserCheck / دخول
   - `ot-eye` عين OT / ShieldHalf / سيبراني
   - كل صف يحمل عربي/إنجليزي، أيقونة lucide، تخصص، حالة، حدّة، مهمة حالية.
3. `agent_capabilities`: مشغّل + مدخلات[] + مخرجات[] لكل من الخمسة.
4. `agent_connections`: روابط من مصادر (SAP/Power BI/M365/Nafath/sensors/incidents/permits) ← الوكلاء ← ARIA ← بوابة الاعتماد. تُغطي الـ13 لا الخمسة فقط.
5. `agent_runs`: ≥12 تشغيلًا لكل وكيل جديد (≥60 إجمالًا) خلال 14 يومًا، مهام عربية واقعية مربوطة بأصول/بلاغات/توجيهات حقيقية من `twin_assets` / `sec_incidents` / `hcis_*`.
6. `approval_pipeline`: ≥6 مقترحات جديدة (أوامر عمل وقائية، تعليق بطاقات، خطط إغلاق فجوات).
7. `aria_knowledge`: 5 صفوف — سطر ملخّص لكل وكيل جديد.
8. كل الصفوف `is_simulation = true`. لا تعديل على بيانات قائمة.

بوابة الجزء الأول: `agents` تعرض 13 · صفحة الوكلاء تعرض 12 تشغيلًا لكل جديد · ARIA تجيب بسطر واحد لكل واحد منهم.

## الجزء الثاني — Agentic Flow Canvas (SVG واحد على الرئيسية)

مكوّن جديد: `src/components/home/AgenticFlowCanvas.tsx` (lazy).

- قراءة عبر server fn جديدة `flow.functions.ts`:
  - `getFlowGraph()`: يجمع (المصادر الثابتة + `command_agents` + بوابة) كعقد، و`agent_connections` كحواف، وآخر تشغيلات من `agent_runs` لعدّ النبضات لكل حافة. `resilient()` بسقف 4ث.
- التخطيط:
  - أربعة أعمدة RTL: `sources → agents → aria → gate`.
  - داخل عمود الوكلاء: تجميع بالتخصص (امتثال · عمليات · تنبؤ · أمن · معرفة) بشبكة هندسية موحّدة.
  - إحداثيات تُحسب من الحواف/العقد بدون تخطيط ثابت في الكود.
- الرسم: SVG واحد. عقدة = `<g>` بـ `<rect rx>` زجاجية + أيقونة lucide كـ `foreignObject` صغير + نص. ports دائرتان يمين/يسار. مكوّن `FlowNode` موحّد.
- الحواف: `<path d="M... C ...">` bezier ناعم. لون حسب `link_type`. نبضات = `<circle>` صغيرة مع `<animateMotion>` أو `transform` عبر rAF مضبوط. حد أقصى 24 عنصرًا متحركًا مع pool معاد التدوير.
- التفاعل:
  - onFocus عقدة ← يعتم البقية عبر `opacity` على مجموعات SVG (فئة CSS واحدة).
  - بطاقة جانبية `<aside>` HTML عادية بجانب SVG.
  - زر «تشغيل السيناريو»: يبث نبضات من آخر 24س تسلسليًا.
  - زر «شرح الدورة»: يضيء كل عمود مع سطر عربي قصير.
  - `IntersectionObserver` يوقف rAF خارج الشاشة.
  - `prefers-reduced-motion`: بلا نبضات، الشبكة كاملة المعلومة ساكنة.
- الجوال (≤430px): تخطيط بديل — 4 مراحل رأسية مطوية + زر «العرض الكامل» يفتح SVG بتمرير أفقي snap داخل حاوية `overflow-x-auto`. البوابة تبقى الختام.
- الأداء: لا مكتبات جديدة (لا reactflow). حركة على `transform/opacity` فقط. تحميل كسول عبر `React.lazy` مع `<ClientOnly>` — SSR يُخرج نسخة ساكنة.

## اندماج الرئيسية

- `src/routes/index.tsx`: القسم القائم لشجرة `AgentHierarchyGraph` يصبح Tabs بتبويبين:
  1. «الحلقة الحية» ← `AgentHierarchyGraph` الحالي.
  2. «شبكة التنسيق» ← `AgenticFlowCanvas` (افتراضي مُختار).
- عدّاد الوكلاء في كل الشاشات يقرأ من `command_agents` (مصدر واحد).

## التقنيات

```text
DB: command_agents (existing) + agent_capabilities (existing) + agent_connections (new) + agent_runs (existing) + approval_pipeline (existing)
Server: src/lib/flow.functions.ts (getFlowGraph)
Client: src/components/home/AgenticFlowCanvas.tsx (SVG-only, lazy, ClientOnly)
       + src/components/home/FlowNode.tsx
       + src/components/home/flow-layout.ts (pure layout math)
Tabs UI: shadcn Tabs في index.tsx حول AgentHierarchyGraph
```

## بوابة التحقق قبل الدفع

- عدّاد الوكلاء 13 موحّد.
- ≥60 تشغيلًا جديدًا مبذورًا.
- الشبكة تُبنى من `agent_connections` (لا ثابت).
- فحص بصري: لا حافة تعبر البوابة.
- iOS Safari: 10 تحميلات متتالية بلا انهيار + ≥55fps.
- لقطات 390 و1280.
- ARIA تجيب عن كل وكيل جديد بسطر واحد.
- tsc + vitest + الميزانية + tصريح qa-guardian.
- commit واحد: `feat(agents+flow): five industrial agents & holographic agentic flow canvas on home`.

## إخراج الجلسات

- **الجلسة 1 (هذه)**: الـmigration + اعتماد الأسطول عبر الشاشات + تحديث ARIA knowledge → توقّف عند بوابة السماح بتنفيذ الـmigration.
- **الجلسة 2**: بناء `AgenticFlowCanvas` كامل + التبويبات في الرئيسية + QA البصري والأداء + دفع commit.

هل أبدأ بالجلسة الأولى (migration الأسطول) الآن؟
