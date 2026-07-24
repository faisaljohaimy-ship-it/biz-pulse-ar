# NEXIOS FINN Shell

طبقة قدرات **استشارية** فوق النواة: كتالوج واحد (12 مهارة + 5 وكلاء)، محرّك اختيار حتمي، تتبّع، تكيّف مقيّد، مُشغّل تقييم، وحارس حدود.

## المعمار (فصل صريح)
- `registry/` — الكتالوج (**مصدر وحيد**: `capabilities.ts`) + محرّك الاختيار والفهرسة/التحقق.
- `evals/` — 30 حالة (`cases.ts`) + `runner.ts` (دقة/هلوسة/التزام بالبوابات).
- `telemetry/` — بناء صفوف `shell_runs` (موسومة `is_simulation=true`) عبر حارس الحدود.
- `adapt/` — تكيّف مقيّد على `topK`/`confidenceThreshold`/`maxTokens` داخل الحدود؛ أي تغيير بنيوي **اقتراح فقط**؛ التراجع التلقائي عند تدهور التقييم.
- `shell.ts` — حارس الحدود: القشرة تكتب في `shell_*` فقط، وأي كتابة نواة **ترمي استثناء**.
- `index.ts` — السطح العام الوحيد (نقطة دخول knip).

## الثوابت
- **لا كتابة على النواة** — `assertShellWrite` يرمي على أي جدول ليس `shell_*`.
- **الأدوات معطّلة** (`toolCallsEnabled=false`) حتى يوجد موصّل منفّذ ومُختبَر — كل شيء استشاري.
- **عزل المؤسسات**: `shell_runs` يحمل `org_id` وRLS عبر `is_org_member`؛ الكتابات الإدارية عبر `has_role(admin)`.
- **مصدر مهارات واحد** — تُعرَّف هنا فقط، لا تُكرَّر في `.claude/skills`.

## التراجع
- تعطيل فوري: `SHELL_CONFIG.safety.toolCallsEnabled=false` (افتراضي) و`adaptation.enabled=false`.
- إعادة المعاملات: `update shell_params set value_num=default_num, last_changed_by='human', changed_at=now();`
- إزالة كاملة: `git revert <sha>` (الكود) ثم `drop table if exists public.eval_results, shell_proposals, shell_params, shell_runs, shell_capabilities cascade;`
- **جداول النواة لا تتأثر** — القشرة لم تكتب فيها إطلاقًا.

## الهجرة
`supabase/migrations/20260724120000_finn_shell.sql` — **مكتوبة فقط**؛ تُطبَّق عبر خط النشر لا يدويًا. ممنوع `supabase db push`/`db reset`.
