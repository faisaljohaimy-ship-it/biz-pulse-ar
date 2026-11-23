# Tasks: التوأم المرجعي والفيديو

**Input**: [spec.md](spec.md)، [plan.md](plan.md)، [contract](contracts/media-ui.md).

**Status**: التنفيذ والأصول و Chromium مثبتة. البناء النهائي ناجح، لكن JS budget فاشلة بزيادة 12,083.2 بايت. مقترح السقف ودورة 4 محاولات ينتظران جواب المالك؛ لا push/PR/نشر، و 004 حفظ محلي فقط.

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

- [ ] T011 [US3] احسم تجاوز JS النهائي في `specs/005-twin-reference-motion/plan.md`: ‏10,550,272 مقابل 10,538,188.8 بايت، تجاوز 12,083.2 ونمو 12,268 عن 004. البناء EXIT 0 والميزانية EXIT 1. مقترح 10.065 MiB لم يُعتمد أو يُنفذ؛ لا current PASS أو تعديل سقف مفترض.
- [ ] T012 [US3] أكمل بوابة النسخة الحالية وحارسها وسجل الأدلة في `specs/005-twin-reference-motion/plan.md`: Type/Lint EXIT 0 مع 32 تحذيرًا قائمًا؛ 89/89 في 8 ملفات؛ contrast accepted floors PASS؛ 3,566 أسرار نظيفة؛ audit 12 (3 low/9 moderate/0 high/critical). المهمة جزئية لأن JS FAIL؛ لا all-gates-green أو WCAG AA شامل.
- [ ] T013 [US3] ثبت قرار المالك ومسار الحماية والدورة في `specs/005-twin-reference-motion/plan.md`: سؤال 10.065JS ودورة 4 محاولات أُرسل ولم يُجب؛ تبدأ عند الموافقة فقط. Vercel all-state count 0 عند 03:42 و main03ff؛ الدورات القديمة مغلقة دون مساس. استثناء CI لهذه المهمة فقط؛ لم تُعدل حماية أو workflow.
- [ ] T014 [US3] سجل الالتزام/الوجهة/الأثر/الرابط والتحقق من النطاقين وخط أساس التعافي عند حدوثها فعلًا في التقرير الخارجي، وفق `specs/005-twin-reference-motion/contracts/media-ui.md`. لا push أو PR أو deploy جديد، ولا إغلاق قبل الإيصالات أوادعاء اكتمال 004.

## Dependencies / Strategy

T001–T006 موثقة الآن. الملصق/الفيلم والتحقق T007–T010 متوازيان بملكية مستقلة؛ الميزانية والحارس يسبقان قرار الجاهزية والتسليم. root يملك الأصول والدمج/الإصدار، و demo_model المكوّن، ووكيل الوثائق 005 فقط. لا إدخال نطاق قدرات مؤسسية أو إجراءات أمنية جديدة.
