# تفعيل مزوّدي ARIA

الفحص الحالي لهذه الجلسة: جميع أسرار الإنتاج غير موجودة. لا تحفظ المفاتيح في Git أو داخل ملف الاستبدال؛ ضعها في خزنة أسرار NEXIOS ثم أعد النشر.

## الوجهات الثابتة

- البريد المستلم: `Faisaljohaimy@gmail.com`
- SMS المستلم: `00966500888778` ويُحوّل داخليًا إلى `+966500888778`.

هذه وجهات استلام. يجب أن يصدر البريد من نطاق موثّق، وأن تصدر SMS من رقم Twilio أو Messaging Service.

## الأسرار المطلوبة

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe

ELEVENLABS_API_KEY

ARIA_MESSAGE_APPROVAL_SECRET
ARIA_DIRECT_SEND_ENABLED=true

RESEND_API_KEY
RESEND_FROM_EMAIL=ARIA <aria@YOUR_VERIFIED_DOMAIN>
RESEND_WEBHOOK_SECRET

TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
# أو بدل الرقم:
TWILIO_MESSAGING_SERVICE_SID
TWILIO_STATUS_CALLBACK_URL=https://YOUR_PUBLIC_DOMAIN/api/webhooks/twilio
```

أنشئ سر آريا الداخلي محليًا ثم انقله مباشرة إلى خزنة الأسرار:

```bash
node scripts/generate-aria-internal-secret.mjs
```

لا يستطيع هذا السكربت إنشاء مفاتيح OpenAI أو ElevenLabs أو Resend أو Twilio؛ هذه المفاتيح مرتبطة بحساب وفوترة وتحقق، ويجب إصدارها من لوحات المزوّدين.

## البريد عبر Resend

1. أضف نطاق إرسال تملكه وأكمل سجلات DNS المطلوبة.
2. أنشئ مفتاح API بصلاحية الإرسال وضعه في `RESEND_API_KEY`.
3. اضبط `RESEND_FROM_EMAIL` على عنوان داخل النطاق الموثّق. لا تستخدم Gmail كعنوان From في Resend.
4. أنشئ Webhook إلى `https://YOUR_PUBLIC_DOMAIN/api/webhooks/resend` للأحداث: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`, `email.complained`, `email.suppressed`.
5. ضع signing secret في `RESEND_WEBHOOK_SECRET`.

## SMS عبر Twilio

1. فعّل حساب Twilio ومتطلبات الدولة/المرسل، ثم اشترِ رقمًا يدعم SMS أو أنشئ Messaging Service.
2. ضع Account SID وAuth Token في خزنة الأسرار.
3. اضبط `TWILIO_FROM_NUMBER` أو `TWILIO_MESSAGING_SERVICE_SID`، وليس رقم المستلم.
4. اضبط callback العام HTTPS على `/api/webhooks/twilio`. يتحقق المسار من `X-Twilio-Signature` قبل تحديث سجل التسليم.
5. في الحساب التجريبي قد يلزم توثيق رقم المستلم قبل الإرسال.

## التحقق بعد النشر

شغّل في بيئة تحمل الأسرار:

```bash
node scripts/check-aria-providers.mjs
```

أو استدعِ `GET /api/aria/providers/status` بحساب `admin` أو `manager`. الاستجابة تعرض حالة كل مزوّد وأسماء المتغيرات الناقصة فقط ولا تعرض قيم الأسرار.

بعد ظهور `READY` لكل الأقسام، نفّذ رسالة sandbox واحدة إلى البريد والرقم المسجلين وراجع `aria_outbound_messages` و`aria_outbound_message_events` حتى تصل حالة `delivered` أو يظهر سبب الفشل الحقيقي.
