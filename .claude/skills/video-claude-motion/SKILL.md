---
name: video-claude-motion
description: السكيل 05 من الثمانية (claude motion — whaleyxbt/claude-motion، MIT، مسمَّر). «الذوق البصري» لموشن Remotion بأرقام — timeline.json مصدرًا وحيدًا للزمن، منحنيات easing وsprings بقيم محدّدة، stagger وهولد للقراءة، مخرج أسرع من المدخل، تركيز واحد في الكادر، نسيج حيّ (grain/vignette)، حلقة مراجعة بلوحات إطارات (review-loop)، وتصميم صوت إجرائي (sound-design) بـ−14 LUFS. يُستدعى عبر sadeed-video-production قبل أي كود موشن ولمراجعة أي ريندر.
---

# 05 · claude motion — الذوق البصري

**يحكمه** `sadeed-video-production` (اقرأه أولًا؛ قواعد سَدِيد فيه تعلو على ما هنا).

## الأصل المودَع

`vendor/` نسخة حرفية من `github:whaleyxbt/claude-motion` عند `e627941543d9988b155dc610bb9cc0115a5e365e`
(٢٠٢٦/١٠/٠٩)، رخصة MIT (`vendor/LICENSE`). المدخل: **`vendor/.claude/skills/motion-design/SKILL.md`**.

| الملف                                                            | ما فيه                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor/.claude/skills/motion-design/SKILL.md`                   | القواعد بالأرقام: easeOut `bezier(0.16,1,0.3,1)`، springs (14/140/0.8 …)، stagger 0.09 ث للكلمات، هولد ≥ 1 ث، المخرج نصف المدخل، لا خطّي إلا للمستمرّ |
| `vendor/.claude/skills/review-loop/SKILL.md`                     | ريندر مسودة ← لوحة إطار لكل بيت ← قائمة فحص (تركيز، أمان الحواف، نصّ لا يتحرّك وهو يُقرأ) ← إصلاح ← إعادة                                             |
| `vendor/.claude/skills/sound-design/SKILL.md`                    | كيو شيت على الـtimeline نفسه، أي صوت لأي حدث، الهرم الصوتي، −14 LUFS، التحقق بـwave                                                                   |
| `vendor/.claude/skills/web-sims/SKILL.md`                        | محاكاة ويب 60fps كادرًا بكادر                                                                                                                         |
| `vendor/AGENTS.md` · `vendor/README.md` · `vendor/timeline.json` | هيكل المشروع ومثال الـtimeline                                                                                                                        |

## ما لم يُودَع

مشروع Remotion المرجعي (`src/` · `sims/`) ومحرّك الصوت `sfx/` (Python) و`scripts/` والوسائط: تُجلب بـ
`node scripts/toolchain/video-skills.mjs fetch claude-motion` إلى `.sadeed/video-toolkits/claude-motion/` عند الـcommit نفسه،
وتُقرأ قبل تشغيلها. القواعد نفسها تعمل بلا الحزمة: تُطبَّق على مشروع `remotion/` في هذا المستودع.

## ما يتغيّر في سَدِيد

- الألوان من رموز سَدِيد (`docs/design/03-color-system.md`) لا `C` في `lib.ts` الأصل؛ الخطوط العربية بدل Instrument Serif/Inter.
- الـtimeline مبدأ ملزِم: الأزمنة في ملف واحد يقرؤه الصوت والصورة (وهو ما يفعله `remotion/brand/` فعلًا).
- `review-loop` **إلزامي قبل أي تسليم**؛ لوحات الإطارات تُقرأ بعين Claude ويُقال ما فُحص وما أُصلح.
- التعليق الصوتي عند الحاجة: صوت سَدِيد عبر ElevenLabs (الأصل يذكر ElevenLabs MCP اختيارًا — عندنا هو الأصل الوحيد لصوت المنتج).

## تنبيهات المراجعة الأمنية (٢٠٢٦/١١/٠٥)

- «أرقام حقيقية» في `web-sims` و«النتيجة/الرقم» في البيتات = أرقام بمصدر مذكور في `facts.md`، أو توضيحية موسومة.
- بنية المشروع في `AGENTS.md` (`src/Root.tsx`…) تخصّ مستودع الأصل؛ هنا تُسقَط على `remotion/` كما هو مرتَّب فعلًا.
- طباعة الأصل لاتينية: التباعد الضيّق (`-0.02em`) والتسميات الكبيرة بتباعد واسع (`0.2em`، uppercase) **لا تُطبَّق على النصّ العربي** (`letterSpacing: 0` ولا `text-transform`)؛ تبقى للتسميات اللاتينية وحدها.
