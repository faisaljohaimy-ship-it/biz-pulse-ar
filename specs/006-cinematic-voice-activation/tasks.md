# Tasks: الفيلم الناطق وحركة الشاشات

**Input**: [spec.md](spec.md)، [plan.md](plan.md)، [source-inventory.md](source-inventory.md).

**Status**: اكتمل إنتاج الوسائط وربطها في المصدر، واجتازت فحوص الأنواع و Lint والبناء والميزانية محليًا. لم تُتحقق المراجعة السمعية أو التشغيل الكامل، ولم يحدث نشر جديد. سؤال دورة النشر الأربع لم يُجب.

## Phase 1 — المصادر وحدود القبول

- [x] T001 ثبت الفرع والأساس ac4 وأولوية التعليمات المباشرة في `specs/006-cinematic-voice-activation/spec.md`، مع حفظ 004/005.
- [x] T002 استخدم resolver و setup-plan و setup-tasks الفعلية من Spec Kit 1.3.1؛ hooks فارغة. لا مهام Unit/Integration/E2E/load/eval/CI يدوي أو smoke harness اختيارية في `specs/006-cinematic-voice-activation/`.
- [x] T003 [P] وثق أعضاء ZIP الثلاثة والأصل 1320×720 والنصين المباشرين وبصماتها في `specs/006-cinematic-voice-activation/source-inventory.md`؛ لا VO/storyboard داخل ZIP.
- [x] T004 [P] وثق دعوتي التوليد ورصيد 150 قبل/بعد وغياب model/charge receipt في `media-production/sadeed-identity-20261123/narration-provenance.json`؛ لا ادعاء free أو تغيير مزود المساعد.

## Phase 2 — US1: WhySadeed أولًا

- [x] T005 [US1] أنتج ملفي `public/media/identity/sadeed-identity-ar.mp4` و`-en.mp4` بصوت AAC واحد لكل لغة، مع FLAC/provenance والبصمات في `media-production/sadeed-identity-20261123/`.
- [x] T006 [US1] قس المشاهد الستة للغتين من VO 71.381179/69.554717 s، وقدّم VTT من alignment المطابق للنص في `media-production/sadeed-identity-20261123/scenes-ar.json` و`scenes-en.json`؛ المطابقة السمعية غير متحققة.
- [x] T007 [US1] اربط `src/components/home/IdentityFilmHero.tsx` و`identity-film-model.ts` بالمشغل والمنسق القائمين: لغة واحدة، play يدوي، 1×، وتبديل إلى بداية المشهد المكافئ بعد إيقاف القديم. هذا تنفيذ مصدر، لا ملاحظة runtime.
- [ ] T008 [US1] سجل الملاحظات التشغيلية الخفيفة للصوت واللغة و VTT والمشهد في `specs/006-cinematic-voice-activation/source-inventory.md` دون harness. المتاح decode/faststart/loudness و contact sheets؛ لا استماع أو نطق أو تشغيل كامل مثبت.

## Phase 3 — US2: غرفة التحكم ثانيًا

- [x] T009 [US2] ادمج `src/components/home/CommandRoomScreens.tsx` و`src/styles/home/command-room-screens.css` بعد الفيلم على الأصل 1320×720، بحركة 24 ثانية داخل أقنعة الشاشات فقط ومشتقي 640/1320 Q66؛ لا تغيير للمحيط أو الأشخاص.
- [ ] T010 [US2] سجل ملاحظات حدود الأقنعة وحالات reduced/offscreen/hidden والمقاسات واللغتين والوضعين في `specs/006-cinematic-voice-activation/source-inventory.md`؛ المصدر منفذ، والملاحظة التشغيلية غير منفذة، ولا E2E/load اختياري.

## Phase 4 — US3: الجرد والبوابات والتسليم

- [x] T011 [US3] حدث جرد 12 ميزة في `specs/006-cinematic-voice-activation/source-inventory.md`؛ 1/3 جزئيتان، 4 موصول، و 12 BLOCKED بلا QR ميت أو تفعيل حي مختلق.
- [x] T012 [US3] سجل TypeScript/Lint/build/budget PASS المحلية الفعلية في `specs/006-cinematic-voice-activation/plan.md`؛ لا اختبارات اختيارية أو CI يدوي. الوظائف الأربع البعيدة محفوظة، و assertions بأربعة ملفات قائمة معدلة للبوابة التلقائية فقط؛ لا نتيجة بعيدة لهذه النسخة بعد.
- [ ] T013 [US3] ثبت Source QA وتصريح الحارس والدورة المعتمدة والهدف السليم والبوابات البعيدة الفعلية في `specs/006-cinematic-voice-activation/plan.md`؛ المراجعة قرائية جارية، وسؤال 4 محاولات بلا جواب، ولا publish clearance.
- [ ] T014 [US3] سجل الالتزام و PR والـ SHA والأثر والرابط والتحقق والتعافي الفعلي في التقرير المستقل، وفق `specs/006-cinematic-voice-activation/plan.md`؛ لا إيصالات متوقعة أو ادعاء نشر 006.
- [x] T015 [US3] سجل شريحة 1+4 وتصحيح presence المحدود في `specs/006-cinematic-voice-activation/source-inventory.md`: مسودة editable/no-autosend، وسياق route آمن، و controlled React/locale، وحد 2048، و delta=null دون baseline، و missing/error=null مقابل 0؛ لا auth/spend/provider/DB/flag changes.

## Dependencies and Strategy

الفيلم أولًا ثم حركة الشاشات. الجرد لا ينشئ 12 تنفيذًا. T008/T010 ملاحظات خفيفة غير منفذة، وليستا حزم اختبارات اختيارية. لا يغلق T013/T014 بنتائج ac4 أو metadata أصول؛ الدورة والحارس والإيصالات تحتاج دليلًا فعليًا. root يملك التطبيق والإصدار، وهذه الملكية لوثائق 006 والتقرير فقط.
