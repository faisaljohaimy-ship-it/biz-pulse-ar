---
name: nexios-aria
description: منظومة FINN الصوتية والدردشة — تُستدعى قبل لمس أي مسار صوت/دردشة (FinnCopilot، /api/chat، /api/finn/tts، voice-config، digital-humans). تغطي حصرية صوت FINN الذكوري، حظر browser TTS، طريقة الإصلاح المحفوظة 401/403، وطبقات «FINN لا تتعطل».
---

# NEXIOS FINN — المساعد الصوتي الدائم

## الصوت (ثوابت غير قابلة للتفاوض)
- صوت FINN **حصريًا صوت ذكوري عبر ElevenLabs** (`FINN_ELEVENLABS_VOICE_ID =
  "izhopdR43PRI5gAmjXTj"` في `src/lib/finn/voice-config.ts`)، يُولَّد على
  الخادم عبر `/api/finn/tts` (السر `ELEVENLABS_API_KEY` بيئي فقط).
- **`speechSynthesis` محظور نهائيًا في كل المسارات** — وجوده خطأ فادح
  يُرفض في المراجعة. افحص قبل الدفع:
  `grep -rn "speechSynthesis" src/ → صفر نتائج`.
- أصوات الوكلاء المتخصصين فقط من القائمة البيضاء `AGENT_ELEVEN_VOICES`؛
  الخادم يقبل `voiceId` من `ALLOWED_ELEVEN_VOICE_IDS` وإلا يعود لصوت FINN.
  FINN نفسه لا يرسل `voiceId` أبدًا.
- **audio bus واحد** يمنع تداخل الأصوات؛ iOS يتطلب تفعيل AudioContext
  بأول إيماءة مستخدم.
- نصوص TTS بالتشكيل الكامل (النمط الثنائي display/tts)؛ الردود تُصرّح
  بأن بيانات العرض محاكاة عند الاقتضاء.

## طريقة الإصلاح المحفوظة «مصادَق أولًا ← بديل عام عند 401/403»
(المصدر Lovable `f413ffa` — موثقة في CLAUDE.md، مثبّتة باختبار عقد
`src/lib/finn-core/services/finn-service.test.ts`):
1. جرّب النقطة المصادَقة أولًا (Bearer من جلسة Supabase).
2. عند 401/403 أعد نفس الطلب بلا Authorization (مسار الضيف في
   `/api/chat`) أو عبر `/api/public/...` المكافئ
   (`aria-transcribe`, `aria-tts`).
3. لا تُظهر عبارات مصادقة للمستخدم — رسالة عربية محايدة + زر إعادة.
4. جاهزية القدرة = OR عبر كل المفاتيح القادرة عليها (`/api/chat/health`).

## طبقات «FINN لا تتعطل» (تُصان معًا)
1. رد مضمون: لا مزوّد متاحًا ← `/api/chat` يبث ردًا محليًا صادقًا (لا 503).
2. إعادة محاولة تلقائية 2× بتراجع زمني في `FinnCopilot` + تبريد المزوّد
   الفاشل في الخادم (`isCooling`/`markVendorFatal`).
3. المحادثة الصوتية لا تتوقف: بعد استنفاد المحاولات ينطق FINN سطر حالة
   بصوته وتعود المحادثة للإصغاء بعدّاد جديد.
4. بوابة تأكيد بشري لأي إجراء طارئ أو كتابة يقترحها FINN.

## أداء
- `MessageResponse` (streamdown/shiki/mermaid) **ممنوع** في FinnCopilot —
  يبقى `react-markdown + remark-gfm` (ميزانية الأداء).
