# Tasks: مسودات سير عمل معطلة من طلب مقيد

**Input**: [spec.md](spec.md)، [plan.md](plan.md).

**Status**: استئناف ٢٠٢٦/١١/٢٤: المعاينة وAPI/واجهة حفظ المسودة المعطلة منفذة، وتغيير الصلاحيات المحدد معتمد ومطبق. التحقق السلوكي الحي للحفظ والعزل لم يُنفذ؛ لا ادعاء اكتمال T011. انظر [متابعة التنفيذ](continuation-2026-11-24.md).

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

- [x] T008 [US1] استئناف المالك ٢٠٢٦/١١/٢٤ فصل المعاينة المحلية الآمنة عن الحفظ المحجوب: أنشئ `src/lib/exec/workflow-draft-template.ts` للقالب الحتمي AR/EN المحدود، مع رفض طلب التصريح/الأصل الحرج/إنشاء المهمة صراحة.
- [x] T009 [US2] بعد T008 واعتماد المالك المحدد للصلاحيات، أنشئ `src/lib/exec/workflow-drafts.functions.ts` بفرض disabled/null-topic/version1 وexact org/current membership/caller RLS، وINSERT+readback مطابق دون update أو تشغيل.
- [x] T010 [US1] [US2] بعد T009، أنشئ `src/components/exec/WorkflowDraftComposer.tsx` وglue محدود في `src/routes/_authenticated/workflows.tsx` لمعاينة واختيار جهة فارغ مبدئيًا وحفظ يدوي وإقرار حقيقي؛ لا activation أو Run من النموذج.
- [ ] T011 [US2] عند تفويض تحقق مستقل مناسب، أثبت حفظ المسودة وإقرارها وعدم تشغيلها ضمن بيئة مأذونة. لا business write أو اختبار أو CI في هذه الدفعة الحالية، ولا تُغلق القصة بنتيجة مصدر فقط.

## Phase 4 — تسليم التقييم

- [x] T012 نسق وثائق `specs/008-disabled-workflow-drafts/` وافحص whitespace وdiff دون اختبارات أو build؛ سجل النتائج الفعلية في `plan.md`.
- [x] T013 راجع اتساق الوثائق مع الدليل القرائي وحدود التفويض، ثم أرسل handoff بالحفظ غير المتاح والملفات الثلاثة فقط؛ لا ادعاء نشر أو نجاح ميزة11.

## Dependencies and Execution

T001–T007 توثق الجدوى الحالية. T008–T011 محجوبة، ولا تُشغل بالتوازي أو ضمن هذه الدفعة. لا مهام تغيير ACL أو تعديل API القديم. T012–T013 توثيق فقط ويمكن مراجعتهما مستقلًا عن أعمال 006/007. لا اختبارات جديدة أو تشغيل Unit/Integration/E2E/CI/load/eval اختياريًا؛ البوابات الفعلية القائمة لا تتغير.

## Continuation — 2026-11-24

- [x] T014 [US1] أضف معاينة محلية AR/EN باختيار جهة فارغ وحد1–50؛ احفظ معطلة بعد مراجعة صريحة عبر caller RLS، مع تصفير الإقرار عند التحرير/تبديل الحساب، دون Run أو استدعاء أداة.
- [x] T015 أعد فحص metadata فقط؛ INSERT ما زال مرفوضًا عند16:07:40Z، ودوّن مقترح SQL قابلًا للعكس خارج migrations دون تطبيق.
- [x] T016 [US2] اعتمد المالك «المسودات المعطلة فقط»؛ طُبق المقترح المحروس نفسه مرة واحدة، وتحقق catalog من الأعمدة والسياسات. مرآة migration بتاريخ20261124162112 محفوظة.
- [ ] T017 [US2] أثبت T011 بحفظ/إقرار وعزل سلوكي فعلي في بيئة اختبار مأذونة؛ لم تُنشأ صفوف إنتاج للاختبار.
- [x] T018 نجح65اختبارًا مركزًا ببيانات fixtures فقط، وESLint وdiff check؛ ليست هذه نتائج حفظ إنتاجي.
