# النشر التلقائي — NEXIOS (neexios.com)

النشر **تلقائي عند كل `git push` إلى `main`** عبر مسارين مستقلّين لا تعارض
بينهما. لا أسرار في المستودع إطلاقاً — كل مفاتيح وقت التشغيل تُدار في لوحة
المنصة (المادة 13).

```
Claude Code → git push origin main → GitHub
                                   ├─▶ Vercel (Git integration)      → إنتاج neexios.com
                                   └─▶ GitHub Actions (deploy.yml)   → Cloudflare Workers (بديل)
```

كلا المسارين يُفعَّلان تلقائياً على `push`؛ الجزء الوحيد المتبقّي في كلٍّ منهما
هو ربط اعتماد/سرّ **خارج المستودع** (لا يمكن وضعه في git).

---

## ١) Vercel — الإنتاج (تلقائي)

- **ما هو مضبوط في المستودع:** `vercel.json` يحدّد أمر البناء وذاكرة Node
  وترويسات الأمان، و**`git.deploymentEnabled.main: true`** يضمن أن كل push إلى
  `main` يُطلق نشراً إنتاجياً. ونيترو يتحوّل تلقائياً إلى `preset: "vercel"`
  حين تكون `VERCEL=1` (انظر `vite.config.ts`) فيُخرج Build Output API v3.
- **الخطوة الوحيدة خارج المستودع (تُفعَّل مرّة واحدة):** في لوحة Vercel تأكّد أن
  المشروع مربوط بمستودع GitHub وأن **Production Branch = `main`** وأن
  Auto-Deploy مفعّل (هو الوضع الافتراضي عند ربط المستودع). متغيّرات البيئة
  (`VITE_SUPABASE_*` وأي مفاتيح خادم) تُضاف في Vercel → Settings → Environment
  Variables.
- **النتيجة:** بعد ذلك كل push إلى `main` يُنشر إنتاجياً بلا أي تدخّل يدوي.

## ٢) Cloudflare Workers — البديل (تلقائي، متوقّف حتى تُضاف الأسرار)

- **ما هو مضبوط في المستودع:** `.github/workflows/deploy.yml` يعمل على كل push
  إلى `main` (و`workflow_dispatch` يدوياً)، يبني بهدف Cloudflare Workers ثم ينشر
  عبر `wrangler deploy`. مع حارس أنيق: إن لم تُضبَط الأسرار **يتخطّى النشر دون
  فشل أحمر**.
- **الخطوة الوحيدة خارج المستودع (لتفعيله):** أضف سرّين في
  **GitHub → Settings → Secrets and variables → Actions**:
  - `CLOUDFLARE_API_TOKEN` — رمز Cloudflare بصلاحية «Edit Workers».
  - `CLOUDFLARE_ACCOUNT_ID` — معرّف حساب Cloudflare.
  بمجرّد إضافتهما يبدأ النشر التلقائي إلى Cloudflare عند كل push.
- **مفاتيح وقت التشغيل** (SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY,
  ANTHROPIC_API_KEY, STRIPE_*, RESEND_API_KEY, TWILIO_* …) تُضبط كمتغيّرات على
  Worker نفسه (Cloudflare → Settings → Variables أو `wrangler secret put`) —
  لا في المستودع.

---

## التحقّق قبل كل نشر (بوابة CI)

`.github/workflows/ci.yml` يعمل على كل push/PR: تثبيت التبعيات (مع إعادة توجيه
`bun.lock` إلى npm العام) ثم **Typecheck + Lint + Build + فحص حزمة + اختبار
E2E أمني حاجب**. القاعدة الثابتة: لا push لكود مكسور — تُشغَّل الفحوصات محلياً
(`tsc --noEmit` + ESLint + `vitest`) قبل الدفع، وCI شبكة أمان.

## التراجع

- **Vercel:** لوحة Vercel → Deployments → اختر نشرة سابقة ناجحة → **Promote to
  Production** (فوري، دون إعادة بناء).
- **Cloudflare:** أعد نشر وسم/commit سابق عبر `workflow_dispatch` على deploy.yml،
  أو `wrangler rollback`.
- تفاصيل أوسع في `docs/ROLLBACK.md`.
