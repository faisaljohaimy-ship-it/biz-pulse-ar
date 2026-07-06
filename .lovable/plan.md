# خطة التنفيذ — Master Elevation Run

نطاق ضخم يمتد عبر 5 مراحل + إصدار نهائي. أطلب الموافقة قبل البدء لأن التنفيذ سيلمس ~40 ملفاً، migrations متعددة للـ Supabase، بيانات seed، ومسارات جديدة.

---

## STAGE 0 — إصلاحات لم تُشحن
- فحص/تصحيح فاصلة "الذكاء، تحت القيادة"
- إزالة أي نص ظاهر `/aria-hero-motion.mp4`
- تسمية روابط `/hajj-prime` بـ "منصة نُسك الحج"
- تعيين `<title>`/meta في `__root.tsx` = "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform"
- حذف "حِمل النواة 1.02%" و"معدل المزامنة 99.9"

**دليل:** grep قبل/بعد + مسارات ملفات مع أرقام أسطر.

---

## STAGE 1 — سطح المرونة والثقة
- `src/components/ErrorBoundary.tsx` عام + غلاف `errorComponent` موحّد لكل route ذي loader (رسالة عربية موسومة)
- `src/routes/api/health.ts` → server route يفحص Supabase (`select 1`) ويعيد `{ ok, version, timestamp, db_ms }`
- رؤوس أمان عبر `src/routes/__root.tsx` head + `_headers` file: CSP، `X-Frame-Options: DENY`، `X-Content-Type-Options: nosniff`، `Referrer-Policy: strict-origin-when-cross-origin`
- تحقق grep لأي مفتاح خدمة/سر في bundle العميل
- صفحة `/status` تقرأ `/api/health` مع نص "بدون ادعاء توفر تاريخي"
- `public/robots.txt` + `public/sitemap.xml` محدّثان للهوية الجديدة

---

## STAGE 2 — عميل مرجعي محاكى (موسوم)
Migration واحد يُنشئ (إن لم توجد) ويعبّئ:
- منظمة: "شركة الطاقة النموذجية (بيئة محاكاة)"
- `client_sites` × 6, `client_personnel` × 48, `client_incidents` × 14 (بدورة حياة كاملة), `client_work_orders` × 22 (بـ SLAs)
- كل الصفوف `is_simulation = true` (إضافة العمود إن لزم)
- شريط ثابت `<SimulationRibbon />` يظهر على كل شاشات المستأجر
- محوّل مستأجرين في `/command-center` يقرأ الصفوف الحقيقية عبر استعلامات الإنتاج

---

## STAGE 3 — تدقيق داخلي موثّق
- استعلام `pg_policies` لعدّ السياسات لكل جدول
- التحقق من الرؤوس/الحدود/الصحة/السرّية
- إصلاح كل فشل وإعادة الفحص
- كتابة `docs/INTERNAL_AUDIT_REPORT.md` (عربي أولاً، جدول نتائج، السطر الإلزامي حول عدم إغناء التدقيق الخارجي)

---

## STAGE 4 — `/readiness` (محمي بالمصادقة)
مسار جديد تحت `_authenticated/readiness.tsx` مع شارات:
- التدقيق الداخلي ✓ → يربط بـ `docs/INTERNAL_AUDIT_REPORT.md`
- التدقيق الخارجي ○ مجدول
- Microsoft 365 → قراءة حقيقية لوجود أسرار `MICROSOFT_*` عبر server fn؛ الواجهة كاملة في الحالتين
- العميل المرجعي ● محاكاة
- PDPL ◐ مسودة v0.9

---

## STAGE 5 — حلقة التطور الذاتي (محكومة)
- تشغيل عند mount في `/command-center`
- server fn `analyzeAndPropose` يقرأ heuristics حقيقية: خروقات SLA في `client_work_orders`، طلبات غير مسندة، ارتفاعات أخطاء من `enterprise_events`
- يُدرج صفوفاً في جدول `evolution_proposals` (موجود)
- **يقترح فقط** — لا تنفيذ ذاتي. أزرار الموافقة الموجودة هي المسار الوحيد
- كل قرار يُسجّل في `evolution_log`

---

## FINAL — النشر
- typecheck + build شامل
- Playwright: لقطات لـ `/`, `/status`, `/readiness`, `/command-center`
- `security--run_security_scan` → إصلاح كل ما هو حرج
- `preview_ui--publish` → نشر
- تقرير نهائي مع جدول المراحل + رؤوس HTTP حية من `curl -I` للعنوان المنشور

---

## التقديرات
- ~15 ملف جديد, ~25 ملف معدّل
- 2 migrations (seed + عمود `is_simulation` إن لزم)
- زمن تنفيذ متوقع: طويل، أرد بعد كل مرحلة بدليل مختصر

**هل أبدأ بالمرحلة 0 الآن، أم تريد تعديل الأولويات/إسقاط مرحلة؟**
