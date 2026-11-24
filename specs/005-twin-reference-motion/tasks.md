# Tasks: التوأم المرجعي والفيديو

**Input**: [spec.md](spec.md)، [plan.md](plan.md)، [contract](contracts/media-ui.md).

**Historical pre-commit status**: التنفيذ والأصول و Chromium والبوابة المحلية الكاملة ناجحة. لا حاجة لرفع السقف؛ WebKit لديه hook FAIL قبل التطبيق و 4 not run، والدخول الحقيقي بحساب اختبار مأذون و iPhone والإصدار غير مكتملة عند تلك اللقطة.

**2026-11-24 reconciliation**: سؤال دورة الأربع محاولات القديم ليس طلبًا جديدًا؛ يثبت سجل006 موافقة المالك اللاحقة بست للدورة نفسها وحفظ الاحتياطي. سجل [التحقق539cc26](../006-cinematic-voice-activation/verification-2026-11-24.md) يثبت Source QA/guardian وفحوص الأنواع وLint والبناء والميزانيات والتباين و448 حزمة ناجحة عبر التشغيل وإعادة الفاشل. فحوص المتصفح الحديثة محدودة بالرئيسية AR/EN390/1280، وليست قبول iPhone أو تسجيل دخول أو تشغيل كامل لمشهد005. إيصالات الإنتاج النهائية تُضاف من رصدها فقط، والتكملة الموسعة تحت [009](../009-archived-system-completion/spec.md).

## Phase 1 — Setup / Foundation

- [x] T001 اقرأ القواعد والعقد واحفظ 004 عند الالتزام المحلي 03c3fc25 دون دمج/نشر، وثبت النطاق في `specs/005-twin-reference-motion/spec.md`.
- [x] T002 استخدم resolver ثم setup-plan و setup-tasks الفعلية لـ Spec Kit v1.3.1؛ أنشئ ملفات `specs/005-twin-reference-motion/`، مع hooks فارغة ودون تعديل AGENTS أو workflow.
- [x] T003 [P] ثبت مرجع `docs/design/reference/industrial-twin-owner-2026-11-23.jpg` وبصمته، وسجل ملف Figma الفعلي وأربعة إطارات قابلة للتحرير وحدود الأدوات في `specs/005-twin-reference-motion/plan.md`.

## Phase 2 — US1: الواجهة المرجعية (P1)

**Independent test**: أربع مناطق معتمدة وخمسة أقسام وحالة محلية واضحة؛ لا اتصال أو بيانات حية مزعومة.

- [x] T004 [US1] أنجز النموذج والمكوّن في `src/components/twin/executive/executive-twin-model.ts` و`TwinExecutiveExperience.tsx`، والتوكنات في `src/styles/twin-executive.css`؛ أرقام مرجعية وخمس وظائف وشمال زخرفي.
- [x] T005 [US1] اجتز الاختبارات المركزة في `src/components/twin/executive/executive-twin-model.test.ts` و`TwinExecutiveExperience.test.tsx`: 6 ناجحة تشمل AR/EN و axe والمناطق/الأقسام والطبقات/التفاصيل وعدم fetch والفك/التركيز؛ لا تساوي فحص متصفح كامل.
- [x] T006 [US1] ادمج التجربة في `src/routes/_authenticated/sec.twin.tsx` ورابط `src/components/home/HomeTwinSection.tsx` دون تغيير 004 أو الأصول الأصلية؛ دمج الكود موجود، وقبول المتصفح ضمن T007.
- [x] T007 [US1] تحقق من اللغتين والوضعين والمقاسات الخمسة و 44 بكسل واللمس/لوحة المفاتيح والتفاصيل/تقليل الحركة، وسجل النتيجة وحدودها في `specs/005-twin-reference-motion/contracts/media-ui.md` دون ادعاء iPhone فعلي من محاكاة. Chromium 5/5 و 20 حالة عرض ثم 13 فحص هندسة ناجحة؛ لا iPhone/Safari فعلي أو دخول مثبت.

## Phase 3 — US2: الملصق والفيلم اليدوي (P1)

**Independent test**: أصل نهائي معلوم، لا طلب قبل play، وفيلم واحد عند الفتح/التبديل/الإغلاق.

