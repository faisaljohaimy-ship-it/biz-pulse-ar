# Tasks: الفيلم الناطق وحركة الشاشات

**Input**: [spec.md](spec.md)، [plan.md](plan.md)، [source-inventory.md](source-inventory.md).

**Historical pre-commit status**: اكتمل إنتاج الوسائط وربطها في المصدر، واجتازت فحوص الأنواع و Lint والبناء والميزانية محليًا. لم تُتحقق المراجعة السمعية أو التشغيل الكامل، ولم يحدث نشر جديد. سؤال دورة النشر الأربع لم يُجب.

**2026-11-24 reconciliation**: السطر السابق لقطة تاريخية؛ سجل التعافي أدناه يتضمن جواب المالك بست محاولات للدورة نفسها. اكتمل تصريح guardian وفحص مصدر539cc26 محليًا، واجتازت448 حزمة عبر التشغيل الأول وإعادة الفاشل تحت صلاحيات البيئة الصحيحة، مع البناء والميزانيات والتباين والمتصفح المحدود؛ التفاصيل والحدود في [سجل التحقق](verification-2026-11-24.md). لا يُغلق T008/T010 أو الدخول/الجهاز أو نتائج AI الحية بهذه الفحوص. الطلب الموسّع لكل عمل النظام المؤرشف يتابع في [009](../009-archived-system-completion/spec.md).

## Current release recovery — 2026-11-23

Resume from [release-recovery.md](release-recovery.md). PR456 exists, but its old head
failed one stale copy assertion and diverged from the later media-only main commit.
The owner now approved six attempts for the same cycle, counting the two existing
artifacts and retaining two emergency attempts. Current merge reconciliation preserves
the newer Arabic MP4/VTT/scene clock and restores the broader archived features.
No release or fresh gate result is claimed before it occurs.

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
- [x] T013 [US3] اكتمل Source QA وتصريح guardian وموافقة الدورة المسجلة بست محاولات وحفظ الاحتياطي؛ النشر المباشر539cc26 مأذون دونCI في الطلب الحالي. [سجل التحقق](verification-2026-11-24.md) يميز نتائج الفحص المحلية من البوابات البعيدة التي لم تُشغّل، ولا يعيد سؤال الأربع القديم.
- [x] T014 [US3] سُجل SHA539cc26 الكامل وأثرProduction `dpl_4hNC94YrXEDAnBQuynEw2pqjFbs1` READY/مُرقّى والتحقق من النطاقين والمسارات والأصول والمتصفح في [إيصال الإنتاج](verification-2026-11-24.md#observed-production-receipt). كان خط الأساس03ff/dpl_9nwbCuVbRBoNr27NF1WEezkrEVrW؛ لا تراجع لعدم الحاجة. لا ادعاءPR/CI جديدين، أو أن هذا الإصدار أغلق الاستماع/iPhone/التكاملات الحية أو تغييرات لاحقة.
- [x] T015 [US3] سجل شريحة 1+4 وتصحيح presence المحدود في `specs/006-cinematic-voice-activation/source-inventory.md`: مسودة editable/no-autosend، وسياق route آمن، و controlled React/locale، وحد 2048، و delta=null دون baseline، و missing/error=null مقابل 0؛ لا auth/spend/provider/DB/flag changes.

## Dependencies and Strategy

الفيلم أولًا ثم حركة الشاشات. الجرد لا ينشئ 12 تنفيذًا. T008/T010 ملاحظات خفيفة غير منفذة، وليستا حزم اختبارات اختيارية. لا يغلق T013/T014 بنتائج ac4 أو metadata أصول؛ الدورة والحارس والإيصالات تحتاج دليلًا فعليًا. root يملك التطبيق والإصدار، وهذه الملكية لوثائق 006 والتقرير فقط.
