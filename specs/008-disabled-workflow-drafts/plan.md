# Implementation Plan: مسودات سير عمل معطلة من طلب مقيد

**Branch**: `feature/sadeed-disabled-workflow-drafts-20261123` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Base**: `edeb1750c6eef5bf1409f064ae500eb30c1d78b4`، في worktree مستقل `sadeed-workflow-drafts`.

## Summary

**القرار: BLOCKED للحفظ؛ مواصفات وتقييم فقط في هذه الدفعة.** يوجد قالب قراءة تشخيصي يمكن بناؤه فوق المحرك القائم دون schema جديد، لكن SQL ACL الفعلي يمنع مستخدم التطبيق من INSERT على `public.workflows`. لا endpoint جديد أو واجهة حفظ أو صف أعمال أو تعديل صلاحيات. تبقى الميزة 11 جزئية وغير مكتملة.

تأكيد metadata قرائي أرسله وكيل `security_evidence` ثم روجع محليًا: `/tmp/sadeed-feature11-schema-audit.json`، بتاريخ **2026-11-23 05:38:56 UTC**. هذا ملف محلي مؤقت لا يُرفع مع المواصفات. يثبت `effective_privilege_metadata.effective_table_privileges` أن `authenticated/workflows/INSERT=false`، وتثبت `column_insert_privileges` أن INSERT غير متاح على الأعمدة الاثني عشر جميعًا. SELECT=true لا يعني أن RLS يسمح بقراءة كل سجل. لم يُقرأ business row أو تُجرب كتابة أو انتحال دور؛ catalog ليس إثبات RLS سلوكيًا.

## Technical Context

TypeScript/React/TanStack Start مع Supabase Auth وPostgreSQL قائمين. لا تبعيات أو محرك أو جدول أو أعمدة أو migration جديدة. النطاق المقترح قالب واحد وطلب لا يتجاوز160 حرفًا وحد قراءة صحيح 1–50. لا معيار سرعة أو سعة مقيس في هذه الدفعة، ولا ادعاء نجاح حفظ.

تعليمات المالك تمنع الفحوص الاختيارية؛ اقتصر هذا التقييم على المصدر وmetadata، ولم تُجرَ كتابة أعمال أو تغيير صلاحيات بسبب عائق ACL. روجع تنسيق الوثائق وdiff؛ لا تشغيل TypeScript أو Vitest أو build لمجرد تغيير هذه المواصفات.

## Constitution Check

المواد **6–8** تحفظ مصدر البيانات والعزل والأسرار والبوابة البشرية؛ **14–15** تضبط الحالات المحدودة واللغة والوصول عند التنفيذ المستقبلي؛ **21 و27** تمنعان تسمية الخطة حفظًا أو الحالة غير المقيسة نجاحًا؛ **31 و35** تفرضان مراجعة المسارات المشتركة وحفظ عمل الكاتب الآخر. توقف التنفيذ عند ACL بدل تجاوزه؛ لا تعديل للدستور أو SQL أو RLS أو دور خدمة.

الـgrant تغيير أمني/بياني مستقل خارج التفويض الحالي، ولا يُطلب أو يطبّق آليًا. لا استبدال caller-scoped client بـservice role. وجود سياسة RLS تسمح مشروطًا لا يمنح امتياز جدول مفقودًا.

## Phase 0 — Findings and Reuse

