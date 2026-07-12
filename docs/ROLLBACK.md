# خطة التراجع — NEXIOS (biz-pulse-ar)

هذه خطة العودة الفورية إن حدث خلل بعد أي تغيير جذري (خاصة الهجرة إلى Vercel).
الهدف: استعادة الوضع المستقر خلال دقائق دون فقد بيانات.

> نقطة الأمان: الوسم `v-pre-migration` وفرع `backup/pre-migration` يشيران إلى
> آخر حالة مستقرّة قبل الهجرة (الكوميت `873b572`).

---

## متى أتراجع؟
- الموقع الحيّ لا يفتح، أو يظهر خطأ «Missing Supabase…»، أو تعذّر تسجيل الدخول،
  أو أي عطل إنتاجي واضح بعد تغيير النشر/الدومين.

## المسار الأسرع (بلا كود) — العودة إلى نشر Lovable الحيّ
1. نشر Lovable **لا يُمَس أبداً** في هذه الهجرة؛ يظل يخدم `neexios.com` حتى
   يُنقل الدومين عمداً. فإن كان الدومين ما زال على Lovable، **لا حاجة لأي إجراء**
   — الموقع الحيّ سليم.
2. إن كنتَ قد نقلتَ الدومين إلى Vercel وحدث خلل: في لوحة **مسجِّل الدومين**
   أعِد سجلّات DNS إلى قيم Lovable السابقة (احتفظ بلقطة منها قبل التغيير).

## التراجع في الكود (إن لزم)
```bash
git fetch origin
git checkout v-pre-migration        # العودة إلى الحالة المستقرّة
# أو لإرجاع main بالكامل:
git checkout -B main v-pre-migration
git push origin main --force-with-lease
```
فرع النسخة الاحتياطية البديل: `backup/pre-migration`.

## إعادة ضبط Supabase (Redirect URLs)
إن كنت قد أضفت روابط Vercel/الدومين الجديدة وتريد التراجع:
1. Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**.
2. أبقِ روابط الدومين الحيّة العاملة فقط (‏`https://neexios.com`) واحذف روابط
   `*.vercel.app` المؤقتة إن سبّبت التباساً.
3. **Site URL** يبقى على الدومين الحيّ العامل.

## ثوابت لا تُمَس أثناء التراجع
- **لا تحذف** بيانات Supabase أو تعدّل RLS.
- **لا تغيّر** سجلّات DNS من نوع `TXT`/`MX` (البريد والتحقق).
- `.env` يبقى متتبَّعاً في git بمفاتيح Supabase العلنية فقط (لا أسرار).

## التحقق بعد التراجع
- افتح `https://neexios.com` → الصفحة الرئيسية تظهر بلا أخطاء.
- سجّل الدخول → يعمل.
- لا رسالة «Missing Supabase environment variable(s)».

## التراجع عن هجرة ARIA Phase 1 (aria_conversations/preferences/learning_log)
الهجرة `20260712100000_aria_conversations_preferences_learning.sql` **إضافية
بالكامل** ولا تمسّ أي جدول قائم. للتراجع (نادراً ما يلزم) نفّذ في SQL Editor:
```sql
DROP TABLE IF EXISTS public.aria_learning_log CASCADE;
DROP TABLE IF EXISTS public.aria_preferences CASCADE;
DROP TABLE IF EXISTS public.aria_conversations CASCADE;
```
لا تأثير على بيانات إنتاجية أخرى — هذه جداول جديدة فارغة عند الإنشاء.

## التراجع عن هجرة تنبيهات الطوارئ (aria_alerts/aria_alert_acks)
الهجرة `20260713100000_aria_emergency_alerts.sql` إضافية بالكامل. للتراجع:
```sql
DROP TABLE IF EXISTS public.aria_alert_acks CASCADE;
DROP TABLE IF EXISTS public.aria_alerts CASCADE;
```
لا تأثير على بيانات إنتاجية أخرى — جداول جديدة فارغة عند الإنشاء.
