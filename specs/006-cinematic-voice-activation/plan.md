# Implementation Plan: الفيلم الناطق وحركة الشاشات

**Branch**: `feature/sadeed-cinematic-voice-activation-20261123` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

## Summary

WhySadeed أولًا ثم غرفة التحكم. يعاد استخدام المشغل والمنسق والمساعد القائمين. الأساس `ac4a713386887065bd61ae2bcc4224a734383d67` وفحوصه تاريخية، ولا تُحسب نتائج 006.

## Acceptance and Constitution

> «لا تضف ولا تشغّل اختبارات Unit أو Integration أو E2E أو حمل أو مجموعات تقييم واسعة بصفة اختيارية لهذه الدفعة.»

> «استوفِ أي بوابة إلزامية مفعلة في GitHub أو Vercel أو مسار الإصدار الفعلي. لا تعطّل الحماية أو تغيّر عتباتها لتمرير التغيير.»

القبول ملاحظات تشغيلية خفيفة فقط. لا اختبارات اختيارية أو CI يدوي أو smoke harness، ولا شروط Safari/login يدوية إضافية من 004/005. الوظائف الأربع البعيدة القائمة محفوظة. ci.yml مطابق origin/main بعد إزالة وظيفة media المحلية غير المنشورة فقط. عُدلت assertions في أربعة ملفات قائمة للبوابة التلقائية ومعاني الوسائط الجديدة، دون حالات أو ملفات أو تشغيل اختبارات جديدة.

المواد **1، 3، 10–15، 21، 32–34** تحكم الهوية واللغة والمنسق والصورة والتوكنات والمقاسات. المواد **4–8، 23–27** تحفظ الأسرار والبيانات والصلاحيات وصدق المصادر. المواد **16–18، 28–30، 35** تبقي البوابات الفعلية والحارس والدورة المحدودة والتعافي وحفظ الكاتب الآخر. لا تعديل AGENTS أو إعداد محمي أو ميزانية أو صوت/مزود المساعد الحي.

## Technical Context and Files

- `IdentityFilmHero.tsx` و`identity-film-model.ts` داخل `src/components/home/`، مع المشغل والمنسق القائمين: مصدر اللغة المختارة فقط، وتشغيل يدوي 1×، وإيقاف القديم ثم seek إلى بداية المشهد المكافئ.
- `media-production/sadeed-identity-20261123/`: النصوص و FLAC lossless و alignment و scenes و render.py و provenance و PRODUCTION_NOTES. لم يتغير مصدرا 26/56 ثانية. المقاطع 1× مع holds و crossfades، والختام الأصلي 16.5–26 s متصل 1×.
- MP4 الناطقان تحت `public/media/identity/`: ‏AR 2,826,849 B/71.400 s و EN 2,782,554 B/69.566667 s؛ 1344×448/30 fps/H.264/AAC واحد لكل ملف. مدة VO هي 71.381179/69.554717 s. VTT من alignment المزود المطابق للنص، وليست تفريغًا سمعيًا مستقلًا.
- مشاهد why/platform/sources/ai/clarity/decision: حدود AR هي 0/11.011/24.679/34.854/47.983/59.134/71.381179؛ وحدود EN هي 0/10.231/24.625/33.702/46.989/57.164/69.554717.
- decode/faststart/loudness ناجحة: ‏AR−16.03 LUFS/−3.08 dBTP، ‏EN−16.02/−4.03، وفارق speech/bed المجمع 22 dB. التعليق مسبق التسجيل من HeyGen بتفويض صريح؛ دعوتان فقط ورصيد add-on 150 قبل/بعد، دون model/charge receipt. لا ادعاء free، ولا استماع أو نطق أو تشغيل كامل مثبت. لم يتغير ElevenLabs/runtime أو صوت المساعد.
- غرفة التحكم 1320×720 ببصمة 54411…e0e4، ومشتقا 640/1320 بحجم 19,286/58,736 B وجودة 66. `CommandRoomScreens.tsx` وورقة أنماطه تحصران 24 ثانية داخل الشاشات مع السكون عند reduced/offscreen/hidden. جرد public/home هو 409,003/409,600 B، وليس ميزانية بناء نهائي.
- المشتق 1280 السابق محفوظ بايتًا في `docs/design/reference/derived-archive/`. ملف welcome غير المستخدم 11,488,594 B محفوظ في `media-production/archive/welcome/` مع README وبصمته ومصدره. حُدث ROLLBACK وحُوّل المخرج الافتراضي للمولد القديم إلى الأرشيف؛ URL القديم يستمر على الإنتاج الحالي حتى نشر أثر جديد، ولم يحدث نشر 006.