| العقد القائم       | الدليل في المصدر                                                                                                            | النتيجة وحدودها                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| هوية المستخدم      | `src/integrations/supabase/auth-middleware.ts`، `requireSupabaseAuth`                                                       | عميل caller-scoped مع sub متحقق؛ لا تعديل للمصادقة.                                                                                       |
| قائمة الجهات       | `src/lib/org/org.functions.ts`، `listMyOrgs`                                                                                | عضويات caller عبر `user_id`؛ مناسبة لقائمة اختيار فارغة مبدئيًا. لا استخدام `switchOrg` أو `getCurrentOrg` لتحديد الجهة بدل المستخدم.     |
| أدوار الجهات       | `src/lib/org/org-middleware.ts` ومخطط `org_role`                                                                            | المستقبل يعيد التحقق من العضوية المحددة ودور operator/manager/admin/owner؛ viewer لا يكتب. لا fallback لأول عضوية.                        |
| صلاحية سير العمل   | migration `20260803192709_7a2af196-4364-4754-9974-17e10daeb548.sql` مع receipt أعلاه                                        | RLS يتطلب platform admin وعضوية الجهة المناسبة؛ ACL الفعلي يمنع INSERT قبل إمكان نجاح المسار. لا تحقق سلوكي حي.                           |
| تخزين المسودة      | `src/integrations/supabase/types.ts` وجدول `workflows` في receipt                                                           | UUID primary key، وحقول definition/org/owner/tags/version/trigger متاحة؛ default enabled=true خطر إذا مُنح INSERT مستقبلًا دون فرض false. |
| API الإنشاء القديم | `src/lib/exec.functions.ts`، `createWorkflow`                                                                               | يستخدم caller INSERT، فلا يستطيع الحفظ مع ACL الحالي. لا يفرض enabled=false أو org صريحًا؛ لا يُستعمل للمسودة ولا يُعدّل في هذه الدفعة.   |
| تعريف وتنفيذ السير | `src/lib/exec/workflow-engine.server.ts`                                                                                    | `WorkflowDefinitionSchema` قائم؛ `loadDef` يرفض disabled. ليس نظام اعتماد لتفعيل المسودة.                                                 |
| قالب القراءة       | `src/lib/exec/tool-registry.server.ts`، `sql.read`                                                                          | `sec_assets` وstatus/last_seen_at مدعومان مع org scope مستقل؛ لا SQL حر أو إنشاء مهمة. وجود المنفذ ليس إثبات تشغيله في هذا التقييم.       |
| المستهلكون         | `src/lib/runtime/consume-events.server.ts`، `src/lib/exec.functions.ts`، `src/routes/api/public/hooks/runtime-bootstrap.ts` | مسارات التوزيع الجماعي تنتقي enabled=true؛ لا يُستدعى أي منها للحفظ.                                                                      |
| واجهة العرض        | `src/routes/_authenticated/workflows.tsx` و`src/lib/runtime/useLiveRows.ts`                                                 | جدول تعريفات قائم وrefetch قابل لإعادة الاستخدام؛ لا واجهة إنشاء جديدة حاليًا في هذه الشريحة.                                             |

**بدائل مرفوضة**: استدعاء `createWorkflow` القديم؛ منح SQL تلقائي؛ استخدام service role؛ حفظ JSON حر؛ معاينة نصية تدعي أن ميزة الحفظ اكتملت. جميعها إما تتجاوز الحدود أو لا تحقق النتيجة المطلوبة.

## Phase 1 — Deferred Contract Outline (not implemented)

### Intent and preview

ملف مقترح `src/lib/exec/workflow-draft-template.ts`: parser حتمي كامل العبارة بالعربية والإنجليزية بعد تطبيع محدود. يقبل فقط نية «مسودة تشخيص الأصول غير المتصلة»/`offline asset diagnostic draft`، مع limit صحيح1–50 وstatus ثابت `offline`. يرفض طلب انتهاء التصريح/الأصل الحرج/إنشاء المهمة صراحة. لا استخدام LLM أو fallback تخميني أو JSON يقدمه المستخدم.

المعاينة تعرض الجهة المختارة وخطوة القراءة ومعلماتها وحالة التعطيل؛ لا تُجلب أصول فعلية ولا تظهر أعداد أو نتائج تشخيص.

### Canonical definition

هذا مخطط عقد مؤجل، لا تعريف محفوظ أو منفذ:

```json
{
  "start": "read_offline_assets",
  "steps": [
    {
      "id": "read_offline_assets",
      "kind": "tool",
      "toolId": "sql.read",
      "input": {
        "table": "sec_assets",
        "columns": ["id", "code", "name_ar", "name_en", "health", "status", "last_seen_at"],
        "filters": { "status": "offline" },
        "order_by": { "column": "last_seen_at", "ascending": true },
        "limit": 20,
        "count_only": false
      }
    }
  ]
}
```

20 هنا مثال لمعلمة يراجعها المستخدم، وليس مقياس أعمال. يثبت الخادم بقية التعريف، ويتحقق عبر schema المحرك وschema مدخل الأداة دون استدعاء المنفذ. لا next أو trigger أو producer أو approval step أو action إضافي.

### Future save boundary

ملف مقترح `src/lib/exec/workflow-drafts.functions.ts` مستقل عن API القديم. مدخل صارم فقط: `{draftId: UUID, orgId: UUID, request: string <=160, limit: integer 1..50}`. لا مدخل enabled أو topic أو owner أو definition أو toolId. يعيد الخادم بناء التعريف من القالب ويطابقه مع intent.

