# Tasks: مسودات سير عمل معطلة من طلب مقيد

**Input**: [spec.md](spec.md)، [plan.md](plan.md).

**Status**: تقييم مكتمل؛ تنفيذ الحفظ BLOCKED لغياب SQL INSERT عن المسار المأذون. لا endpoint أو زر حفظ جديد، ولا ميزة مكتملة.

## Phase 1 — نطاق مستقل ومصادر الحقيقة

- [x] T001 ثبت الفرع والأساس `edeb1750` ونطاق worktree008 في `specs/008-disabled-workflow-drafts/plan.md`، مع حفظ عمل 006/007.
- [x] T002 استخدم resolver وsetup-plan وsetup-tasks القائمين دون تعديل مؤشر feature المشترك؛ ثبت `hooks: {}` في `specs/008-disabled-workflow-drafts/plan.md`.
- [x] T003 افحص مسار `/workflows` وschema والمحرك و`sql.read` وعضويات الجهات وصلاحيات caller، وثقها في `specs/008-disabled-workflow-drafts/plan.md` دون قراءات أعمال أو تنفيذ.

## Phase 2 — بوابة الجدوى

- [x] T004 ثبت receipt metadata `/tmp/sadeed-feature11-schema-audit.json` وتاريخه وحدوده في `specs/008-disabled-workflow-drafts/plan.md`: table INSERT=false وجميع column INSERT=false للدور authenticated؛ لا كتابة أو إثبات RLS سلوكي.
- [x] T005 افصل default enabled=true وخطر API القديم عن إمكانية الحفظ الحالية في `specs/008-disabled-workflow-drafts/plan.md`؛ لا استخدام أو تعديل `createWorkflow`.
- [x] T006 وثق القالب المقيد ومراجعة الجهة وحدود idempotency وخطة الإقرار في `specs/008-disabled-workflow-drafts/plan.md`، دون الادعاء بوجود تنفيذ أو اعتماد تشغيلي.
- [x] T007 طبق قرار عدم تجاوز الصلاحيات في `specs/008-disabled-workflow-drafts/spec.md`: لا GRANT/RLS/service-role bypass، ولا API أو Save ميت.

## Phase 3 — US1/US2: مؤجلتان، لا تنفيذ في هذه الدفعة

- [ ] T008 [US1] بعد معالجة ACL بتفويض مستقل، أنشئ `src/lib/exec/workflow-draft-template.ts` للقالب الحتمي AR/EN المحدود، مع رفض طلب التصريح/الأصل الحرج/إنشاء المهمة صراحة.
- [ ] T009 [US2] بعد T008 وصلاحية كتابة مأذونة، أنشئ `src/lib/exec/workflow-drafts.functions.ts` بفرض disabled/null-topic/version1 وexact org/current membership/caller RLS، وINSERT+readback مطابق دون update أو تشغيل.
- [ ] T010 [US1] [US2] بعد T009، أنشئ `src/components/exec/WorkflowDraftComposer.tsx` وglue محدود في `src/routes/_authenticated/workflows.tsx` لمعاينة واختيار جهة فارغ مبدئيًا وحفظ يدوي وإقرار حقيقي؛ لا activation أو Run من النموذج.
- [ ] T011 [US2] عند تفويض تحقق مستقل مناسب، أثبت حفظ المسودة وإقرارها وعدم تشغيلها ضمن بيئة مأذونة. لا business write أو اختبار أو CI في هذه الدفعة الحالية، ولا تُغلق القصة بنتيجة مصدر فقط.

## Phase 4 — تسليم التقييم

- [x] T012 نسق وثائق `specs/008-disabled-workflow-drafts/` وافحص whitespace وdiff دون اختبارات أو build؛ سجل النتائج الفعلية في `plan.md`.
- [x] T013 راجع اتساق الوثائق مع الدليل القرائي وحدود التفويض، ثم أرسل handoff بالحفظ غير المتاح والملفات الثلاثة فقط؛ لا ادعاء نشر أو نجاح ميزة11.

## Dependencies and Execution

T001–T007 توثق الجدوى الحالية. T008–T011 محجوبة، ولا تُشغل بالتوازي أو ضمن هذه الدفعة. لا مهام تغيير ACL أو تعديل API القديم. T012–T013 توثيق فقط ويمكن مراجعتهما مستقلًا عن أعمال 006/007. لا اختبارات جديدة أو تشغيل Unit/Integration/E2E/CI/load/eval اختياريًا؛ البوابات الفعلية القائمة لا تتغير.
