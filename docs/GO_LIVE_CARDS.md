# بطاقات النشر المباشر — NEXIOS

المسار الأساسي هو Cloudflare Workers. لا تبدأ نقل الدومين قبل نجاح نسخة
تجريبية والتحقق من تسجيل الدخول والبيانات.

## ① Supabase

1. أنشئ/حدد مشروع Supabase المقصود.
2. طبّق جميع الملفات في `supabase/migrations/` بالترتيب.
3. في **Authentication → URL Configuration** أضف رابط المعاينة ورابط الإنتاج.
4. أنشئ مستخدم E2E غير إنتاجي، ثم اختبر أن مستخدم مؤسسة لا يرى بيانات مؤسسة أخرى.
5. فعّل النسخ الاحتياطي ونفّذ تجربة استعادة قبل الإطلاق.

## ② GitHub Actions

في **Settings → Secrets and variables → Actions** أضف:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

استخدم رمز Cloudflare محدودًا بتحرير Worker المطلوب فقط.

## ③ أسرار Worker

من Cloudflare **Workers & Pages → NEXIOS → Settings → Variables and Secrets**
أضف أسرار الخادم المذكورة في `.env.example`. الحد الأدنى العملي:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_HOOK_SECRET`
- مفتاح مزود ذكاء واحد على الأقل
- `LEADS_NOTIFY_EMAIL` إذا كانت إشعارات العملاء الداخلية مطلوبة

لتفعيل قنوات آريا الخارجية أضف مسار بريد واحداً (`RESEND_API_KEY` مع
`RESEND_FROM_EMAIL` أو موصل Outlook)، وللرسائل أضف مفاتيح Twilio مع رقم مرسل أو
Messaging Service SID، وللصوت أضف `ELEVENLABS_API_KEY`.

لا تضع هذه القيم في Git أو ملف `.env` داخل المشروع.

## ④ النشر والتحقق

1. شغّل workflow باسم **CI Verification** وتأكد من نجاحه.
2. شغّل **Deploy to Cloudflare** يدويًا أول مرة.
3. افتح رابط Worker واختبر الصفحة العامة ثم `/command-center` دون جلسة؛ يجب أن ينتقل إلى `/auth`.
4. سجّل الدخول وتحقق من الكرة ثلاثية الأبعاد وتغيير المناطق وروابط الرسم.
5. اختبر `/api/public/health` ونموذج العميل ورفع ملف في آريا وتحول الرد بين
   النص والصوت حسب طريقة السؤال.
6. من حساب مدير، أرسل بريداً وSMS إلى مستلمين اختباريين إن كانت القنوات مفعلة.
7. راقب السجلات والأخطاء 30 دقيقة قبل نقل الدومين.

## ⑤ الدومين والتراجع

اربط `neexios.com` بالـ Worker بعد نجاح التحقق فقط. لا تغيّر سجلات MX/TXT الخاصة
بالبريد. احتفظ بلقطة DNS السابقة وبآخر إصدار ناجح؛ عند خلل التطبيق أعد نشر
الإصدار السابق، وعند خلل قاعدة البيانات استخدم migration تعويضية ولا تحذف
بيانات الإنتاج مباشرة.

## خيار Vercel

`vercel.json` موجود للمعاينة أو النشر اليدوي البديل. لا تفعّل نشر `main` على
Cloudflare وVercel معًا لنفس الدومين، واختر مالك إنتاج واحدًا بوضوح.
