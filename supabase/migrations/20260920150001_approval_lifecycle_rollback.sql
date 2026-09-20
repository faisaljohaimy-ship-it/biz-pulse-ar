-- ════════════════════════════════════════════════════════════════════════
-- تراجع P0-3 — يُعيد قيد الحالة إلى ما كان
-- ════════════════════════════════════════════════════════════════════════
--
-- **تحذير مقصود:** التراجع يضيّق القيد، فيفشل إن وُجد صفٌّ واحد في
-- `expired` أو `superseded`. وذلك صحيح ومطلوب: تضييقُ القيد فوق صفوفٍ
-- قائمة إمّا أن يفشل صراحةً أو يُفسد بيانات — والفشل أصدق.
--
-- فإن أُريد التراجع فعلًا، تُنقل تلك الصفوف أوّلًا إلى `cancelled` **بقرارٍ
-- مكتوب** لا بتحديثٍ صامت داخل هذا الملفّ: حالةُ الصفّ سجلٌّ لما جرى، ولا
-- تُعاد كتابتها لتسهيل تراجعٍ إداريّ.
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  stuck int;
begin
  if to_regclass('public.tool_executions') is null then
    return;
  end if;

  select count(*) into stuck
    from public.tool_executions
   where status in ('expired', 'superseded');

  if stuck > 0 then
    raise exception
      'لا يمكن التراجع: % صفًّا في expired/superseded. انقلها بقرارٍ مكتوب أوّلًا.', stuck;
  end if;

  alter table public.tool_executions drop constraint if exists tool_executions_status_check;
  alter table public.tool_executions
    add constraint tool_executions_status_check
    check (status in (
      'queued','running','succeeded','failed','rolled_back',
      'pending_approval','rejected','cancelled'
    ));
end $$;

do $$
declare
  stuck int;
begin
  if to_regclass('public.agent_approval_proposals') is null then
    return;
  end if;

  select count(*) into stuck
    from public.agent_approval_proposals
   where status in ('expired', 'superseded');

  if stuck > 0 then
    raise exception
      'لا يمكن التراجع: % مقترحًا في expired/superseded.', stuck;
  end if;

  alter table public.agent_approval_proposals
    drop constraint if exists agent_approval_proposals_status_check;
end $$;

drop index if exists public.tool_executions_pending_age_idx;
