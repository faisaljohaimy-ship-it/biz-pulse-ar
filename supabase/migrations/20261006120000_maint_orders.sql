-- ═══════════════════════════════════════════════════════════════════════════
-- أوامر عمل الصيانة التصحيحية — من «سجل CM» الحقيقي ومن الواجهة
-- (أمر المالك ٢٠٢٦/١٠/٠٦).
--
-- قرارات المالك: (١) الرقم الوظيفي والاسم للمُنشئ تلقائيًّا ولفنيٍّ مُسنَد من
-- المسجّلين — والمستورد «غير مُسنَد» بلا اسمٍ مختلق؛ (٢) **البيانات الحقيقية
-- خلف الدخول وحده**: لا قراءة للزائر إطلاقًا، والعضو يقرأ كل أوامر مؤسسته؛
-- (٣) الـ١٧٩٥ طلبًا كلها؛ (٤) نسبة إنجاز لكل أمر.
--
-- ## لماذا جدولٌ جديد لا `sec_work_orders`
-- يقرؤه نحو ٢٠ ملفًّا (اللوحة التنفيذية، سَدِيد، البحث…) فيغيّر الاستيراد
-- أرقامها كلها؛ وسياسته `select_own` تحجب عن العضو ما قرّر المالك إظهاره؛
-- وقيوده (fault_type، اعتماد work_order_approver) لنموذجٍ آخر.
--
-- ## ما قِيس على الإنتاج قبل الكتابة (٢٠٢٦/١٠/٠٦)
-- • Postgres 17.6 · مؤسسة واحدة · `org_role` = owner,admin,manager,operator,viewer
--   و`is_org_member` هرمي · كل مسجّل جديد `operator`.
-- • **المنح الافتراضي** على `public` يعطي anon وauthenticated كل شيء (arwdDxtm)
--   — فكل جدولٍ هنا يبدأ بـ`revoke all` ثم منحٍ صريح (درس `staff_accounts`:
--   TRUNCATE كان مسموحًا ولا يمنعه RLS). وكل دالّة SECURITY DEFINER تُنزع من
--   public وanon صراحةً.
-- • `profiles` يقرأ صاحبها وحده، و`staff_accounts` صاحبها أو المسؤول — فأسماء
--   المُنشئ والمُسنَد وأرقامهم تُقرأ عبر view بشرط عضويةٍ صريح داخله
--   (قاعدة العرض المكتسَبة في CLAUDE.md).
--
-- ## نسبة الإنجاز محسوبة لا مخزّنة
-- `maint_stage_pct(stage, status)`: أوزان ثابتة لثماني مراحل، والمُنجز ١٠٠،
-- والملغى NULL. المطابقة مع `src/lib/maintenance/cm-log-rules.ts` يحرسها اختبار.
-- `stage_basis`: «import_evidence» = المرحلة مستنتجة من ملاحظة الفني في الملف
-- (تُعلَن في الواجهة)، و«workflow» = سجّلها فاعلٌ في النظام.
--
-- ## الفاعل المسموح: مقارنةٌ لا تبتلعها NULL
-- `o.assigned_to = auth.uid()` على أمرٍ غير مُسنَد تعطي NULL لا false، و`if not
-- (false or null)` لا يرفع — فمرّ مشغّلٌ غير مُسنَد يقدّم أوامر غيره. قِيس في
-- الحزمة (`maint_orders_check.sql`) قبل التطبيق، فالشرط `is not distinct from`
-- مع `auth.uid() is not null`.
--
-- ## نقض حارس الجودة الثاني (قبل التطبيق)
-- دور التطبيق العامّ (admin/manager) كان يكفي للكتابة في مؤسسةٍ أخرى، والفني
-- المحذوف من المؤسسة بقي يكتب في أمره المُسنَد — كلاهما صار مشروطًا بعضوية
-- مؤسسة الأمر، ولكلٍّ حالةٌ في الحزمة.
--
-- ## الكتابة عبر دوالّ فقط
-- لا سياسة insert/update/delete على الجدولين: كل كتابةٍ دالّة SECURITY DEFINER
-- تتحقق من الفاعل والانتقال وتكتب حدثًا. فلا حقل محجوز يُزوَّر عبر PostgREST.
--
-- idempotent · التراجع: `20261006120001_maint_orders_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

create sequence if not exists public.maint_order_seq;

create table if not exists public.maint_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  ref text not null,
  source text not null default 'app' check (source in ('cm_log', 'app')),
  source_row integer,
  city text,
  site text,
  system text check (system in ('CCTV', 'GATE', 'ACS', 'VISIT')),
  component text,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'on_hold', 'completed', 'cancelled')),
  stage text not null default 'registered' check (stage in (
    'registered', 'assigned', 'on_site', 'diagnosed', 'awaiting_parts', 'repairing', 'testing', 'closed')),
  stage_basis text not null default 'workflow' check (stage_basis in ('import_evidence', 'workflow')),
  hold_reason text check (hold_reason in (
    'approval', 'power', 'site_not_ready', 'access', 'it_support', 'civil_cabling', 'spare_parts', 'troubleshooting')),
  requested_at date,
  due_at date,
  completed_at date,
  sap_wo text,
  po text,
  boq_item text,
  qty numeric,
  service_cost numeric,
  maintenance_cost numeric,
  spares_cost numeric,
  delay_penalty numeric,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  assigned_to uuid references auth.users (id) on delete set null,
  imported_untouched boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maint_orders_ref_key unique (org_id, ref),
  constraint maint_orders_source_row_key unique (org_id, source, source_row),
  constraint maint_orders_text_len check (
    coalesce(length(site), 0) <= 200 and coalesce(length(component), 0) <= 120
    and coalesce(length(description), 0) <= 2000 and coalesce(length(notes), 0) <= 4000)
);
create index if not exists maint_orders_org_status_idx on public.maint_orders (org_id, status, requested_at desc);
create index if not exists maint_orders_assigned_idx on public.maint_orders (assigned_to) where assigned_to is not null;

create table if not exists public.maint_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.maint_orders (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event text not null check (event in ('created', 'assigned', 'stage', 'status', 'note')),
  from_stage text,
  to_stage text,
  from_status text,
  to_status text,
  hold_reason text,
  note text check (coalesce(length(note), 0) <= 1000),
  created_at timestamptz not null default now()
);
-- احتياط idempotency (حارس الجودة): لو وُجد الجدول بصيغةٍ أقدم بلا العمود.
alter table public.maint_order_events add column if not exists hold_reason text;
create index if not exists maint_order_events_order_idx on public.maint_order_events (order_id, created_at);

-- ── الامتيازات: لا شيء للزائر، وقراءةٌ وحدها للمصادَق ──────────────────────
alter table public.maint_orders enable row level security;
alter table public.maint_order_events enable row level security;
revoke all on public.maint_orders, public.maint_order_events from anon, authenticated;
grant select on public.maint_orders, public.maint_order_events to authenticated;
revoke all on sequence public.maint_order_seq from anon, authenticated;

drop policy if exists maint_orders_select_member on public.maint_orders;
create policy maint_orders_select_member on public.maint_orders
  for select to authenticated
  using (public.is_org_member(org_id, 'viewer'::public.org_role));

drop policy if exists maint_order_events_select_member on public.maint_order_events;
create policy maint_order_events_select_member on public.maint_order_events
  for select to authenticated
  using (public.is_org_member(org_id, 'viewer'::public.org_role));

-- ── نسبة الإنجاز ─────────────────────────────────────────────────────────
create or replace function public.maint_stage_pct(_stage text, _status text)
returns integer
language sql
immutable
set search_path to 'public'
as $$
  select case
    when _status = 'cancelled' then null
    when _status = 'completed' then 100
    else case _stage
      when 'registered' then 10
      when 'assigned' then 20
      when 'on_site' then 35
      when 'diagnosed' then 50
      when 'awaiting_parts' then 60
      when 'repairing' then 75
      when 'testing' then 90
      when 'closed' then 100
    end
  end;
$$;
revoke all on function public.maint_stage_pct(text, text) from public, anon;
grant execute on function public.maint_stage_pct(text, text) to authenticated;

create or replace function public.maint_stage_rank(_stage text)
returns integer
language sql
immutable
set search_path to 'public'
as $$
  select array_position(array[
    'registered', 'assigned', 'on_site', 'diagnosed', 'awaiting_parts', 'repairing', 'testing', 'closed'
  ], _stage);
$$;
revoke all on function public.maint_stage_rank(text) from public, anon;
grant execute on function public.maint_stage_rank(text) to authenticated;

-- مدير الصيانة: مدير المؤسسة فما فوق، أو دور تطبيقٍ admin/manager **وهو عضوٌ في
-- مؤسسة الأمر نفسها**. دور التطبيق عامّ لا يحمل مؤسسة، فبلا شرط العضوية قِيس
-- (حارس الجودة): مشغّلٌ في مؤسسةٍ أخرى بدور manager ألغى أمرًا هنا وأسنده.
create or replace function public.maint_is_manager(_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_org_member(_org, 'manager'::public.org_role)
      or ((public.has_role(auth.uid(), 'admin'::public.app_role)
           or public.has_role(auth.uid(), 'manager'::public.app_role))
          and public.is_org_member(_org, 'viewer'::public.org_role));
$$;
revoke all on function public.maint_is_manager(uuid) from public, anon;
grant execute on function public.maint_is_manager(uuid) to authenticated;

-- ── العرض: الأمر مع نسبته وتأخيره ومُنشئه ومُسنَده (الاسم والرقم الوظيفي) ──
-- security_invoker = false لأنه يقرأ profiles/staff_accounts المحجوبين عن
-- الأعضاء — فشرط العضوية **داخله** صريح، وإلا كشف أوامر كل المؤسسات.
drop view if exists public.maint_orders_v;
create view public.maint_orders_v with (security_invoker = false) as
select
  o.id, o.org_id, o.ref, o.source, o.city, o.site, o.system, o.component, o.description,
  o.priority, o.status, o.stage, o.stage_basis, o.hold_reason,
  public.maint_stage_pct(o.stage, o.status) as progress_pct,
  o.requested_at, o.due_at, o.completed_at,
  case when o.status = 'completed' and o.due_at is not null and o.completed_at is not null
       then greatest(0, o.completed_at - o.due_at) end as delay_days,
  case when o.status in ('open', 'on_hold') and o.due_at is not null
       then greatest(0, current_date - o.due_at) end as overdue_days,
  case when o.status in ('open', 'on_hold') and o.requested_at is not null
       then current_date - o.requested_at end as age_days,
  o.sap_wo, o.po, o.boq_item, o.qty, o.service_cost, o.maintenance_cost, o.spares_cost,
  o.delay_penalty, o.notes,
  o.created_by, cp.display_name as created_by_name, cs.staff_number as created_by_staff,
  o.assigned_to, ap.display_name as assigned_to_name, ast.staff_number as assigned_to_staff,
  o.created_at, o.updated_at
from public.maint_orders o
left join public.profiles cp on cp.user_id = o.created_by
left join public.staff_accounts cs on cs.user_id = o.created_by
left join public.profiles ap on ap.user_id = o.assigned_to
left join public.staff_accounts ast on ast.user_id = o.assigned_to
where public.is_org_member(o.org_id, 'viewer'::public.org_role);
revoke all on public.maint_orders_v from anon, authenticated;
grant select on public.maint_orders_v to authenticated;

-- ── الكتابة: إنشاء ─────────────────────────────────────────────────────────
create or replace function public.maint_create_order(
  _site text,
  _city text,
  _system text,
  _component text,
  _description text,
  _priority text,
  _due_at date
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _org uuid := public.current_org_id();
  _ref text;
  _id uuid;
begin
  if auth.uid() is null or _org is null
     or not public.is_org_member(_org, 'operator'::public.org_role) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(length(trim(_site)), 0) < 2 or coalesce(length(trim(_description)), 0) < 5 then
    raise exception 'site and description are required' using errcode = '22023';
  end if;
  if _system not in ('CCTV', 'GATE', 'ACS', 'VISIT') then
    raise exception 'invalid system' using errcode = '22023';
  end if;
  if coalesce(_priority, 'medium') not in ('low', 'medium', 'high', 'critical') then
    raise exception 'invalid priority' using errcode = '22023';
  end if;
  if _due_at is not null and (_due_at < current_date or _due_at > current_date + 365) then
    raise exception 'invalid due date' using errcode = '22023';
  end if;

  _ref := 'MO-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.maint_order_seq')::text, 4, '0');
  insert into public.maint_orders (
    org_id, ref, source, city, site, system, component, description, priority,
    status, stage, stage_basis, requested_at, due_at, created_by)
  values (
    _org, _ref, 'app', nullif(upper(trim(_city)), ''), trim(_site), _system,
    nullif(trim(_component), ''), trim(_description), coalesce(_priority, 'medium'),
    'open', 'registered', 'workflow', current_date, _due_at, auth.uid())
  returning id into _id;

  insert into public.maint_order_events (order_id, org_id, actor_id, event, to_stage, to_status)
  values (_id, _org, auth.uid(), 'created', 'registered', 'open');
  return _ref;
end;
$$;
revoke all on function public.maint_create_order(text, text, text, text, text, text, date) from public, anon;
grant execute on function public.maint_create_order(text, text, text, text, text, text, date) to authenticated;

-- ── الكتابة: إسناد فني (المدير) ────────────────────────────────────────────
create or replace function public.maint_assign(_order uuid, _assignee uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.maint_orders%rowtype;
begin
  select * into o from public.maint_orders where id = _order for update;
  if not found or not public.maint_is_manager(o.org_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if o.status not in ('open', 'on_hold') then
    raise exception 'order is closed' using errcode = '22023';
  end if;
  if not exists (select 1 from public.org_members m where m.org_id = o.org_id and m.user_id = _assignee) then
    raise exception 'assignee is not a member' using errcode = '22023';
  end if;

  update public.maint_orders
     set assigned_to = _assignee,
         stage = case when stage = 'registered' then 'assigned' else stage end,
         stage_basis = case when stage = 'registered' then 'workflow' else stage_basis end,
         imported_untouched = false,
         updated_at = now()
   where id = _order;

  insert into public.maint_order_events (order_id, org_id, actor_id, event, from_stage, to_stage)
  values (_order, o.org_id, auth.uid(), 'assigned', o.stage,
          case when o.stage = 'registered' then 'assigned' else o.stage end);
end;
$$;
revoke all on function public.maint_assign(uuid, uuid) from public, anon;
grant execute on function public.maint_assign(uuid, uuid) to authenticated;

-- ── الكتابة: تقدّم المرحلة ──────────────────────────────────────────────────
-- الفني المُسنَد: إلى الأمام فقط وحتى «اختبار وتشغيل». المدير: أي مرحلة،
-- والإغلاق (١٠٠٪) له وحده بعد التحقق — عُرف الصيانة: من أصلح لا يعتمد إصلاحه.
create or replace function public.maint_advance_stage(_order uuid, _to_stage text, _note text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.maint_orders%rowtype;
  _mgr boolean;
begin
  select * into o from public.maint_orders where id = _order for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  _mgr := public.maint_is_manager(o.org_id);
  -- الفني المُسنَد **ما دام عضوًا**: من أُزيل من المؤسسة لا يكتب في أمرٍ بقي
  -- مُسنَدًا إليه (قِيس: فنيٌّ محذوف من org_members قدّم أمره).
  if not (_mgr or (auth.uid() is not null and o.assigned_to is not distinct from auth.uid()
                   and public.is_org_member(o.org_id, 'viewer'::public.org_role))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if o.status not in ('open', 'on_hold') then
    raise exception 'order is closed' using errcode = '22023';
  end if;
  if public.maint_stage_rank(_to_stage) is null or _to_stage = o.stage then
    raise exception 'invalid stage' using errcode = '22023';
  end if;
  if not _mgr and (_to_stage = 'closed'
       or public.maint_stage_rank(_to_stage) < public.maint_stage_rank(o.stage)) then
    raise exception 'only a manager can close or move back' using errcode = '42501';
  end if;
  if coalesce(length(_note), 0) > 1000 then
    raise exception 'note too long' using errcode = '22023';
  end if;

  update public.maint_orders
     set stage = _to_stage,
         stage_basis = 'workflow',
         status = case when _to_stage = 'closed' then 'completed'
                       when status = 'on_hold' then 'open' else status end,
         hold_reason = case when _to_stage = 'closed' or status = 'on_hold' then null else hold_reason end,
         completed_at = case when _to_stage = 'closed' then current_date else completed_at end,
         imported_untouched = false,
         updated_at = now()
   where id = _order;

  insert into public.maint_order_events (
    order_id, org_id, actor_id, event, from_stage, to_stage, from_status, to_status, note)
  values (_order, o.org_id, auth.uid(), 'stage', o.stage, _to_stage, o.status,
          case when _to_stage = 'closed' then 'completed'
               when o.status = 'on_hold' then 'open' else o.status end,
          nullif(trim(_note), ''));
end;
$$;
revoke all on function public.maint_advance_stage(uuid, text, text) from public, anon;
grant execute on function public.maint_advance_stage(uuid, text, text) to authenticated;

-- ── الكتابة: إيقاف / استئناف / إلغاء ───────────────────────────────────────
-- الإيقاف والاستئناف: الفني المُسنَد أو المدير، والإيقاف بسببٍ من القائمة.
-- الإلغاء: المدير وحده.
create or replace function public.maint_set_status(_order uuid, _status text, _hold_reason text, _note text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.maint_orders%rowtype;
  _mgr boolean;
begin
  select * into o from public.maint_orders where id = _order for update;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  _mgr := public.maint_is_manager(o.org_id);
  -- الفني المُسنَد **ما دام عضوًا**: من أُزيل من المؤسسة لا يكتب في أمرٍ بقي
  -- مُسنَدًا إليه (قِيس: فنيٌّ محذوف من org_members قدّم أمره).
  if not (_mgr or (auth.uid() is not null and o.assigned_to is not distinct from auth.uid()
                   and public.is_org_member(o.org_id, 'viewer'::public.org_role))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if o.status not in ('open', 'on_hold') or _status not in ('open', 'on_hold', 'cancelled')
     or _status = o.status then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if _status = 'cancelled' and not _mgr then
    raise exception 'only a manager can cancel' using errcode = '42501';
  end if;
  if _status = 'on_hold' and (_hold_reason is null or _hold_reason not in (
       'approval', 'power', 'site_not_ready', 'access', 'it_support', 'civil_cabling',
       'spare_parts', 'troubleshooting')) then
    raise exception 'hold reason required' using errcode = '22023';
  end if;
  if coalesce(length(_note), 0) > 1000 then
    raise exception 'note too long' using errcode = '22023';
  end if;

  update public.maint_orders
     set status = _status,
         hold_reason = case when _status = 'on_hold' then _hold_reason else null end,
         imported_untouched = false,
         updated_at = now()
   where id = _order;

  -- السبب في عموده لا في نصّ الملاحظة: الرمز (`spare_parts`) معرّفٌ يُعرَّب في
  -- الواجهة، وخلطه بالنصّ أظهره إنجليزيًّا في الخط الزمني (حارس الجودة).
  insert into public.maint_order_events (
    order_id, org_id, actor_id, event, from_status, to_status, hold_reason, note)
  values (_order, o.org_id, auth.uid(), 'status', o.status, _status,
          case when _status = 'on_hold' then _hold_reason end, nullif(trim(_note), ''));
end;
$$;
revoke all on function public.maint_set_status(uuid, text, text, text) from public, anon;
grant execute on function public.maint_set_status(uuid, text, text, text) to authenticated;

-- ── دليل الفنيين للإسناد (المدير وحده) ──────────────────────────────────────
create or replace function public.maint_staff_directory()
returns table (user_id uuid, display_name text, staff_number text, org_role text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.user_id, p.display_name, s.staff_number, m.role::text
    from public.org_members m
    left join public.profiles p on p.user_id = m.user_id
    left join public.staff_accounts s on s.user_id = m.user_id
   where m.org_id = public.current_org_id()
     and public.maint_is_manager(m.org_id)
   order by p.display_name nulls last;
$$;
revoke all on function public.maint_staff_directory() from public, anon;
grant execute on function public.maint_staff_directory() to authenticated;

-- ── المؤشرات والتحليلات — بصلاحية المستدعي (RLS يحصرها في مؤسسته) ─────────
create or replace function public.maint_kpis()
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $$
  with o as (select * from public.maint_orders_v)
  select jsonb_build_object(
    'total', count(*),
    'open', count(*) filter (where status = 'open'),
    'on_hold', count(*) filter (where status = 'on_hold'),
    'completed', count(*) filter (where status = 'completed'),
    'cancelled', count(*) filter (where status = 'cancelled'),
    'overdue', count(*) filter (where overdue_days > 0),
    'completion_rate', round(100.0 * count(*) filter (where status = 'completed')
                         / nullif(count(*) filter (where status <> 'cancelled'), 0), 1),
    'on_time_rate', round(100.0 * count(*) filter (where delay_days = 0)
                         / nullif(count(*) filter (where delay_days is not null), 0), 1),
    'on_time_basis', count(*) filter (where delay_days is not null),
    'avg_delay_late', round(avg(delay_days) filter (where delay_days > 0), 1),
    'avg_progress_active', round(avg(progress_pct) filter (where status in ('open', 'on_hold')), 0),
    'maintenance_cost', sum(maintenance_cost) filter (where status = 'completed'),
    'spares_cost', sum(spares_cost) filter (where status = 'completed'),
    'penalties', sum(delay_penalty),
    'sap_pending', count(*) filter (where source = 'cm_log' and sap_wo is null and status = 'completed'),
    'unassigned_active', count(*) filter (where status in ('open', 'on_hold') and assigned_to is null),
    'first_request', min(requested_at),
    'last_request', max(requested_at)
  ) from o;
$$;
revoke all on function public.maint_kpis() from public, anon;
grant execute on function public.maint_kpis() to authenticated;

create or replace function public.maint_analytics()
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $$
  with o as (select * from public.maint_orders_v where status <> 'cancelled'),
  rep as (
    select site, component, requested_at,
           lag(requested_at) over (partition by lower(site), lower(component) order by requested_at) as prev
      from o where site is not null and component is not null and requested_at is not null
  )
  select jsonb_build_object(
    'by_system', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select system as key, count(*) n, count(*) filter (where status = 'completed') done,
               count(*) filter (where status in ('open', 'on_hold')) active
          from o group by system) x),
    'by_city', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select city as key, count(*) n, count(*) filter (where status in ('open', 'on_hold')) active,
               round(100.0 * count(*) filter (where delay_days = 0)
                     / nullif(count(*) filter (where delay_days is not null), 0), 1) on_time
          from o group by city) x),
    'by_hold_reason', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select coalesce(hold_reason, 'unclassified') as key, count(*) n
          from o where status in ('open', 'on_hold') group by 1) x),
    'monthly', (select coalesce(jsonb_agg(x order by x.month), '[]') from (
        select to_char(date_trunc('month', requested_at), 'YYYY-MM') as month, count(*) requested,
               count(*) filter (where status = 'completed') completed
          from o where requested_at is not null group by 1) x),
    'top_components', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select component as key, system, count(*) n from o where component is not null
         group by component, system order by count(*) desc limit 10) x),
    'top_sites', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select min(site) as key, count(*) n, count(*) filter (where status in ('open', 'on_hold')) active
          from o where site is not null group by lower(site) order by count(*) desc limit 10) x),
    'repeat_failures', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select min(site) as site, min(component) as component, count(*) n
          from rep where prev is not null and requested_at - prev <= 30
         group by lower(site), lower(component) order by count(*) desc limit 10) x)
  );
$$;
revoke all on function public.maint_analytics() from public, anon;
grant execute on function public.maint_analytics() to authenticated;
