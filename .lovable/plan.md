# خطة الوصول إلى 100% — تنفيذ متسلسل لخمس موجات

الهدف: رفع نسبة الإنجاز من **45% → 100%** عبر خمس موجات متتالية، كل موجة تُسلَّم كاملة قبل بدء التالية.

---

## 🌊 الموجة 1 — Workflow Engine الحي (الأولوية القصوى) — يرفع +15%

**المشكلة:** `workflows` = 0، Event Bus بلا producers حقيقيين.

**ما سأبنيه:**
1. **Seed 5 workflows إنتاجية** في جدول `workflows`:
   - `incident_response_v1` — حادث P1/P2 → إخطار + work_order تلقائي + ARIA analysis
   - `permit_approval_v1` — تصريح جديد → فحص contractor → موافقة/رفض
   - `patrol_overdue_v1` — دورية متأخرة → تنبيه قائد القطاع
   - `visitor_checkin_v1` — زائر → فحص → تسجيل دخول
   - `daily_kpi_rollup_v1` — تجميع KPIs يومياً 06:00
2. **Database triggers** على `sec_incidents`, `sec_permits`, `sec_patrols`, `sec_visitors` تنشر events إلى `enterprise_events` ⇒ تستهلكها pulse وتُنشئ `workflow_runs` حقيقية.
3. **Workflow executor** يقرأ workflow definition من DB ويُنفّذ steps واقعية (call tool, update record, emit event).

**Deliverable:** فتح `/workflows` يُظهر 5 templates، إنشاء حادث يُولّد workflow_run مرئي في `/execution`.

---

## 🌊 الموجة 2 — ARIA RAG + Corpus مؤسسي — يرفع +10%

**المشكلة:** `aria_documents` = 0، ARIA بلا ذاكرة طويلة.

**ما سأبنيه:**
1. **بذر 12 وثيقة مرجعية** في `aria_knowledge` (سياسات الأمن الصناعي، إجراءات الإخلاء، دليل التصاريح، معايير الدوريات، SLA الحوادث... بالعربية).
2. **توليد embeddings** للوثائق عبر Lovable AI Gateway.
3. **تفعيل RAG pipeline** في `src/lib/aria/rag.server.ts` ليبحث في `aria_knowledge` + `aria_memory` + `aria_documents` ويحقن السياق في كل محادثة.
4. **زر "ارفع وثيقة"** في `/aria` للأدمن لإضافة PDF/text بشكل دائم.

**Deliverable:** سؤال ARIA "ما إجراء الإخلاء في موقع جدة؟" يُرجع إجابة مستندة لوثيقة مرفقة بالمصدر.

---

## 🌊 الموجة 3 — Microsoft 365 Integration حقيقي — يرفع +12%

**المشكلة:** 0 tenants متصلة فعلياً، sync job معطّل.

**ما سأبنيه:**
1. **OAuth flow كامل** لربط tenant عبر `/settings/microsoft` (Client ID/Secret + Redirect URI جاهزة).
2. **Token storage آمن** في `integration_microsoft` مع refresh تلقائي.
3. **Sync فعلي عبر Graph API**: Outlook messages, SharePoint files, Teams channels → يُخزّن المرجع في `integration_microsoft_sync_log`.
4. **زر "إرسال تقرير لـ Outlook"** في `/exec` يستخدم الاتصال الحقيقي.

**ملاحظة:** يتطلب من المستخدم إدخال Microsoft App credentials (سيتم توضيح خطوات الحصول عليها).

---

## 🌊 الموجة 4 — تقارير تنفيذية مجدولة — يرفع +8%

**المشكلة:** `report_schedules` = 0 جداول نشطة.

**ما سأبنيه:**
1. **Seed 3 جداول إنتاجية**:
   - تقرير يومي تنفيذي 07:00 (PDF + Excel)
   - تقرير أسبوعي شامل (الأحد 06:00)
   - تقرير شهري للمدير العام (1 من كل شهر)
2. **pg_cron job** ينادي `/api/public/hooks/executive-reports-run` كل 15 دقيقة لتنفيذ الجداول المستحقة.
3. **توليد فعلي** عبر `src/lib/reports/builder.server.ts` (يعمل أصلاً) + تخزين في bucket `uploads` + إرسال بالبريد.
4. **لوحة "آخر التقارير"** في `/exec` تعرض ملفات قابلة للتنزيل.

---

## 🌊 الموجة 5 — تشغيل Agents تلقائياً على أحداث حقيقية — يرفع +10%

**المشكلة:** 14 agent معرّفين بلا تشغيل تلقائي.

**ما سأبنيه:**
1. **Agent triggers** في `pulse.functions.ts`: عند حدث `incident.created` بشدة P1 → تشغيل `risk_intelligence_agent` تلقائياً.
2. **3 agents فعّالين بالكامل**:
   - **Risk Intelligence** — يحلّل كل حادث جديد ويُنتج risk_score + توصيات (يكتب في `aria_decisions`)
   - **Operations Monitor** — يفحص kpis كل 5 دقائق ويُنبّه عند انحراف
   - **Executive Reporting** — يولّد briefing تلقائياً في نهاية الوردية
3. **عرض agent_runs الحية** في `/agents` مع stream output (يعمل أصلاً، نُغذّيه بتشغيل حقيقي).
4. **Audit trail كامل** عبر mirror trigger الموجود.

**Deliverable:** إنشاء حادث P1 يدوياً ⇒ بعد 6 ثواني يظهر agent_run بتحليل ARIA حقيقي + workflow_run + audit_log.

---

## 📐 تفاصيل تقنية

**Stack المستخدم:** TanStack Start + Supabase (Lovable Cloud) + Lovable AI Gateway (gpt-5/gemini)، كل الكود ضمن المعمارية الحالية:
- Migrations للـ schema + seed data
- `createServerFn` للأعمال الجديدة
- `pulse.functions.ts` للـ triggers
- `useLiveRows` للعرض الفوري
- Zero-Demo Policy: لا أحداث وهمية، كل شيء من DB فعلي

**التحقق بعد كل موجة:**
- typecheck
- فتح المسار في الواجهة والتأكد من ظهور بيانات حقيقية
- تشغيل سيناريو end-to-end واحد
- تقرير نسبة الإنجاز الجديدة قبل بدء الموجة التالية

**المدة المتوقعة:** ~26 ساعة عمل موزّعة. سأنفّذ موجة كاملة ثم أنتظر إذنك للموجة التالية، أو أتابع تلقائياً إن طلبت ذلك.

## ❓ قرار مطلوب قبل البدء

- **الموجة 3 (Microsoft 365)** تتطلب منك تسجيل تطبيق في Azure Portal والحصول على `Client ID` + `Client Secret` + `Tenant ID`. هل تريد:
  - (أ) أتابع وأطلب منك القيم عند الوصول للموجة 3، أو
  - (ب) أؤجّل الموجة 3 إلى الأخير وأنفّذ 1→2→4→5 ثم نعود لـ 3؟

ابدأ الموجة 1 الآن؟
