-- ════════════════════════════════════════════════════════════════════════
-- P0-3 — دورةُ حياةٍ كاملة للاعتماد المعلَّق
-- ════════════════════════════════════════════════════════════════════════
--
-- ## العلّة المقيسة
--
-- ثلاثة تنفيذات في `pending_approval` منذ ٢٠٢٦/٠٧/٠٧، وستّة مقترحات
-- معلَّقة — **لا يُخرجها من التعليق شيء**.
--
-- ## الجذر
--
-- `reapStaleExecutions` يحصد `status = 'running'` وحده. فالمعلَّق للاعتماد
-- ليس له حاصد ولا مهلة: يبقى معلَّقًا إلى الأبد ما لم يقرّر فيه بشر.
-- والقيد نفسه لا يعرف حالةَ انتهاءٍ أصلًا:
--
--   CHECK (status IN ('queued','running','succeeded','failed',
--                     'rolled_back','pending_approval','rejected','cancelled'))
--
-- فلا `expired` ولا `superseded`. والحالةُ التي لا يسمّيها المخطّط لا
-- يمكن أن تقع، فيُترك المعلَّق معلَّقًا لأن لا اسم لانتهائه.
--
-- ## ما يفعله هذا الترحيل
--
-- يوسّع القيد بحالتين، **ولا يغيّر صفًّا واحدًا**. النقل إلى `expired`
-- فعلٌ مُصرَّحٌ به يقع من الشيفرة (`expireStaleApprovals`) بأثرٍ مكتوب
-- وفاعلٍ مسمًّى — لا أثرًا جانبيًّا لترحيل.
--
-- **ولا اعتمادَ تلقائيّ بحال.** المهلة تُنهي الانتظار ولا تنفّذ شيئًا:
-- «expired» ليست «approved»، والفرق بينهما هو كلّ الأمن في هذا الباب.
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  con_name text;
begin
  if to_regclass('public.tool_executions') is null then
    raise notice 'tool_executions غير موجود — لا شيء يُوسَّع.';
    return;
  end if;

  -- اسم القيد يُقرأ من الكتالوج لا يُفترض: التسمية التلقائية تختلف بين
  -- بيئةٍ أُنشئت بالترحيل وأخرى أُنشئت بأداة.
  select c.conname
    into con_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname = 'tool_executions'
     and c.contype = 'c'
     and pg_get_constraintdef(c.oid) ilike '%pending_approval%'
   limit 1;

  if con_name is null then
    raise notice 'لا قيد حالةٍ على tool_executions — يُضاف.';
  else
    execute format('alter table public.tool_executions drop constraint %I', con_name);
  end if;

  alter table public.tool_executions
    add constraint tool_executions_status_check
    check (status in (
      'queued','running','succeeded','failed','rolled_back',
      'pending_approval','rejected','cancelled',
      -- انقضت المهلة دون قرار بشريّ. **ليست اعتمادًا.**
      'expired',
      -- حلّ محلّه طلبٌ أحدث لنفس الفعل.
      'superseded'
    ));
end $$;

do $$
begin
  if to_regclass('public.tool_executions') is not null then
    comment on column public.tool_executions.status is
      'دورة الاعتماد: pending_approval ⇒ (approved⇒queued | rejected | expired | cancelled | superseded). '
      'expired تُنهي الانتظار ولا تنفّذ — لا اعتماد تلقائيّ بحال.';
  end if;
end $$;

-- ── الحالة نفسها على المقترحات ───────────────────────────────────────────
do $$
declare
  con_name text;
begin
  if to_regclass('public.agent_approval_proposals') is null then
    return;
  end if;

  select c.conname
    into con_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname = 'agent_approval_proposals'
     and c.contype = 'c'
     -- يُطابَق على اسم العمود لا على قيمةٍ فيه: `'%pending%'` يلتقط أي
     -- قيدٍ يذكر الكلمة ولو لم يكن قيد الحالة.
     and pg_get_constraintdef(c.oid) ilike '%status%'
   limit 1;

  if con_name is not null then
    execute format('alter table public.agent_approval_proposals drop constraint %I', con_name);
  end if;

  alter table public.agent_approval_proposals
    add constraint agent_approval_proposals_status_check
    -- **مجموعة فائقة للقديمة نصًّا.** القيد الأصلي
    -- (`20260721160046`:54) هو ('pending','approved','rejected','executed').
    -- وحذفُ `'executed'` يجعل `add constraint` يتحقّق من الصفوف القائمة
    -- فيُجهض الترحيل على أوّل صفٍّ منفَّذ — تضييقٌ في ثوب توسيع.
    check (status in (
      'pending','approved','rejected','executed',
      'expired','cancelled','superseded'
    ));
end $$;

-- ── فهرس المهلة: يُقرأ المعلَّق القديم بلا مسح الجدول ────────────────────
create index if not exists tool_executions_pending_age_idx
  on public.tool_executions (created_at)
  where status = 'pending_approval';
