# Gemma وClaude Code والتحكم من الآيفون

تحقق الوثائق: 2026-10-22. هذا دليل إعداد، وليس سجل تثبيت على جهاز المالك.

## ما يمكن تشغيله

LM Studio المكتبي يدعم macOS وWindows وLinux؛ وClaude Code CLI يدعم أنظمة الحاسوب المحددة في وثائقه. لا توجد سلسلة تثبيت مدعومة لهذه الأدوات الثلاث داخل iOS. حساب Google لا يمنح جلسة تحكم في نظام الهاتف أو صلاحية تثبيت تطبيقات عليه.

لتنفيذ التركيبة المطلوبة، يعمل Gemma وLM Studio وOmniRoute وClaude Code على حاسوبك، ويكون الآيفون واجهة تحكم عن بعد. وجود الطرفية داخل Safari لا يجعل الحساب محليًا على الهاتف. لا تستخدم Codespaces أو VPS إذا أردت الحساب على جهازك الشخصي.

تطبيق Locally المربوط بـLM Link يتيح محادثة نموذج يعمل على الحاسوب من الآيفون، لكنه ليس بديلًا عن Claude Code لتحرير مستودع، ويحتاج LM Link إلى الإنترنت لإنشاء الاتصال.

## التثبيت على حاسوب Windows — الأوامر ليست للآيفون

1. نزّل LM Studio من <https://lmstudio.ai/download> وثبّته. تحقق من متطلبات الذاكرة والمعالج أولًا، ثم نزّل نسخة Gemma تلائم ذاكرة جهازك. حجم النموذج والسياق يحددان الذاكرة والسرعة؛ اسم Gemma وحده لا يضمن كفاءة البرمجة أو استدعاء الأدوات.
2. ثبّت Node.js بإصدار مدعوم من OmniRoute؛ البيان الذي فُحص يقبل Node 22.22.2 ضمن سلسلة22 أو24 إلى26. استخدم24 المتوافق أيضًا مع المستودع. ثبّت Git for Windows وClaude Code من المصادر الرسمية. في PowerShell:

```powershell
winget install Anthropic.ClaudeCode
node --version
npm --version
claude --version
npm install -g omniroute@3.8.52
omniroute --help
```

3. من LM Studio حمّل Gemma إلى الذاكرة وافتح الخادم المحلي على1234؛ من طرفية يتوفر فيها `lms`:

```powershell
lms server start --port 1234 --bind 127.0.0.1
Invoke-RestMethod http://127.0.0.1:1234/v1/models
```

إذا لم يظهر `lms`، استخدم زر بدء الخادم في LM Studio. لا تجعل الخادم عامًا ولا تفتح1234 للإنترنت. لو فعّلت مصادقة LM Studio، خزّن رمزه محليًا في إعداد موفر OmniRoute ولا تضعه في المستودع.

4. شغّل `omniroute` وافتح لوحة التحكم المحلية التي يطبع عنوانها. أضف موفر LM Studio بعنوان `http://127.0.0.1:1234/v1`، واختر معرف Gemma الفعلي من قائمة النماذج. عطّل أي موفر سحابي وأي fallback أو combo يمكنه توجيه طلب خارج هذا الموفر؛ لا تربط حساب Claude السحابي أو Google للاستدلال. أنشئ مفتاحًا محليًا للبوابة. افحص الربط المحلي وعنوان الاستماع قبل الاستخدام عن بعد.
5. افتح PowerShell جديدًا، وأدخل معرف النموذج المحلي الكامل كما يظهر في OmniRoute، ومفتاح البوابة دون طباعته:

```powershell
$GemmaModel = Read-Host 'Exact Gemma model ID from OmniRoute'
$GatewaySecret = Read-Host 'Local OmniRoute access token' -AsSecureString
$env:ANTHROPIC_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $GatewaySecret).Password
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
$env:ANTHROPIC_BASE_URL = 'http://127.0.0.1:20128'
$env:ANTHROPIC_MODEL = $GemmaModel
$env:ANTHROPIC_DEFAULT_OPUS_MODEL = $GemmaModel
$env:ANTHROPIC_DEFAULT_SONNET_MODEL = $GemmaModel
$env:ANTHROPIC_DEFAULT_HAIKU_MODEL = $GemmaModel
claude --model $GemmaModel -p 'Reply with LOCAL_TEST_OK only; do not use tools.'
```

20128 منفذ OmniRoute الافتراضي المذكور في دليله؛ استبدله بالمنفذ الفعلي إذا تغيّر. لا تُضف `/v1` إلى `ANTHROPIC_BASE_URL`؛ يضيف Claude Code مسار Messages بنفسه. هذه الإعدادات خاصة بالجلسة، ولا تمس متغيرات SADEED أو Vercel.

## التحقق من المعالجة المحلية

- يجب أن يظهر الطلب نفسه في سجل OmniRoute موجّهًا حصريًا إلى LM Studio، وفي سجل خادم LM Studio تحت معرف Gemma المحمّل. اسم النموذج في الرد ليس إثباتًا.
- بعد تنزيل النموذج وإتمام الإعداد، اختبر توليدًا جديدًا مع قطع اتصال الإنترنت عن الحاسوب نفسه مع بقاء loopback والخادمين المحليين. نفذ ذلك من الحاسوب، لأن قطع الشبكة يقطع جلسة التحكم من الآيفون. نجاح توليد جديد مع ظهور الطلب في السجل المحلي يثبت الاستدلال المحلي لهذا الاختبار.
- أوقف خادم LM Studio ثم أرسل اختبارًا جديدًا: يجب أن يفشل، ولا ينجح عبر احتياط سحابي أو نتيجة مخزنة. عطّل التخزين المؤقت للاختبار أو استخدم رسالة فريدة.
- إن طلب Claude Code اتصالًا لخدمات أخرى، فلا تصف البرنامج كله بأنه يعمل دون إنترنت. اختبر واجهة LM Studio مباشرة، وافصل فشل مصادقة CLI عن توليد النموذج. التحديثات والبحث وMCP والتنزيلات قد تستخدم الشبكة؛ الاستدلال المحلي لا يعني انعدام كل حركة الشبكة.

## تعديل SADEED من الآيفون

بعد تجهيز الحاسوب، استخدم جلسة SSH أو سطح مكتب بعيد خاصة ومصادقًا عليها؛ لا تنشر منافذ البوابة أو LM Studio للعامة. اعمل على فرع منفصل للمستودع، ولا تمنح النموذج تجاوزات أمان. راجع الفروق وشغّل فحوص المشروع قبل الدفع. قدرة النموذج المحلي على توليد نص لا تثبت قدرته على تعديل الكود واستدعاء الأدوات بشكل صحيح؛ ابدأ بمهمة صغيرة واختبار حقيقي.

لم يُثبّت أي برنامج على هاتفك أو حاسوبك من جلسة ChatGPT هذه، ولم يُربط حساب Google أو يُستخدم مفتاح سحابي.

## مصادر الإعداد

- <https://lmstudio.ai/docs/app/system-requirements>
- <https://lmstudio.ai/docs/lmlink/lmlink-in-locally>
- <https://lmstudio.ai/docs/cli/serve/server-start>
- <https://lmstudio.ai/docs/integrations/claude-code>
- <https://code.claude.com/docs/en/setup>
- <https://github.com/diegosouzapw/OmniRoute/blob/main/docs/guides/CLAUDE-CODE-CONFIGURATION.md>
- <https://github.com/diegosouzapw/OmniRoute/blob/main/package.json>
