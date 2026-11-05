---
name: video-remotion-motion-graphics
description: السكيل 07 من الثمانية (claude remotion skill — haidrrrry/claude-remotion-skill، MIT، مسمَّر). عشر قواعد غير قابلة للتفاوض لموشن Remotion احترافي — لا interpolate خطّي، كل دخول ٢–٣ خصائص وspring، stagger لكل شيء، مخرج أسرع من المدخل، خمس طبقات في كل مشهد، Ken Burns لكل صورة ثابتة، تنفّس العناصر الساكنة، كل الأزمنة من fps، theme واحد، ثم ريندر ← استخراج إطارات ← النظر ← إصلاح. يُستدعى عبر sadeed-video-production قبل كتابة أي كود Remotion ولتشخيص «الفيديو يبدو عامًّا/هاويًا».
---

# 07 · claude remotion skill — فيزياء وفحص الريندر

**يحكمه** `sadeed-video-production` (اقرأه أولًا؛ قواعد سَدِيد فيه تعلو على ما هنا).

## الأصل المودَع

`vendor/` نسخة حرفية من `github:haidrrrry/claude-remotion-skill` عند `1dcbe5e3fc6cf970bd10d3cc05f0a8a5d19d0383`
(٢٠٢٦/٠٨/١٢)، رخصة MIT (`vendor/LICENSE`). المدخل: **`vendor/remotion-motion-graphics/SKILL.md`**.

| الملف                                                           | ما فيه                                                                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor/remotion-motion-graphics/SKILL.md`                      | القواعد العشر، التدفّق (scope ← setup ← build ← render ← **verify**)، أعطال شائعة                                                       |
| `vendor/remotion-motion-graphics/references/motion-patterns.md` | مكتبة مكوّنات تُنسخ: BgMesh · Grade · Grain · Vignette · KenBurns · WordReveal · Stagger · Counter · انتقالات · parallax · كابشن متزامن |
| `vendor/remotion-motion-graphics/references/design-rules.md`    | لوحات وطباعة وهندسة مشهد وصوت وقائمة ما قبل التسليم                                                                                     |
| `vendor/remotion-motion-graphics/assets/theme.ts`               | **قالب** الثيم يُنسخ إلى مشروعك (مودَع قالبًا لا يُنفَّذ في مكانه)                                                                      |

جدول الأصل الذي أبرزه الفيديو — «فيديو AI عام» مقابل «مع هذا السكيل»: خطّي ← springs وbezier فقط؛ fade وحيد ← ثلاث خصائص؛
كل شيء يدخل معًا ← stagger 3–6 إطارات؛ خلفية مسطّحة ← mesh + grade + grain + vignette؛ صور ثابتة ← Ken Burns؛
ريندر غير مفحوص ← استخراج إطارات بـffmpeg وفحص بصري **كل مرة**.

## ما لم يُودَع

لا سكربتات في هذا السكيل. خارج النطاق: مجلد `examples/` (7.7MB) وعرضا `demo.mp4`/`demo.gif` والمولّد `scripts/` في
جذر المستودع — تُجلب عند الحاجة بـ`node scripts/toolchain/video-skills.mjs fetch claude-remotion-skill`.

## ما يتغيّر في سَدِيد

- يُطبَّق على مشروع `remotion/` القائم ومع المهارات الرسمية `remotion-*` (واجهة Remotion الحديثة v4.0.505 تسبق أي API
  قديم في الأصل عند التعارض).
- `theme.ts` يُملأ من رموز سَدِيد والخطوط العربية؛ لون البطل واحد من اللوحة لا coral.
- النصّ العربي: `direction: rtl` وحشو الحواف من الجهة الصحيحة؛ WordReveal على كلمات عربية يُراجع ترتيبها.
- خطوة **VERIFY** إلزامية هنا بحكم الدستور (المادة ٣٠ بروحها): لا تسليم بلا إطارات مفحوصة، وتُذكر الإطارات التي فُحصت.

## تنبيهات المراجعة الأمنية (٢٠٢٦/١١/٠٥)

- `npm install remotion …` يخصّ مشروعًا جديدًا؛ هنا مشروع `remotion/` قائم بقفله — لا تثبيت عامّ ولا تغيير إصدارات بلا قرار.
- «أعد هيكلة ما يخالف القواعد قبل إضافة ميزات» (الخطوة 1) تنطبق على مشروع فيديو تحت العمل لا على `remotion/brand/` المعتمد بلا طلب.
- «PAYOFF = النتيجة/الرقم» يعني رقمًا بمصدر؛ وتفريغ الكلمات بـWhisper محلّيًّا (`@remotion/install-whisper-cpp`) لا برفع الصوت لخدمة خارجية بلا إذن.
- أوامر النسخ إلى `~/.claude/skills/` في `vendor/README.md` تعليمات المنبع؛ التثبيت هنا بـ`install-user` فقط.
- «ضع لقطات المستخدم في `public/`» لتحرير فوتاج قائم: لقطات المالك **لا تدخل git ولا جذر الويب المنشور** — تُوضع في مسار متجاهَل (`.sadeed/video-out/` أو مسار داخل `remotion/public/` مدرج في `.gitignore`) ويُفحص `git status` قبل أي commit.
