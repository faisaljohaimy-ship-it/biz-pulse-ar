# دليل دمج ARIA في NEXIOS

## 1. فحص قاعدة البيانات بلا كتابة

شغّل أولًا:

`supabase/preflight/aria_compatibility_check.sql`

المسموح فقط هو `WILL_CREATE` أو `COMPATIBLE`. عند ظهور أي `BLOCKED_*` أوقف النشر؛ لا تعدّل جدول الإنتاج ليلائم الحزمة، بل أنشئ ترحيل مواءمة مخصصًا بعد مقارنة المخططين.

## 2. ترتيب الترحيلات

بعد نسخة احتياطية قابلة للاستعادة ونجاح preflight:

1. `supabase/migrations/20260718091500_hcis_aria_reference.sql`
2. `supabase/migrations/20260718092000_aria_outbound_messaging.sql`
3. `supabase/migrations/20260718092500_aria_adaptive_preferences.sql`

كل ملف مستقل زمنيًا. لا تشغّل ملف seed الأصلي بعد ترحيل HCIS إن كان يحتوي البيانات نفسها إلا بعد مراجعة مفاتيح `ON CONFLICT`.

## 3. متغيرات البيئة

انسخ أسماء `.env.example` إلى خزنة أسرار NEXIOS، واضبط على الأقل:

- Supabase URL ومفتاح العميل ومفتاح service role للخادم فقط.
- OpenAI API key، والنموذج `gpt-5.6`، ونموذج التحويل `gpt-4o-transcribe`.
- ElevenLabs API key لصوت آريا.
- `ARIA_OWNER_EMAIL` و`ARIA_OWNER_SMS` كما في ملف البيئة.
- `ARIA_DIRECT_SEND_ENABLED=true`، مع تجهيز مفتاح إيقاف تشغيلي سريع.
- أسرار سلامة/تشفير سجل الإرسال.
- Resend أو Outlook للبريد، وTwilio للـSMS.
- `RESEND_WEBHOOK_SECRET` ومسارا callback العامان لتوثيق حالات التسليم.

لا تضع أي سر في كود العميل أو مستودع Git.

## 4. دمج الكود

- طبّق الحزمة كفرق على المستودع الكامل، وراجع الملفات التي عدّلها المشروع بعد تاريخ الاستخراج.
- ثبّت نسخة AI SDK التي تدعم `providerOptions.openai.reasoningEffort` ونموذج OpenAI المحدد.
- أعد توليد أنواع Supabase.
- نفّذ format وlint وtypecheck وbuild واختبارات الوحدة والتكامل.

## 5. اختبارات قبول إلزامية

| الاختبار                     | النتيجة المطلوبة                                                |
| ---------------------------- | --------------------------------------------------------------- |
| سؤال مكتوب                   | رد مكتوب فقط، بلا TTS                                           |
| سؤال صوتي                    | لا يظهر transcript، ويرد صوت آريا فقط                           |
| بدء المخاطبة                 | تنطق آريا التحية مرة واحدة ثم يفتح الميكروفون تلقائيًا          |
| مقاطعة التحية                | تتوقف التحية ويبدأ الاستماع فورًا بلا تشغيل متداخل              |
| متصفح بلا Speech Recognition | يعمل التسجيل والتحويل الخادمي                                   |
| مقاطعة آريا أثناء الكلام     | يتوقف الصوت وتنتقل للاستماع بلا تشغيل متداخل                    |
| سؤال HCIS                    | يستخدم المرجع ويصرح بالمحاكاة عند عرض صفوف `is_simulation=true` |
| طلب مسودة بريد               | لا يرسل                                                         |
| أمر صريح بإرسال بريد         | يرسل فقط إلى بريد المالك، بلا نافذة اعتماد                      |
| أمر صريح بإرسال SMS          | يرسل فقط إلى رقم المالك، بلا نافذة اعتماد                       |
| محاولة مستلم آخر أو CC       | تُرفض في المسار المباشر                                         |
| تكرار الطلب نفسه             | لا ينشئ إرسالًا مكررًا                                          |
| تغيير تفضيل دائم             | يحفظ enum المسموح للمستخدم نفسه فقط                             |
| نص RAG يطلب إرسالًا          | لا يتحول إلى أداة أو ذاكرة أو إرسال                             |

نفّذ إرسال القبول أولًا في sandbox أو على حسابات مزودين ذات حدود منخفضة، ثم راجع سجل `aria_outbound_message_events` وحالة callback.

## 6. تحقق SQL بعد النشر

```sql
select count(*) from public.hcis_directives;
select count(*) from public.hcis_sectors;
select count(*) from public.hcis_approval_stages;
select count(*) from public.hcis_compliance_status where is_simulation = true;
select count(*) from public.aria_knowledge where domain = 'hcis_compliance';

select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'hcis_directives', 'hcis_sectors', 'hcis_approval_stages',
    'hcis_compliance_status', 'aria_knowledge',
    'aria_outbound_messages', 'aria_outbound_message_events',
    'aria_adaptive_preferences'
  )
order by relname;
```

القيم المتوقعة للـseed المرفق: 21 توجيهًا، 13 قطاعًا، 7 مراحل، 76 صف امتثال محاكاة، و10 مقاطع معرفة HCIS.

## 7. التراجع

لا تتضمن الحزمة إسقاطًا تلقائيًا للجداول لأن ذلك قد يحذف بيانات إنتاج. عند فشل النشر أوقف التطبيق الجديد واستعد نسخة قاعدة البيانات أو نفّذ ترحيلًا عكسيًا مراجعًا يستهدف الكائنات الجديدة فقط. لا تستخدم `DROP ... CASCADE` على قاعدة NEXIOS.