## Bounded Assistant and Presence Slice

يفتح CommandPalette ‏`open({draft})` بسؤال AR/EN قابل للتحرير وسياق route ثابت وتلميحات diagnostics مغلقة. لا autosend أو counts/PII/HTML أو ادعاء صلاحية. أُصلحت React state و late mount وتحديث locale؛ توجد مسودة معلقة واحدة بحد 2048. التنقل حتمي إلى المسارات الظاهرة القائمة، و filters diagnostics عند الدخول من صفحة أخرى فقط.

presence يصحح الادعاء الزمني:delta=null، مع إكمال عينة السجلات المحدثة و baseline مفقود. المفقود/الخطأ null مقابل 0 الحقيقي. الميزتان 1/3 جزئيتان. ميزة 12 **BLOCKED**: ‏`/sec/assets` مخفي بقرار المالك ويعيد التوجيه، ولم يثبت صف حقيقي معتمد أو asset deep-link/auth resolver؛ قد يستخدم التوأم محاكاة. لا QR ميت أو data source جديد.

## Current Local Evidence

- TypeScript **PASS**: `/tmp/sadeed006-types-final.log`.
- ESLint **PASS، 0 errors/32 existing warnings**: `/tmp/sadeed006-lint-final.log`.
- Production build **PASS، exit 0**: `/tmp/sadeed006-production-build.log`.
- Performance **PASS دون تغيير السقوف**: ‏696 ملفًا؛ الإجمالي 48,094,070/54,525,952 B ‏(45.87/52 MiB)، و JS 9,992,831/10,538,188.8 ‏(9.53/10.05 MiB)، و CSS 651,842/655,360، وأكبر media 6.28/14 MiB.
- مقابل 005: نقص الناتج 5,854,140 B وزاد JS 15,713 B؛ ليس ذلك تحسن chat latency أو p50/p95. لا قياسات جديدة لتلك الأزمنة.
- مراجعة إطارات محدودة وبيانات وسائط فعلية متاحة. لم تُنفذ ملاحظة runtime أو تشغيل كامل أو استماع. لا Unit/Integration/E2E/eval/load أو CI يدوي أو smoke harness اختيارية، ولا CI تلقائي بعد لعدم push.

Source QA قراءة جارية، وليست publish clearance. الرصد الآمن 04:28:53 يتضمن live04:27 للنطاقين والإنتاج عند 03ff، وليس 006. لا push/PR/merge/deploy أو SHA محلي نهائي 006. سؤال دورة 4 محاولات لم يُجب؛ لا افتراض ميزانية أو صرف احتياطي قديم.

## Spec Kit Method and Sequence

نُفذ resolver للقالب المركب ثم setup-plan و setup-tasks فعليًا من Spec Kit 1.3.1؛ hooks فارغة، ومؤشر feature المحلي المتجاهل يشير 006. لا CLI أو slash مختلق. [source-inventory.md](source-inventory.md) يثبت المصادر والحالات. يبدأ القبول بالفيلم، ثم حركة الشاشات، ثم توثق البوابات والحارس والدورة والإيصالات الفعلية، دون توقع نجاح أو معرفات.

## Complexity Tracking

لا محرك أو مخزن أو workflow جديد، ولا سلطة تشغيلية من الجرد. الإضافة وسائط ومشغل قائم وطبقة شاشات وشريحة مساعد/حضور محدودة؛ بقية الميزات ليست مكتملة.
