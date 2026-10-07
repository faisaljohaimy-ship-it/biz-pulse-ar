-- ═══════════════════════════════════════════════════════════════════════════
-- الصيانة بيانات فعلية: أوامر SAP مع سجل CM، وقراءةٌ عامة ستة أشهر
-- (أمر المالك ٢٠٢٦/١٠/٠٦).
--
-- نصّ الأمر: «ازل بيانات المحاكاة واعتمد هذه البيانات المرفقة كبيانات فعلية
-- وحقيقية». وبالسؤال: «قراءة البيانات من أي أحد مع دمج تسجيل الدخول كنظام
-- حقيقي لفترة ٦ أشهر قادمة» · «دمج الصيانة والسستم كامل للبداية التشغيلية».
--
-- ## ما يضيفه
-- • `kind` (تصحيحية/وقائية) — تصدير SAP فيه ٩٦ أمرًا وقائيًّا بدوراتها.
-- • `region` بمعرّفات `regions.ts` وحدها. سجل CM ⇐ «الغربية» بدليلٍ مكتوب:
--   أسماء مواقعه تقول «Western Region» صراحةً، والسبعة عشر أمرًا المشتركة بينه
--   وبين SAP كلّها في مجموعة التخطيط WOA.
-- • أعمدة SAP (الموقع الوظيفي، المعدّة، مجموعة التخطيط، منشئ الأمر برقمه
--   الوظيفي، نافذة SLA، حالة النظام، الإشعار، الخطة ودورتها، الكلفة المخططة).
-- • `source = 'sap'`، ونظاما `CONTROL` (غرفة التحكم) و`PIDS` (كشف التسلّل)
--   كما يصنّفهما SAP — لا يُذابان في الكاميرات.
--
-- ## الأولوية بلا اختلاق (المادة ٢٧)
-- كان `priority not null default 'medium'` فكتب «متوسطة» على الـ١٧٩٥ أمرًا
-- المستوردة من سجلٍّ لا عمود أولوية فيه أصلًا. صارت تقبل الفراغ، وتُعاد فراغًا
-- لصفوف السجل. وأوامر الواجهة تبقى بأولويتها المختارة.
--
-- ## القراءة العامة — حتى 2027-04-06، مفروضةٌ هنا لا في الواجهة
-- `maint_public_read_open()` تغلق النافذة بنفسها في موعدها، فلا يُنسى إغلاقها.
-- وما يُكشف للزائر: الأوامر ومراحلها ونسبها ومؤشراتها وتحليلاتها. وما يبقى
-- للأعضاء وحدهم — **حمايةً للبيانات الشخصية (نظام حماية البيانات الشخصية)**:
-- أسماء المُنشئ والفني وأرقامهم الوظيفية ومعرّفاتهم، وملاحظات الفنيين (نصٌّ حرّ
-- قد يحمل أسماء موظفين)، والخط الزمني. والعرض يقصر النافذة العامة على المؤسسة
-- التشغيلية الوحيدة المقيسة — فلا تنفتح بيانات مؤسسةٍ تُضاف لاحقًا.
--
-- idempotent · التراجع: `20261006190001_maint_orders_sap_public_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١. النوع والمنطقة وأعمدة SAP ─────────────────────────────────────────
alter table public.maint_orders add column if not exists kind text not null default 'corrective';
alter table public.maint_orders add column if not exists region text;
alter table public.maint_orders add column if not exists functional_location text;
alter table public.maint_orders add column if not exists equipment text;
alter table public.maint_orders add column if not exists planner_group text;
alter table public.maint_orders add column if not exists entered_by_staff text;
alter table public.maint_orders add column if not exists plan_generated boolean not null default false;
alter table public.maint_orders add column if not exists sla_text text;
alter table public.maint_orders add column if not exists sap_system_status text;
alter table public.maint_orders add column if not exists notification text;
alter table public.maint_orders add column if not exists maintenance_plan text;
alter table public.maint_orders add column if not exists maintenance_cycle text;
alter table public.maint_orders add column if not exists planned_cost numeric;

alter table public.maint_orders drop constraint if exists maint_orders_kind_check;
alter table public.maint_orders add constraint maint_orders_kind_check
  check (kind in ('corrective', 'preventive'));
alter table public.maint_orders drop constraint if exists maint_orders_region_check;
alter table public.maint_orders add constraint maint_orders_region_check
  check (region in ('central', 'western', 'eastern', 'southern'));
alter table public.maint_orders drop constraint if exists maint_orders_source_check;
alter table public.maint_orders add constraint maint_orders_source_check
  check (source in ('cm_log', 'app', 'sap'));
alter table public.maint_orders drop constraint if exists maint_orders_system_check;
alter table public.maint_orders add constraint maint_orders_system_check
  check (system in ('CCTV', 'GATE', 'ACS', 'VISIT', 'CONTROL', 'PIDS'));
alter table public.maint_orders drop constraint if exists maint_orders_entered_by_staff_check;
alter table public.maint_orders add constraint maint_orders_entered_by_staff_check
  check (entered_by_staff ~ '^[0-9]{5,6}$');
create index if not exists maint_orders_org_region_idx on public.maint_orders (org_id, region, kind);
create index if not exists maint_orders_entered_by_idx on public.maint_orders (entered_by_staff)
  where entered_by_staff is not null;

-- ── ٢. الأولوية بلا اختلاق، وسجل CM في منطقته ───────────────────────────
alter table public.maint_orders alter column priority drop not null;
update public.maint_orders set priority = null
 where source = 'cm_log' and priority = 'medium';
update public.maint_orders set region = 'western'
 where source = 'cm_log' and region is null;

-- ── ٣. نافذة القراءة العامة ───────────────────────────────────────────────
create or replace function public.maint_public_read_open()
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select now() < timestamptz '2027-04-06 00:00:00+03';
$$;
revoke all on function public.maint_public_read_open() from public;
grant execute on function public.maint_public_read_open() to anon, authenticated;

-- العرض يستدعي هذه الدوالّ باسم القارئ لا باسم مالكه (توثيق CREATE VIEW)،
-- فالزائر يحتاج تنفيذها. كلّها خالصة أو تعيد false للزائر.
grant execute on function public.maint_stage_pct(text, text) to anon;
grant execute on function public.is_org_member(uuid, public.org_role) to anon;

-- ── ٤. العرض: الأعضاء كاملًا، والزائر في النافذة بلا بيانات شخصية ──────────
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
  o.delay_penalty,
  case when v.member then o.notes end as notes,
  case when v.member then o.created_by end as created_by,
  case when v.member then coalesce(cp.display_name, ep.display_name) end as created_by_name,
  case when v.member then coalesce(cs.staff_number, o.entered_by_staff) end as created_by_staff,
  case when v.member then o.assigned_to end as assigned_to,
  case when v.member then ap.display_name end as assigned_to_name,
  case when v.member then ast.staff_number end as assigned_to_staff,
  -- «مُسنَد أم لا» حقيقةٌ تشغيلية لا شخصية: تبقى للزائر، فلا يُعدّ كل أمرٍ
  -- نشط «بلا فني» لمجرّد أنّ هوية الفني محجوبة عنه (المادة ٢٧).
  (o.assigned_to is not null) as is_assigned,
  o.created_at, o.updated_at,
  o.kind, o.region, o.functional_location, o.equipment, o.planner_group, o.plan_generated,
  o.sla_text, o.sap_system_status, o.notification, o.maintenance_plan, o.maintenance_cycle,
  o.planned_cost,
  v.member as viewer_is_member
from public.maint_orders o
cross join lateral (select public.is_org_member(o.org_id, 'viewer'::public.org_role) as member) v
left join public.profiles cp on cp.user_id = o.created_by
left join public.staff_accounts cs on cs.user_id = o.created_by
left join public.staff_accounts es on es.staff_number = o.entered_by_staff
left join public.profiles ep on ep.user_id = es.user_id
left join public.profiles ap on ap.user_id = o.assigned_to
left join public.staff_accounts ast on ast.user_id = o.assigned_to
where v.member
   or (o.org_id = '00000000-0000-0000-0000-000000000001'::uuid and public.maint_public_read_open());
revoke all on public.maint_orders_v from anon, authenticated;
grant select on public.maint_orders_v to anon, authenticated;

-- ── ٥. المؤشرات والتحليلات — للزائر في النافذة أيضًا (تقرأ العرض نفسه) ────
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
    'unassigned_active', count(*) filter (where status in ('open', 'on_hold') and not is_assigned),
    'preventive_total', count(*) filter (where kind = 'preventive' and status <> 'cancelled'),
    'preventive_done', count(*) filter (where kind = 'preventive' and status = 'completed'),
    'pm_compliance', round(100.0 * count(*) filter (where kind = 'preventive' and status = 'completed')
                         / nullif(count(*) filter (where kind = 'preventive' and status <> 'cancelled'), 0), 1),
    'first_request', min(requested_at),
    'last_request', max(requested_at),
    'viewer_is_member', coalesce(bool_or(viewer_is_member), false),
    'public_read_open', public.maint_public_read_open()
  ) from o;
$$;
revoke all on function public.maint_kpis() from public;
grant execute on function public.maint_kpis() to anon, authenticated;

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
    'by_region', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select region as key, count(*) n, count(*) filter (where status = 'completed') done,
               count(*) filter (where status in ('open', 'on_hold')) active,
               count(*) filter (where kind = 'preventive') preventive
          from o group by region) x),
    'by_kind', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select kind as key, count(*) n, count(*) filter (where status = 'completed') done,
               count(*) filter (where status in ('open', 'on_hold')) active
          from o group by kind) x),
    'by_city', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (
        select city as key, count(*) n, count(*) filter (where status in ('open', 'on_hold')) active,
               round(100.0 * count(*) filter (where delay_days = 0)
                     / nullif(count(*) filter (where delay_days is not null), 0), 1) on_time
          from o where city is not null group by city) x),
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
revoke all on function public.maint_analytics() from public;
grant execute on function public.maint_analytics() to anon, authenticated;

-- ── ٦. الإنشاء من الواجهة: بالمنطقة والنوع ─────────────────────────────────
create or replace function public.maint_create_order_v2(
  _site text,
  _city text,
  _region text,
  _system text,
  _kind text,
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
  if _system not in ('CCTV', 'GATE', 'ACS', 'VISIT', 'CONTROL', 'PIDS') then
    raise exception 'invalid system' using errcode = '22023';
  end if;
  if coalesce(_kind, 'corrective') not in ('corrective', 'preventive') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  if _region is not null and _region not in ('central', 'western', 'eastern', 'southern') then
    raise exception 'invalid region' using errcode = '22023';
  end if;
  if coalesce(_priority, 'medium') not in ('low', 'medium', 'high', 'critical') then
    raise exception 'invalid priority' using errcode = '22023';
  end if;
  if _due_at is not null and (_due_at < current_date or _due_at > current_date + 365) then
    raise exception 'invalid due date' using errcode = '22023';
  end if;
  _ref := 'MO-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.maint_order_seq')::text, 4, '0');
  insert into public.maint_orders (
    org_id, ref, source, city, region, site, system, kind, component, description, priority,
    status, stage, stage_basis, requested_at, due_at, created_by)
  values (
    _org, _ref, 'app', nullif(upper(trim(_city)), ''), _region, trim(_site), _system,
    coalesce(_kind, 'corrective'), nullif(trim(_component), ''), trim(_description),
    coalesce(_priority, 'medium'),
    'open', 'registered', 'workflow', current_date, _due_at, auth.uid())
  returning id into _id;
  insert into public.maint_order_events (order_id, org_id, actor_id, event, to_stage, to_status)
  values (_id, _org, auth.uid(), 'created', 'registered', 'open');
  return _ref;
end;
$$;
revoke all on function public.maint_create_order_v2(text, text, text, text, text, text, text, text, date) from public, anon;
grant execute on function public.maint_create_order_v2(text, text, text, text, text, text, text, text, date) to authenticated;

-- الإصدار الأول يبقى غلافًا للثاني — الواجهة المنشورة قبل هذه الدفعة تستدعيه،
-- فلا ينكسر الإنشاء في الدقائق بين تطبيق الترحيل ونشر الواجهة.
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
language sql
security definer
set search_path to 'public'
as $$
  select public.maint_create_order_v2(_site, _city, null, _system, 'corrective', _component,
                                      _description, _priority, _due_at);
$$;
revoke all on function public.maint_create_order(text, text, text, text, text, text, date) from public, anon;
grant execute on function public.maint_create_order(text, text, text, text, text, text, date) to authenticated;
