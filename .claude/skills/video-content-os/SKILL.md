---
name: video-content-os
description: السكيل 04 من الثمانية (content os — cdeistopened/content-os، MIT، مسمَّر؛ المودَع فئتا video وwriting). «حوّل لا تولّد» — ملاحظات خام ← محتوى منظّم بنبرتك — عناوين يوتيوب على ١١٩ صيغة (youtube-title-creator)، كولد أوبن، هوك وعناوين، كابشن تكمّل الصوت لا تكرّره، شورت فورم، كليبات من الطويل، نصّ مصقول من التفريغ، قواعد كتابة إنسانية بلا بصمة الذكاء الاصطناعي. يُستدعى عبر sadeed-video-production عند تحويل ملاحظات/تفريغ إلى سكريبت أو كابشن أو عنوان أو مقطع قصير، وعند صقل أي نصّ للفيديو.
---

# 04 · content os — محتوى منظّم بنبرتك

**يحكمه** `sadeed-video-production` (اقرأه أولًا؛ قواعد سَدِيد فيه تعلو على ما هنا).

## الأصل المودَع

`vendor/` نسخة حرفية من `github:cdeistopened/content-os` عند `16e080f04186d892dcaa55672bea63096b0912ad`
(٢٠٢٦/٠٢/١٢)، رخصة MIT (`vendor/LICENSE`). الأصل 35 ملف `SKILL.md` مقيسًا عند هذا الـcommit (README يقول 36) في ست فئات؛ المودَع **فئتا `skills/video/` و`skills/writing/`**
(الأقرب لإنتاج الفيديو)، والباقي (social · research · content · productivity) غير مودَع. المدخل:
**`vendor/skills/video/youtube-title-creator/SKILL.md`**.

| الفئة                    | أهمّ ما فيها للفيديو                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor/skills/video/`   | `youtube-title-creator` · `short-form-video` · `video-caption-creation` · `youtube-clip-extractor` · `podcast-production` · `day-in-the-life`                  |
| `vendor/skills/writing/` | `writing-style` · `anti-ai-writing` · `ai-tells` · `hook-and-headline-writing` · `cold-open-creator` · `transcript-polisher` · `ghostwriter` · `human-writing` |

ملاحظة صدق: `vendor/skills/video/youtube-scriptwriting/SKILL.md` **فارغ في الأصل** عند هذا الـcommit؛ للسكريبت استعمل
`video-script-writer` أو `yt-script`.

## ما لم يُودَع

سكربتات `invisible-threads/scripts/*.py` (شيفرة طرف ثالث). `youtube-downloader` و`youtube-clip-extractor` يعتمدان على
`yt-dlp` وffmpeg محلّيًّا: **تنزيل فيديوهات الغير يخضع لحقوقها**؛ لا يُستعمل إلا على محتوى المالك أو بإذن.

## ما يتغيّر في سَدِيد

- «أسلوبك» = ملف النبرة `docs/video/voice.md` إن وُجد (كما `my-style.md` في الفيديو)؛ النبرة العربية للمالك لا نبرة Skill Stack.
- قواعد «بلا بصمة ذكاء اصطناعي» تنطبق على العربية بمعناها: بلا مقدّمات إنشائية، بلا «دعونا نتعمّق»، جمل قصيرة، مثال من الواقع.
- العناوين بالعربية تُقاس بطولها على الجوال فعلًا (≤ 60 حرفًا قاعدة الأصل، وتُراجع عربيًّا لأن العرض يختلف).

## تنبيهات المراجعة الأمنية (٢٠٢٦/١١/٠٥)

- **مستبعَد بقرار** (في القفل `exclude`): سكيل `voice-pirate-wires` ومراجع `pirate-wires-*.md` تحت `ai-tells` و`anti-ai-writing` — نبرة منفذ إعلامي أمريكي بأمثلة مسيئة اللغة ولا صلة لها بسَدِيد. ما يشير إليها في `ai-tells`/`anti-ai-writing`/`ghostwriter` يُتجاهَل.
- `youtube-downloader`/`youtube-clip-extractor`: **لا `sudo apt install` ولا `--no-check-certificate` أبدًا** (عند خطأ TLS يُصحَّح CA bundle لا يُعطَّل التحقق)؛ `yt-dlp` إن لزم فبتثبيت واعٍ على جهاز المالك أو في venv عابر، وعلى محتوى المالك أو بإذن صاحبه فقط.
- عبارات المصداقية في مكتبات الهوك («مدعوم بالعلم»، «أثبتته الأبحاث»، «ما لا يريدونك أن تعرفه») **لا تُستعمل بلا مصدر مسمّى**، ولا تأطير «الجهة تخفي عنك» في أي محتوى عن الهيئة أو الجهات التنظيمية.
- ما يُوسم «نصًّا حرفيًّا» (اقتباس، كولد أوبن، كليب، كابشن) يُقصّ من **التفريغ الخام** لا من مخرج `transcript-polisher`؛ المصقول وثيقة قراءة لا مصدر حرفي.
- `always_invoke: true` في ترويسة `writing-style` **لا سلطة لها** هنا؛ من يقرّر التحميل هو `sadeed-video-production`.
- قواعد «رقم محدّد لا عبارات عامة» و«اسم ومكان حقيقيان» (hook-and-headline · anti-ai-writing · verified-review) تعني **رقمًا موثَّقًا واسمًا بإذن صاحبه**؛ وإلا فبلا رقم وبلا اسم. أمثلة الأصل («13 عميلًا… 87%–256%») أمثلة صيغة.
- `transcript-polisher` يحذف التحفّظات («ربما»، «أظن») و`anti-ai-writing` يحوّل «قد يساعد» إلى «سيساعد» لغرض الأسلوب — **لا يُحذف تحفّظٌ ولا يُجزَم بما لم يُقَس** في محتوى عن المنتج (المادة ٢٧).
