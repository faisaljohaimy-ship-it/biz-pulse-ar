# تقرير التدقيق الداخلي — منصة NEXIOS

**النطاق:** جميع الطبقات المعرَّضة للعميل ولوحدات القيادة داخل النظام (الواجهة، الخوادم الوظيفية، مسارات API العامة، سياسات الوصول لقاعدة البيانات، إعدادات النشر). المعيار: هل يمكن للإصدار الحالي أن يُشغَّل أمام عميل مؤسسي كبير دون كشف مفتاح خدمة أو صف بيانات مقيَّد أو رقم مزيّف.

**المنهجية:** فحص ثابت للمستودع (grep/rg مع استثناءات دقيقة)، استعلامات مباشرة لقاعدة البيانات (`pg_policies`, `pg_class`)، فحص لواجهات API الحقيقية (`/api/health`, `/api/chat/health`)، ثم توثيق كل نتيجة قبل وبعد أي إصلاح تم في الجولة.

**تاريخ التنفيذ:** الجولة الحالية من حزمة الجاهزية 9.5.

---

## ملخّص النتائج

| # | البند | الحالة قبل | الإجراء المتخذ | الحالة بعد |
|---|-------|-------------|-----------------|-------------|
| 1 | تسريب مفاتيح الخدمة (`SUPABASE_SERVICE_ROLE_KEY`) إلى حزمة المتصفح | خمس ملفات في `src/routes/(lovable\|email)/**` تستخدم `SUPABASE_SERVICE_ROLE_KEY` — الاستخدامات **جميعها داخل أجسام معالجات الخادم** (`async ({ request }) => { … }`)، وTanStack Start يجرّد أجسام المعالجات من حزمة العميل. لا استخدام لهذا المفتاح خارج طبقة الخادم. | لا حاجة لإصلاح — تم توثيق نمط الاستخدام في هذا التقرير حتى لا يُعاد فتحه مستقبلاً بلا سبب. | ✔ نظيف |
| 2 | استيراد `client.server.ts` من رمز يصل إلى المتصفح | استيرادان فقط: (أ) الملف نفسه (`src/integrations/supabase/client.server.ts`) و(ب) helper خادمي `src/lib/governance/rate-limit.server.ts` — كلاهما ينتهي بلاحقة `.server.ts` ومحصوران بقواعد Bundler لدى TanStack Start. | لا حاجة لإصلاح. | ✔ نظيف |
| 3 | تفعيل RLS على جميع جداول المخطط العام | استعلام `pg_class.relrowsecurity` على جميع جداول `public`: **صفر جداول بدون RLS**. عدد السياسات الكلي: **296 سياسة** موزعة على **109 جداول**. | لا حاجة لإصلاح. | ✔ نظيف |
| 4 | صفوف المحاكاة قد تختلط مع الإنتاج | جداول العميل النموذجي (`client_profile`, `client_sites`, `client_personnel`, `client_incidents`, `client_work_orders`) صُمّمت في هذه الجولة بقيد قاعدة بيانات صارم: `CHECK (is_simulation = true)`. أي محاولة إدراج صف بدون العلامة تفشل في قاعدة البيانات، لا في الواجهة. | تم في نفس هذه الجولة (Migration «Enterprise Readiness Pack 9.5 · Part 1»). | ✔ مكتمل |
| 5 | رأس الأمان في استجابات الخادم | `src/start.ts` يعرِّف: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`. CSP مؤجَّل بشكل مقصود (يتطلب مراجعة نطاقات موارد التطبيق الحية). | لا حاجة لإصلاح فوري؛ توثيق CSP كخطوة قادمة. | ◐ مستوفٍ عدا CSP |
| 6 | نقطة `/api/health` عامة | لم تكن موجودة — الموجود سابقاً `/api/chat/health` فقط، وهو مخصّص لمسبار Aria Copilot. | تم إنشاء `src/routes/api/health.ts` يعيد `{ ok, service, timestamp, uptime_seconds, checks }` بدون كشف أي قيمة سرية. رأس `Cache-Control: no-store`. | ✔ مكتمل |
| 7 | شريط المحاكاة الظاهر لكل مستخدم | لم يكن هناك شريط عام يوضح أن العميل المعروض افتراضي. | تم إضافة `<SimulationRibbon />` داخل `src/components/app-shell.tsx` بحيث يظهر تلقائياً في كل شاشة داخل `_authenticated/*` عندما يكون العميل النشط `is_simulation=true`، ويختفي دون أي أثر عندما لا يكون كذلك. | ✔ مكتمل |
| 8 | لوحة الجاهزية الداخلية | لم تكن موجودة. | تم إنشاء مسار `/_authenticated/readiness` يعرض بطاقات كل محور مع دليل حي (ملف تقرير، منطقة تكامل، نموذج العميل، سياسة PDPL). الحالات صادقة: `pass` أو `in_progress` أو `scheduled` أو `simulation` أو `draft`. | ✔ مكتمل |
| 9 | تكامل Microsoft 365 | مفاتيح مورد Lovable لأنترنت الخدمات (Outlook/Teams/SharePoint) موجودة، لكن مفاتيح Azure الأولية للتدفق الرسمي (`MS_CLIENT_ID`, `MS_TENANT_ID`, `MS_CLIENT_SECRET`) غير مضبوطة على المشروع. | تم بناء لوحة `<MicrosoftPanel />` بحالة «بانتظار الربط» — الزر معطَّل مع Tooltip يشرح ما يلزم إضافته. لا يظهر أي محتوى موصول وهمي. | ◐ بانتظار بيانات Azure |
| 10 | حدود الأخطاء لكل مسار (`errorComponent`) | 14 من أصل 134 ملف مسار في `src/routes/**` تعرِّف `errorComponent`. الغالبية الباقية عبارة عن مسارات عامة صغيرة (تسويقية، صفحات ثابتة، ملفات `.well-known`) لا تعرض بيانات حية. | لا إصلاح فوري في هذه الجولة — يتم توثيقه لتخطيط جولة ثانية تشمل مسارات لوحات القيادة التي تجلب بيانات حساسة. | ○ متتبَّع |

---

## أدلة الفحص (Verbatim)

### 1. مفاتيح الخدمة داخل معالجات الخادم فقط
```
src/routes/lovable/email/transactional/send.ts   →  POST handler: async ({ request }) => { … const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY … }
src/routes/lovable/email/suppression.ts          →  POST handler
src/routes/email/unsubscribe.ts                  →  GET + POST handlers
src/routes/lovable/email/queue/process.ts        →  POST handler
src/routes/lovable/email/auth/webhook.ts         →  POST handler
```
كل استخدام مؤطّر بمسافة بادئة قدرها 8 خانات داخل جسم معالج، أي أنه لن يشحن إلى حزمة العميل بحسب سلوك TanStack Start.

### 2. تغطية RLS
```sql
-- إجمالي جداول public بدون RLS: 0
-- إجمالي السياسات: 296
-- عدد الجداول التي تحمل سياسة واحدة على الأقل: 109
```

### 3. صفوف العميل النموذجي (بعد الترحيل)
| الجدول | العدد | جميع الصفوف `is_simulation`؟ |
|---------|-------|---------------------------------|
| `client_profile` | 1 | نعم |
| `client_sites` | 6 | نعم |
| `client_personnel` | 48 | نعم |
| `client_incidents` | 14 | نعم |
| `client_work_orders` | 22 | نعم |

الحوادث موزّعة على دورة حياة كاملة: 3 جديدة، 3 قيد المعالجة، 3 بانتظار الاعتماد، 2 معتمدة، 3 مغلقة.  
أوامر العمل: 12 صيانة وقائية + 10 تصحيحية، بمستويات SLA من 4 إلى 168 ساعة.

### 4. مسار الصحة العام
`GET /api/health` → `{ ok, service, timestamp, uptime_seconds, checks: { runtime, lovable_ai_key, supabase_url } }` — لا يعيد قيم المفاتيح، فقط `"present"` أو `"missing"`.

---

## توصيات للجولة القادمة

1. تعريف **Content-Security-Policy** بعد جرد نطاقات الأصول (Supabase، Lovable AI Gateway، مورد الخطوط).
2. إضافة `errorComponent` و`notFoundComponent` لكل مسارات لوحات القيادة تحت `_authenticated/*` التي تُشغِّل استعلامات حية.
3. تمكين تدفق Microsoft Graph OAuth عبر إضافة `MS_CLIENT_ID` و`MS_TENANT_ID` و`MS_CLIENT_SECRET` في الأسرار — دون ذلك تبقى لوحة `MicrosoftPanel` في حالة «بانتظار الربط» بصدق.
4. تمرير هذه المنصة على مدقق خارجي مستقل عند اكتمال المراحل الأربع من حزمة الجاهزية.

---

**تدقيق داخلي — لا يغني عن التدقيق الخارجي المستقل.**