يعيد handler التحقق من exact selected org/current user membership ومن الدور وplatform admin، ثم يستخدم caller RLS وحده. الصف المفروض: `id=draftId`، `org_id=orgId`، `owner_id=context.userId`، `enabled=false`، `trigger_topic=null`، `version=1`، واسم/وصف/tags ثابتة من القالب؛ لا default org أو enabled من القاعدة.

INSERT فقط، بلا upsert أو update. عند تضارب UUID، تُقرأ فقط هوية السجل مع org+owner تحت caller RLS، ويُلزم التطابق البنيوي الدقيق للتعريف والحقول الثابتة وحالة التعطيل قبل الإقرار. لا تجاهل للحقول الزائدة في المقارنة. يفشل الطلب عند اختلاف أي حقل أو حجب القراءة. UUID المستقر يحمي نفس الطلب فقط؛ لا منع لتكرار معنوي بمعرف جديد ولا ادعاء exactly-once.

بعد نجاح الإدراج أيضًا يلزم readback مطابق؛ إقرار يحتوي الهوية والجهة والحالة والنسخة وcreated_at وبيان إعادة الطلب، دون نتائج أصول أو ادعاء اعتماد. خطأ readback قد يلي كتابة ناجحة، لذلك تُحتفظ هوية الطلب عند إعادة المحاولة البشرية. يسجل audit القائم الحدث المحدود دون نشره على bus؛ صحة audit نفسها لا تُفترض ولا تُختلق.

### Future UI boundary

ملف مقترح `src/components/exec/WorkflowDraftComposer.tsx` مع glue محدود في `src/routes/_authenticated/workflows.tsx`. يعيد استخدام `listMyOrgs` وقائمة caller؛ اختيار الجهة فارغ مبدئيًا، ونموذج AR/EN باتجاه صحيح ومراجعة بشرية لمعلمات القالب. الحفظ يدوي بعد معاينة، دون autosend أو retry تلقائي أو Run/Activate. تتغير هوية الطلب عند تغيير المعلمات، وتبقى ثابتة عند إعادة محاولة نفس الطلب؛ لا receipt عابر بين المستخدمين. يُعاد جلب التعريفات بعد الإقرار الحقيقي.

**هذه الملفات غير منشأة، ولا UI/API جديد في هذه الدفعة.** إعادة فتح التنفيذ تستلزم أولًا تفويضًا مستقلًا لمعالجة ACL وإثبات امتياز صالح ضمن حدود RLS؛ لا تتضمن هذه الخطة تعديل GRANT أو تعليمات تشغيله.

## Project Structure and Spec Kit Evidence

التغيير المحفوظ محصور في `specs/008-disabled-workflow-drafts/{spec.md,plan.md,tasks.md}`. لا تعديل source أو tests أو lock/config أو specs006/007. اختيرت وثائق خفيفة بدل توليد artifacts تنفيذ يوحي بأن بوابة الجدوى اجتازت.

استُخدم resolver الفعلي `resolve-template.sh spec-template --json` ثم `setup-plan.sh --json` و`setup-tasks.sh --json` مع `SPECIFY_FEATURE_DIRECTORY=specs/008-disabled-workflow-drafts` و`SPECIFY_FEATURE_NO_PERSIST=1`. يمنع هذا تغيير مؤشر feature المشترك خارج ملكية هذه المهمة. `hooks: {}` في `.specify/extensions.yml`. استُخدمت منهجية ومخططات Spec Kit؛ لم يُدّع تشغيل CLI أو تنفيذ feature. قد يعرض setup معرف المجلد بوصفه BRANCH؛ اسم Git الفعلي مثبت أعلى الوثيقة.

## Acceptance / Handoff

- اكتمل فحص المصدر والعقد وmetadata المتاح، وأُثبت عائق SQL ACL.
- يقتصر الفرق على وثائق الجدوى. نجح `prettier --check` للملفات الثلاثة، ونجح فحص whitespace/placeholders المحلي لها، و`git diff --check` دون ملاحظات. نجح `git diff --exit-code -- src .specify package.json package-lock.json`؛ لا فحص runtime ضمن هذه النتائج.
- لم يُشغّل اختبار أو CI أو build؛ لم تُنشأ صفوف أو API أو صلاحيات أو مزود أو رسالة خارجية.
- لا PR/merge/deployment/رابط جديد لهذه الشريحة. ميزة الحفظ غير مسلمة، والقرار الحالي عدم تنفيذها في هذه الدفعة.
