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
src/lib/executive/live-dashboard-pdf.ts, live-dashboard-pdf.test.ts
src/routes/_authenticated/live-dashboard.tsx
```

## Current Evidence and Sequence

**البوابة المحلية الكاملة FINAL PASS، EXIT 0** في `/tmp/sadeed-reference-full-check-final.log`:lint صفر أخطاء مع 32 تحذيرًا قائمًا، TypeScript PASS، و Vitest **448 ملفًا، 8506 ناجحًا+30 متخطى=8536 خلال 530.20 ثانية**. البناء وكل الميزانيات ناجحة بالسقوف الأصلية:694 ملفًا، إجمالي 53,948,210/54,525,952 بايت؛ JS 9,977,118/10,538,188.8 (9.51 MiB)؛ CSS 648,852؛ أكبر JS 1,262,398 بايت. contrast اجتاز legacy floors فقط، لا WCAG AA شامل. مسح الأسرار 3,568 ملفًا نظيفة؛ audit 12 (3 low/9 moderate/0 high/critical). لا تغيير caps/deps/lock/config.

اكتمل توحيد PDF النصي فقط:adapter في `src/routes/_authenticated/live-dashboard.tsx` و helper `src/lib/executive/live-dashboard-pdf.ts` على pdf-lib القائمة. محلل PDF مستقل في `src/lib/executive/live-dashboard-pdf.test.ts` اجتاز 8/8:الإنجليزية وكل الحقول والدقة/ISO، null وغير المحدود غير مقيسين لا 0، آخر 40 صفًا/صفحتان 32+8، A4 أفقي والهوامش/الاسم لنطاق 7/30/90. فحص max-safe فعلي أظهر التفاف سطرين مع 7 تأكيدات ناجحة في `/tmp/sadeed-dashboard-max-safe-receipt.json`، وراجعه حارس المصدر. **JS 10,550,272→9,977,118 يوفر 573,154 بايت، والإجمالي 54,521,364→53,948,210 يوفر المقدار نفسه**. لا حاجة لزيادة السقف؛ المقترح 10.065 لم يُطبق وأصبح غير لازم.

الأصول الفعلية و 89 فحصًا مركّزًا/8 ملفات و Chromium 5/5 مثبتة كما في العقد. الفيديو 627,455 بايت، الملصق 34,434، و decode/faststart/نهاية 15 ثانية وحصرية الملفات الثلاثة ناجحة. الصوت المؤلف رياضيًا لم يُستمع إليه. اجتازت 20 حالة عرض ثم 13 حالة هندسة؛ لقطات AR 390/EN 1280 في `/tmp/sadeed-reference-layout-final` و manifest `/tmp/sadeed-twin-reference-manifest.json`. لا جمع للفحوص المركزة أو 8 PDF أو 7 assertions مع إجمالي Vitest. Figma جزئي و Higgsfield/HeyGen بلا job، دون تغيير عن حالة الأدوات أعلاه.

محاولة WebKit التطبيق الجديدة الوحيدة **توقفت عند 04:14:42.791 UTC**: تعطل أصلي في beforeAll.goto قبل DCL وأي assertion على التطبيق. النتيجة **فشل خطاف واحد، صفر app assertions، وأربع حالات لم تُشغل**؛ ليست خمس حالات منتج فاشلة. stderr أظهر `terminate called without an active exception`، والسبب **UNKNOWN**. نجح probe ساكن في السياق المصرح نفسه؛ لا ينسب ذلك التعطل للمنتج أو المضيف. خروج الغلاف outer exit 0/signal null لا يعني PASS. لا إعادة محاولة، وأوقفت الخوادم المملوكة وحُذفت TLS الخاصة دون لمس CUA. manifest `/tmp/sadeed005-webkit-manifest.json` يجرد 20 أثرًا حديثًا خامًا/trace وصفر مخرجات حالات تطبيق؛ بصمات Chromium السابقة عادت دون اختلاف. الدخول و iPhone Safari الفعلي ما زالا بانتظار المالك، ولا all-browsers-green.

آخر رصد قرائي مزدوج `.audit-tmp/twin005-pre-release-state-20261123-0406.json` بين **04:06:05 و 04:06:11 UTC**:all-state Nov 23 Vercel 0 مع terminal pagination، main `03ff299bcf1dc1ced9d7f923179aba6da39e4e72` و protected=false و checks/contexts/rules فارغة/enforcement off؛ صفر تغييرات. **قرار دورة 4 محاولات فقط ما زال ينتظر جواب المالك**؛ سؤال رفع السقف السابق لم يعد ضروريًا ولا يلزم تطبيقه. الدورات 002/003 مغلقة دون مساس، ولا push أو PR أو merge أو Preview/Production جديد. استثناء CI خاص بهذه المهمة ولم نعطل حماية أو workflow.

للتاريخ المختصر:قياس JS السابق تجاوز 12,083.2 بايت، وعالجته PDF ضمن السقف. محاولة Vitest السابقة أوقفت 143 بعد repro spawnSync/pipe EPERM والمطابق المصرح به status 0/PROBE_OK؛ لم يُعدل اختبار أو مصدر لإخفاء البيئة. البوابة الكاملة الجديدة أعلاه هي النتيجة الحالية وتحل محل المحاولة الموقوفة.

الطريقة: Spec Kit v1.3.1؛ resolver بالقالب المركب ثم setup-plan و setup-tasks نُفذت فعليًا، و hooks فارغة. لا ادعاء تشغيل CLI أو slash. مؤشر feature المحلي المتجاهل يشير 005؛ الفرع أنشأه root لا السكربت.

## Complexity Tracking

لا استثناء دستوري أو تعديل سياسة دائمة. الحالة المحلية وإعادة استخدام المنسق والأصول يمنعان إضافة سلطة أو تكلفة مخفية. تسجل العوائق بدل توسيع النطاق.
