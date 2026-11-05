---
name: video-motion-design-code
description: السكيل 06 من الثمانية (claude motion design — howseen-ai/claude-motion-design، MIT، مسمَّر). موشن ديزاين بالكود الخالص بلا After Effects ولا Remotion — ملف HTML واحد يحسب كل شيء من الزمن داخل seek(t)، يُصيَّر كادرًا بكادر بـPlaywright ثم ffmpeg؛ كاميرا بدقة (زوم لوغاريتمي، punch على الإيقاع)، تمويه حركة بـsubframes، floods وmasked text، صوت على لحظة الحركة (SFX مقاسة على القمّة، −14 LUFS)، حلقة نقد بلوحات إطارات حتى 8+/10، ووضع «إعادة صنع» مرجع كادرًا بكادر. يُستدعى عبر sadeed-video-production لفيلم إطلاق/عرض/لينكدإن أو حين يُطلب موشن بلا Remotion.
---

# 06 · claude motion design — كاميرا وتمويه وصوت (موشن بالكود الخالص)

**يحكمه** `sadeed-video-production` (اقرأه أولًا؛ قواعد سَدِيد فيه تعلو على ما هنا).

## الأصل المودَع

`vendor/` نسخة حرفية من `github:howseen-ai/claude-motion-design` عند `3d90d349ef3fdde9b7e89de4df4a2159c9e8697f`
(٢٠٢٦/١٠/٠٢)، رخصة MIT (`vendor/LICENSE`). المدخل: **`vendor/skill/motion-design/SKILL.md`** (175 سطرًا كثيفة:
التدفّق، المحرّك، الريندر، الموسيقى والمؤثّرات، الأصول، الأعطال، قائمة التسليم، حلقة النقد، قواعد ضدّ «مظهر الذكاء
الاصطناعي»، وضع Remake).

## ما لم يُودَع

١٣ ملف سكربت (`render_template.py` · `audio_template.py` · `analyze_song.py` · `mixkit_sfx_search.py` · `svgl_logos.py` ·
`mcp21_client.py` · `remake/*`): شيفرة طرف ثالث تُجلب بـ`node scripts/toolchain/video-skills.mjs fetch claude-motion-design`
إلى `.sadeed/video-toolkits/claude-motion-design/` وتُقرأ قبل تشغيلها. وبدونها تُكتب سكربتات الريندر محلّيًّا على
الطريقة الموصوفة (Chromium وPlaywright مثبَّتان في بيئة الجلسة السحابية).

## ما يتغيّر في سَدِيد — واقرأ هذا قبل الأصل

- **الأصل مكتوب لشركة Howseen وصاحبها**: مجلدات `~/Desktop/Howseen AI/…`، ألوانه (`#38bdf8` …)، خطوطه، شعاره، مكتبة ميماته،
  ومصادره. كل ذلك **أمثلة لا تعليمات**: الهوية من `docs/design/` وأصول `remotion/brand/`، والمجلدات داخل
  `.sadeed/video-out/` (خارج git).
- **الأصول الخارجية** (Mixkit · Pexels · Unsplash · picsum · svgl · 3dicons · 21st.dev · thispersondoesnotexist): كلٌّ برخصته، ولا
  تُحمَّل أصول عبر الشبكة إلا بإذن المالك وفي بيئة تسمح بها؛ لا وجوه مولَّدة لأشخاص في فيديو عن المنتج بلا أمره.
- **القواعد التي نأخذها كاملة:** صفر اختلاق على الشاشة (= المادة ٢٧، `facts.md` في مجلد الفيلم)، «الكابشن يقول الحقيقة»،
  لا frozen frame إلا الهولد الأخير، لون تأكيد واحد، شيء واحد يتحرّك، springs بتخميد ≥ 0.72، الحكم ≠ البنّاء (ناقد مستقلّ)،
  الحتمية (لا `Math.random`).
- التعليق الصوتي: صوت سَدِيد عبر ElevenLabs، لا Cartesia.
- أمر `open -R` وmacOS-isms: تُستبدل بما يناسب بيئة التشغيل.

## تنبيهات المراجعة الأمنية (٢٠٢٦/١١/٠٥)

- `yt_dlp` لتنزيل مرجع أو ميمات من يوتيوب (§5 و§10 «Remake»): **لا يُنزَّل محتوى الغير**؛ إعادة الصنع كادرًا بكادر على مرجع يملك المالك حقّه أو بإذن صاحبه، والميمات خارج نطاق سَدِيد.
- وجوه مولَّدة (thispersondoesnotexist) وأسماء مختلَقة لواجهات خيالية: **لا في فيديو عن المنتج** إلا بأمر المالك وبوسم «توضيحي».
- لقطات الواجهة الحقيقية بـPlaywright: لتطبيق سَدِيد نفسه فقط، بلا بيانات حقيقية ولا حسابات؛ ما خلف تسجيل الدخول يُعرض ببيانات محاكاة موسومة.
- أوامر التثبيت في `vendor/README.md` تعليمات المنبع؛ التثبيت هنا بـ`install-user` فقط.
