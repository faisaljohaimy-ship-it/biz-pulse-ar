# Implementation Plan: التوأم المرجعي والفيديو

**Branch**: `feature/sadeed-twin-reference-motion-20261123` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

## Summary

أضف تجربة مرجعية داخل التوأم القائم، وخمس وظائف محلية مع نافذة فيلم يدوي. احفظ 004 دون ادعاء إصدارها. استخدم العقد [media-ui.md](contracts/media-ui.md)، ولا تنشئ API أو محرك 3D أو تكامل حي جديد.

## Technical Context

- TypeScript/React/TanStack/i18n والتوكنات و REGIONS والمنسق القائم؛ لا اعتماد runtime جديد.
- المصدر: `src/components/twin/executive/TwinExecutiveExperience.tsx` و`executive-twin-model.ts` واختباراهما، و`src/styles/twin-executive.css`؛ root يملك دمج المسار والرابط والأصول؛ نافذة التوأم المرجعية النقية تُفتح من زر الرئيسية دون تغيير سياسة الموظف، ومسار التوأم يدمجها محليًا مع بقاء الشجرة القديمة قابلة للاستخدام عند رفض chunk.
- أصل المرجع: `docs/design/reference/industrial-twin-owner-2026-11-23.jpg`، 589×1280، 245,700 بايت، SHA-256 `26d4e453a0b1c3b1ad688ecf0463b82de5ba33e629119548a4b274633b4b3d2a`؛ تحققت البصمة قرائيًا.
- عقد المكوّن: `initialRegionId?` من الأربع المعتمدة، وملصق يقدمه root، و`renderBroadcast?` لا يُركّب إلا بعد فتح يدوي. الحالة/الطبقات/التفاصيل محلية؛ لا تغيير graph أو شجرة التوأم.
- اكتمل إطار imagegen واحد:PNG ‏1672×941، محفوظ في `docs/design/reference/refinery-generated-first-frame-2026-11-23.png` وبصمة `c4fc9d754d407c1a3e0e114f210869bddebf56c4073ddacae85b5046d3cdc2f6`. حُولت منه نسختا WebP ‏640/1280 ‏41,640/140,314 بايت وفق `public/media/refinery/scene-manifest.json`؛ مشهد خيالي لا منشأة حية. اكتمل تصيير Python محلي 15 ثانية من الصورة، وليس job نموذج فيديو Higgsfield/HeyGen.
- [ملف Figma الفعلي](https://www.figma.com/design/RnW9Pqy2AucFG5frLFpe3f): أربعة إطارات قابلة للتحرير؛ الحالة **PARTIAL**. رفع الخلفية المولدة واجه proxy 403 وبلغت الأدوات حد نداءات Starter، ولم تتجدد اللقطات الأخيرة؛ لا ترقية خطة أو ادعاء تصميم كامل.
- Higgsfield: الرصيد 4 والاقتباس 12 ثانية 720p بتكلفة 60، فلا job. HeyGen: 150 add-on مع استحقاق/سعر غير محسوم، فلا job. لا ميزانية توليد إضافية معتمدة.

## Constitution Check

- **1، 3، 13–15، 21، 32–34**: هوية سديد، اللغتان/الاتجاهان والوضعان والتوكنات، المقاسات الخمسة و 44 بكسل ووضوح المصدر/الفعل.
- **4–8، 10–12، 23–27**: REGIONS الأربع دون تعديل، المراجع موسومة، لا أسرار أو بيانات تشغيلية أو صلاحيات/أوامر/إنفاق أو صوت مساعد بديل.
- **16–18، 28–30، 35**: اختبارات فعلية وقياس وبوابة حارس، حفظ الكاتب الآخر و 004، سقوف ثابتة ودورة محدودة باحتياطي نشرتين، إيصالات وتحقق/تعافٍ فعليان. لا تعديل محمي أو workflow دائم.
- طلب المالك «انشر فورًا بدون CI» استثناء حالي محدد، لا تفويض لتعطيل قواعد الحماية أوتغييرها. تحقق root من قابلية المسار الفعلية؛ أي رفض أو عائق يسجل ولا يلتف عليه. الدورة/ميزانية النشر الجديدة لم تُثبت بعد.

## Project Structure

```text
specs/005-twin-reference-motion/
  spec.md, plan.md, tasks.md, contracts/media-ui.md
src/components/twin/executive/
  TwinExecutiveExperience.tsx, TwinExecutiveExperience.test.tsx
  executive-twin-model.ts, executive-twin-model.test.ts
src/styles/twin-executive.css
```

## Current Evidence and Sequence

النطاق الحالي 35 ملفًا مرحليًا، على الالتزام المحلي 004 ‏`03c3fc25ffe9219d544f93a7442fad29d0e15cbb` غير المنشور. أحدث 89 اختبارًا مركّزًا في 8 ملفات نجحت، بما فيها رفض chunk وبقاء شجرة التوأم و`TwinLoadState` بمهلة 4 ثوانٍ وحالة/Retry 44 بكسل، والملفات اليدوية/الحصرية. TypeScript و ESLint النهائيان exit0 مع 32 تحذيرًا قديمًا وصفر أخطاء. لا تُجمع الفحوص السابقة 6/87 مع 89 كإجمالي مستقل.

الفيلم الفعلي `public/media/refinery/refinery-illustrative.mp4`: 15 ثانية، 1280×720، 24fps/360 إطارًا، H.264 و AAC، 627,455 بايت، SHA `71f167587086f3cf899b2249295994cb499046b9f65e77471799e7e94345f386`. الملصق 34,434 بايت، SHA `629865ab4fd88f17d5ac86bed620293973fd399e5dfd9d3026e18ce49750719a`؛ مجموعهما 661,889 بايت. decode و faststart ناجحان؛ الصوت مؤلف رياضيًا بمستوى RMS ‏−31 و peak ‏−21.7dB، ولم يُستمع إليه بشريًا.

Chromium: 5 اختبارات E2E ناجحة خلال 3.6 دقيقة، و 20 حالة مقاس/لغة/وضع؛ تشغيل 15 ثانية للنهاية ومعدلات الملفات الثلاثة وحصريتها. بعد إصلاح الهندسة 13 حالة اجتازت احتواء النصوص داخل بطاقاتها، بترتيب 3+2 للهاتف وخط 11 بكسل؛ لقطات طبيعية AR 390 و EN 1280 في `/tmp/sadeed-reference-layout-final`. manifest: `/tmp/sadeed-twin-reference-manifest.json`؛ صفر pageErrors ومحاولات كتابة/مزود محظورة، و health مزيف. هذه ليست Safari/iPhone أو تسجيل دخول؛ لم يُختبرا لهذه النسخة. تعطل WebKit المحلي القديم ما زال مجهول السبب ولا يثبت عيب 005.

**البناء النهائي EXIT 0، لكن ميزانية الأداء EXIT 1 بسبب JS فقط** في `/tmp/sadeed-reference-final-build.log`:JS ‏10,550,272 بايت مقابل 10,538,188.8، تجاوز 12,083.2؛ النمو عن 004 ‏10,538,004 هو 12,268 بايت. اقتُرح على المالك سقف 10.065 MiB بدل 10.05 (+0.015MiB، نحو 0.15%)؛ **لم يُعتمد ولم يتغير السقف**. القيم السابقة 7,865.2/8,050 تاريخية فقط.

بقية السقوف PASS:الإجمالي 54,521,364/54,525,952 بايت، هامش 4,588 فقط؛ CSS 648,852/655,360؛ أكبر JS 1.20/1.40MiB؛ media 10.96/14MiB؛ 696 ملفًا. contrast EXIT 0 للحدود الدنيا المعتمدة فقط، لا WCAG AA شامل. الأسرار EXIT 0:3,566 ملفًا متتبعًا نظيفة؛ audit EXIT 0 لحد high مع 12 finding (3 low/9 moderate/0 high/critical). TypeScript/Lint EXIT 0 مع 32 تحذيرًا قائمًا، وأحدث 89/89 مركّزة في 8 ملفات موثقة في `/tmp/sadeed-reference-frozen-focused.log`؛ لا فحوص سابقة تضاف إليها. T012 جزئية ما دامت الميزانية فاشلة.

أرسل root سؤال موافقة للمالك عن سقف JS المقترح ودورة جديدة من 4 محاولات (Preview 1 +Production stage 1 +reserve 2)، تبدأ عند الموافقة؛ **لا جواب بعد ولا دورة بدأت**. جرد Vercel الكامل لجميع الحالات في Nov 23 عند 03:42 عدّه 0 مع terminal pagination، و origin/main ما زال 03ff. دورات 002/003 مغلقة ولم تُمس احتياطياتها. metadata الحماية عند 03:12:protected=false و checks contexts فارغة/مطفأة و effective rules فارغة؛ لم نعطل حماية. استثناء CI طلب المالك لهذه المهمة فقط، ولا push أو PR أو commit جديد أو deploy أو ترقية مثبتة، ولا all-gates-green.

الطريقة: Spec Kit v1.3.1؛ resolver بالقالب المركب ثم setup-plan و setup-tasks نُفذت فعليًا، و hooks فارغة. لا ادعاء تشغيل CLI أو slash. مؤشر feature المحلي المتجاهل يشير 005؛ الفرع أنشأه root لا السكربت.

## Complexity Tracking

لا استثناء دستوري أو تعديل سياسة دائمة. الحالة المحلية وإعادة استخدام المنسق والأصول يمنعان إضافة سلطة أو تكلفة مخفية. تسجل العوائق بدل توسيع النطاق.
