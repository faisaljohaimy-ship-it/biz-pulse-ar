# النشر التلقائي — NEXIOS (neexios.com)

هدف الإنتاج المعتمد هو **Cloudflare Workers**. عند كل `git push` إلى `main`
تعمل بوابة GitHub Actions، وتفشل بوضوح إذا غابت بيانات النشر المطلوبة. لا أسرار
في المستودع؛ كل مفاتيح وقت التشغيل تُدار في بيئة Worker (المادة 13).

```
Claude Code → git push origin main → GitHub Actions → Verify → Cloudflare Workers → neexios.com
```

يبقى Vercel هدفاً يدوياً اختيارياً فقط؛ `vercel.json` يعطّل نشر `main`
التلقائي لمنع نشر الفرع الإنتاجي نفسه إلى مزودين في الوقت ذاته.

---

## ١) Cloudflare Workers — الإنتاج المعتمد

- `.github/workflows/deploy.yml` يعمل على كل push إلى `main` وعلى
  `workflow_dispatch`، ويشغّل الاختبارات والبناء ثم `wrangler deploy`.
- أضف في **GitHub → Settings → Secrets and variables → Actions**:
  - `CLOUDFLARE_API_TOKEN` — رمز Cloudflare بصلاحية «Edit Workers».
  - `CLOUDFLARE_ACCOUNT_ID` — معرّف حساب Cloudflare.
  - `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY`.
- مفاتيح وقت التشغيل مثل `SUPABASE_SERVICE_ROLE_KEY` و`ELEVENLABS_API_KEY`
  و`RESEND_API_KEY` و`TWILIO_AUTH_TOKEN` تُضبط على Worker نفسه، لا في git.
- غياب أي اعتماد نشر مطلوب يجعل الوظيفة **تفشل** ولا تعلن نجاحاً زائفاً.

## ٢) Vercel — هدف يدوي اختياري

`vite.config.ts` يتحول إلى preset Vercel عندما تكون `VERCEL=1`، لكن
`vercel.json` يضبط `git.deploymentEnabled.main: false`. لا تفعّل النشر التلقائي
إلا بعد قرار تحويل رسمي وإيقاف مسار Cloudflare لتفادي بيئتي إنتاج متنافستين.

---

## التحقّق قبل كل نشر (بوابة CI)

`.github/workflows/ci.yml` يعمل على كل push/PR: تثبيت التبعيات (مع إعادة توجيه
`bun.lock` إلى npm العام) ثم **Typecheck + Lint + Build + فحص حزمة + اختبار
E2E أمني حاجب**. القاعدة الثابتة: لا push لكود مكسور — تُشغَّل الفحوصات محلياً
(`tsc --noEmit` + ESLint + `vitest`) قبل الدفع، وCI شبكة أمان.

## ٣) بوابات الإصدار v1.3 — إلزامية

### قاعدة البيانات والرسائل الخارجية

1. طبّق ترحيلات Supabase بالترتيب، وبالأخص
   `20260715190000_aria_outbound_approval_ledger.sql`.
2. أنشئ `ARIA_MESSAGE_APPROVAL_SECRET` عشوائياً بطول 32 محرفاً على الأقل.
   تغيير هذا السر يبطل طلبات الاعتماد المعلّقة، ولا يؤثر في السجل المكتمل.
3. اضبط موفر البريد (`OUTLOOK_*` أو `RESEND_API_KEY` + `RESEND_FROM_EMAIL`)
   و/أو Twilio، ثم نفّذ إرسالاً تجريبياً إلى مستلم مخصص للاختبار.
4. سجّل عنوان HTTPS المطابق تماماً في `TWILIO_STATUS_CALLBACK_URL`، وسجّل
   `https://<domain>/api/public/hooks/resend-message-status` في Resend واضبط
   `RESEND_WEBHOOK_SECRET`.
5. تحقّق من الدورة كاملة: `pending_approval → dispatching → accepted →
delivered/failed`، ومن أن إعادة الضغط أو إعادة webhook لا تنشئ إرسالاً أو
   حدثاً مكرراً.

المحتوى والوجهة مشفران في سجل الاعتماد، ولا تظهر رموز الاعتماد في الواجهة أو
السجلات. الإرسال مجهول النتيجة لا يُعاد تلقائياً حتى لا تصل رسالة مزدوجة.

### بوابة PDPL العامة

أدخل جميع قيم `PDPL_*` الفعلية الواردة في
`docs/PDPL_PRODUCTION_REGISTER.md`. لا تُستخدم قيم افتراضية قانونية، ويجب أن
يعرض `/readiness` بعد **PDPL Compliance** بحالة جاهزة قبل اعتماد الإصدار.
أحكام منصة الحج خارج نطاق هذا الإصدار ولم تُعدّل.

### مصادر البيانات الحية

بعد تطبيق المخطط، اختبر `/sec` و`/sec/sections` و`/sec/circles` وجسر القيادة
بحسابين من مؤسستين مختلفتين. يجب أن تأتي الأرقام التشغيلية من جداول `sec_*`
والـ tasks عبر RLS، وألا يظهر أي سجل للمؤسسة الأخرى. المؤشرات التي لا يوجد لها
مصدر موثوق تبقى موسومة صراحةً «محاكاة» ولا تتحول إلى ادعاء حي.

## التراجع

- **Vercel:** لوحة Vercel → Deployments → اختر نشرة سابقة ناجحة → **Promote to
  Production** (فوري، دون إعادة بناء).
- **Cloudflare:** أعد نشر وسم/commit سابق عبر `workflow_dispatch` على deploy.yml،
  أو `wrangler rollback`.
- تفاصيل أوسع في `docs/ROLLBACK.md`.