- [x] T008 [US2] اكتمل إطار imagegen الواحد المحفوظ في `docs/design/reference/refinery-generated-first-frame-2026-11-23.png` ونسختا WebP في `public/media/refinery/scene-manifest.json`، بالبصمات والأبعاد الفعلية؛ لا job فيديو Higgsfield/HeyGen.
- [x] T009 [US2] اكتمل ملف 15 ثانية في `public/media/refinery/refinery-illustrative.mp4` و`refinery-poster.webp`؛ 627,455 و 34,434 بايت، decode/faststart PASS، و MP4 إلى النهاية في Chromium. البصمات في `specs/005-twin-reference-motion/plan.md`؛ تصيير Python photo-motion محلي وصوت رياضي، لا ادعاء استماع بشري.
- [x] T010 [US2] تحقق من `renderBroadcast` والمنسق القائم في `src/components/twin/executive/TwinExecutiveExperience.tsx`: لا source/طلب قبل play، إفصاح توضيحي وحصرية الملفات الثلاثة ومعدلات 0.5/1/1 وتنظيف؛ أحدث 89 اختبارًا/8 ملفات و Chromium 5/5 ناجحة. لا نقل ذلك إلى Safari فعلي.

## Phase 4 — US3: الجودة والتسليم الفعلي (P1)

- [x] T011 [US3] اجتز build/aggregate بالسقوف القائمة في `specs/005-twin-reference-motion/plan.md`:JS 9,977,118/10,538,188.8، 694 ملفًا/53,948,210 بايت. وفرت PDF 573,154 بايت JS/إجماليًا؛ لا تعديل caps/deps/lock/config أو تطبيق 10.065.
- [x] T012 [US3] اجتز البوابة المحلية الكاملة EXIT 0 في `/tmp/sadeed-reference-full-check-final.log`:448 ملفًا، 8506 ناجحًا+30 متخطى=8536 خلال 530.20s؛ types/lint0/32؛ build/budgets/accepted contrast floors؛ 3,568 secrets نظيفة و audit 12 دون high/critical. راجع حارس المصدر PDF 8/8 وحالة السطرين/7 assertions؛ هذا لا يمنح تصريح push أو إصدار أو WCAG AA شامل.
- [x] T013 [US3] حُسم سؤال الدورة القديم بموافقة المالك اللاحقة لست محاولات للدورة نفسها في سجل006؛ حُفظ الاحتياطي، وأصبح طلب الأربع القديم تاريخيًا. تصريح QA والتحقق المحلي والإذن المباشر دونCI موثقة في [تحقق2026-11-24](../006-cinematic-voice-activation/verification-2026-11-24.md)، دون تغيير حماية/workflow أو ادعاء رصيد دورة جديدة.
- [x] T014 [US3] سُجل التسليم الفعلي539cc26 إلى `dpl_4hNC94YrXEDAnBQuynEw2pqjFbs1` READY/مُرقّى؛ النطاقان والهوية وصفحات التحقق200 والأصول وAR/EN390/1280 مثبتة في [إيصال الإنتاج](../006-cinematic-voice-activation/verification-2026-11-24.md#observed-production-receipt). خط الأساس السابق كان03ff/dpl_9nwbCuVbRBoNr27NF1WEezkrEVrW؛ لا تراجع نُفذ أو قبول حساب/iPhone/كل004 يُدّعى. النشر المباشر باستثناءCI الحالي، لا ادعاء نجاح بوابات بعيدة لم تُشغّل.

- [x] T015 [US3] وحّد PDF النصي لـ live-dashboard فقط على pdf-lib القائمة عبر `src/lib/executive/live-dashboard-pdf.ts` و adapter المسار؛ اختبار `live-dashboard-pdf.test.ts` بمحلل PDF مستقل 8/8 يحفظ الإنجليزية/الحقول/null≠0 وآخر 40/A4 أفقي/الصفحات/الاسم، ومراجعة السطرين 7 assertions. البناء النهائي وفر 573,154 بايت ضمن السقف، بلا caps/deps/config.

## Dependencies / Strategy

T001–T006 موثقة الآن. الملصق/الفيلم والتحقق T007–T010 متوازيان بملكية مستقلة؛ T015 يسبق إغلاق T011–T014؛ الميزانية والحارس يسبقان الجاهزية والتسليم. المحاولة الموقوفة 143 تاريخية؛ المجموعة الكاملة الحالية اجتازت بعد تجميد PDF، بلا تعديل اختبارات لإخفاء البيئة. WebKit التطبيق توقف:hook FAIL قبل DCL، صفر app assertions و 4 not run؛ السبب UNKNOWN، و outer exit 0 ليس PASS. لا إعادة محاولة أو إغلاق دخول/iPhone أو الدورة/الإصدار. root يملك الأصول والدمج/الإصدار، و demo_model المكوّن، ووكيل الوثائق 005 فقط. لا إدخال نطاق قدرات مؤسسية أو إجراءات أمنية جديدة.
