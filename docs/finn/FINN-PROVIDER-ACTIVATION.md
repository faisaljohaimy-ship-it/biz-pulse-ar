# تفعيل مزوّدي FINN

## الاستدلال المعتمد

يعتمد FINN على Google Gemini حصريًا للاستدلال، الوكلاء، تحويل الصوت إلى نص، وتوليد التضمينات. لا يوجد مسار ذكاء احتياطي إلى مزوّد آخر. يستخدم ElevenLabs لإخراج الصوت فقط.

ضع الأسرار في خزنة بيئة النشر، ولا تحفظ أي قيمة فعلية في Git:

```text
GOOGLE_GENERATIVE_AI_API_KEY
GEMINI_MODEL=gemini-3.6-flash
GEMINI_TRANSCRIBE_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=1536

ELEVENLABS_API_KEY

SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

يمكن استخدام `GOOGLE_API_KEY` كاسم متوافق بديل لمفتاح Gemini. لا تضبط الاسمين بقيمتين مختلفتين.

## المراسلات والموصلات الاختيارية

مفاتيح البريد وSMS وMicrosoft مستقلة عن الاستدلال. اضبط فقط الموصلات التي فعّلتها، مثل Resend وTwilio، واجعل الوجهات في متغيرات بيئة لا في الكود.

## التحقق

```bash
npm run typecheck
npm test
npm run build
npm run check:secrets
node scripts/check-aria-providers.mjs
```

يعرض فحص الجاهزية أسماء المتغيرات الناقصة فقط، ولا يعرض قيم الأسرار. نفّذ اختبار RAG في مستأجر تجريبي وتحقق من وجود مرجعين موثوقين على الأقل، ثم اختبر الصوت والموافقات وسجل التدقيق قبل الإنتاج.
