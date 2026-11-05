---
name: video-remotion-overlay
description: السكيل 08 من الثمانية (remotion motion graphics — من agamm/video-agent، MIT، مسمَّر). عناصر بخلفية شفافة فوق لقطاتك مباشرة — عناوين فصول، لوور ثيرد، مقارنات قبل/بعد، أرقام تتصاعد، كابشن حركي كلمة كلمة — تُكتب مكوّنات Remotion مُعامَلة بالـprops، تُصيَّر طبقةً شفافة (ProRes 4444 أو WebM alpha) ثم تُركَّب على الفوتاج بـffmpeg؛ ومعها video-overlay للثابت (نصّ/شعار/PNG شفاف) وcaptions وتحرير بالنصّ. يُستدعى عبر sadeed-video-production عند إضافة عناصر فوق فيديو مصوَّر أو تركيب طبقات أو كابشن متزامن.
---

# 08 · remotion motion graphics (video-agent) — عناصر بخلفية شفافة

**يحكمه** `sadeed-video-production` (اقرأه أولًا؛ قواعد سَدِيد فيه تعلو على ما هنا).

## الأصل المودَع

`vendor/` نسخة حرفية من `github:agamm/video-agent` عند `cc00d2815869cbf2d708426a5082612f0c3b4dbf` (٢٠٢٦/٠٧/٢٨)،
رخصة MIT (`vendor/LICENSE`). المدخل: **`vendor/.claude/skills/remotion-graphics/SKILL.md`**.

| الملف                                                                                                                                                                  | ما فيه                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor/.claude/skills/remotion-graphics/SKILL.md`                                                                                                                     | النمط: المكوّن بالـprops ← ريندر الطبقة الشفافة وحدها ← `ffmpeg overlay` بنافذة زمنية؛ الزمن من تفريغ الكلمات لا بالعين                                     |
| `vendor/.claude/skills/video-overlay/SKILL.md`                                                                                                                         | التركيب الثابت والمتحرّك (RGBA PNG لا GIF)، تحديد الموضع بالحساب (grid/dot-probe) لا بالتخمين                                                               |
| `vendor/.claude/skills/captions` · `cutting-rhythm` · `video-transitions` · `edl-edit` · `filler-removal` · `audio-edit` · `color-grade` · `reframe-social` · `editor` | بقية حزمة التحرير (الكابشن، إيقاع القطع، الانتقالات، EDL، إزالة الحشو، الصوت، التدريج، إعادة التأطير 9:16)                                                  |
| `vendor/remotion/`                                                                                                                                                     | **قالب** مشروع Remotion للطبقات: `LowerThird` · `TitleCard` · `KineticCaption` · `FinalEdit` (CUES) · `anim.ts` (TIMING) — مودَع قالبًا لا يُنفَّذ في مكانه |
| `vendor/README.md`                                                                                                                                                     | وصف الـCLI البايثوني `video-agent` (غير مودَع) والتقاليد: «التحرير نصّ»                                                                                     |

## ما لم يُودَع

`video_agent.py` وأدوات `uv` و`grok-video-edit` (تعديل توليدي عبر API خارجي): شيفرة طرف ثالث تُجلب بـ
`node scripts/toolchain/video-skills.mjs fetch video-agent` وتُقرأ قبل تشغيلها. أوامر `uv run video-agent …` في الملفات
المودَعة تعمل فقط بعد الجلب والتثبيت بقرارٍ واعٍ؛ وما يلزمنا غالبًا هو **النمط** (طبقة شفافة + ffmpeg) ويُنفَّذ بـffmpeg
المحلّي ومشروع `remotion/`.

## ما يتغيّر في سَدِيد

- `h264_videotoolbox` في الأمثلة ترميز macOS؛ على Linux/CI `libx264 -crf 17` أو كما في `remotion/brand/RENDER.md`.
- نصّ اللوور ثيرد والعناوين بالعربية وبخط سَدِيد؛ أسماء أشخاص حقيقيين على الشاشة **لا تُكتب** إلا بأمر المالك.
- الأرقام المتصاعدة (count-ups) من مصدر مذكور (المادة ٢٧) أو توضيحية موسومة.
- رخصة Remotion للاستعمال التجاري: قرار المالك (ينبّه عليها الأصل نفسه).

## تنبيهات المراجعة الأمنية (٢٠٢٦/١١/٠٥)

- **مستبعَد بقرار** (في القفل `exclude`): سكيل `grok-video-edit` — يرسل مقاطع المالك إلى API خارجي (xAI) ويُطلب فيه `XAI_API_KEY` في `.env`؛ لا يُستعمل بلا أمر صريح من المالك، ولا مفتاح في المستودع.
- **مستبعَد بقرار أيضًا: `CLAUDE.md` الأصل** — Claude Code يحمّل أي `CLAUDE.md` متداخل آليًّا بسلطة ذاكرة المشروع حين يقرأ ملفًا في مجلده، فكان سيفرض `uv sync` و`mise install ffmpeg` و`XAI_API_KEY` في `.env` بسلطة أعلى من هذا الغلاف. القاعدة في القفل (`deniedBasenames`) وحارسها: لا `CLAUDE.md` ولا `settings*.json` ولا `.mcp.json` تحت أي `vendor/`.
- أمر `yt-dl` (في `CLAUDE.md` الأصل غير المودَع وفي `vendor/README.md`): تنزيل من يوتيوب لمحتوى المالك أو بإذن صاحبه فقط.
- بيانات العيّنة في القالب (`remotion/src/FinalEdit.tsx`: «Lior Kolnik» · «Eve Security» · `#5b8cff`) **تُستبدل** بالكامل؛ لا اسم شخص حقيقي على الشاشة بلا إذنه ولا لون خارج رموز سَدِيد.
