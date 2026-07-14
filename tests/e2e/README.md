# Playwright E2E — Executive-Critical Paths

هذه المجموعة تغطي المسارات الحرجة لعرض تنفيذي فقط، وليست تغطية شاملة.
لا تُشغَّل تلقائياً في خط النشر — نفّذها عند الحاجة فقط:

```bash
npm run test:e2e            # جميع الاختبارات على localhost:8080
npm run test:e2e:ui         # وضع UI التفاعلي
PLAYWRIGHT_BASE_URL=https://neexios.com npm run test:e2e   # ضد الإنتاج
```

## المتطلبات
- الخادم يعمل على `PLAYWRIGHT_BASE_URL` (افتراضياً `http://localhost:8080`).
- الاختبارات ٢ و٣ و٥ تحتاج بيانات جلسة/مستخدم اختبار حقيقية عبر متغيرات:
  - `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` (للجلسة المصادقة).
- الاختبارات المصادقة تُتخطّى تلقائياً (`test.skip`) إذا لم تكن المتغيرات موجودة.

## الاختبارات
| # | ملف | يتحقق من |
|---|---|---|
| 1 | `01-landing.spec.ts` | تحميل الصفحة الرئيسية، الفاصلة العربية، لا نصوص مسارات مسربة |
| 2 | `02-genesis-intro.spec.ts` | جينيسيس يظهر مرة واحدة لكل جلسة، زر التخطي يعمل |
| 3 | `03-aria-no-autoplay.spec.ts` | لا صوت يُشغَّل بدون إيماءة مستخدم |
| 4 | `04-voice-tour.spec.ts` | فتح/إغلاق لوحة الجولة الصوتية |
| 5 | `05-command-center-auth.spec.ts` | حماية `/command-center` بالمصادقة |
| 6 | `06-simulation-ribbon.spec.ts` | شارة المحاكاة تظهر على جميع الشاشات |
| 7 | `07-health-endpoint.spec.ts` | `/api/public/health` صحيح الشكل |
| 8 | `08-hajj-prime.spec.ts` | فتح/إغلاق منصة نُسك الحج |
