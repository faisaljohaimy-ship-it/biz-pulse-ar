-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: الصيانة بيانات فعلية وقراءةٌ عامة — مرافق لـ
-- `20261006190000_maint_orders_sap_public.sql`.
--
-- **يُغلق القراءة العامة أولًا** (أهمّ ما في التراجع): يعيد العرض والمؤشرات إلى
-- الأعضاء وحدهم، ويسحب تنفيذ الدوالّ من الزائر، ويُسقط `maint_create_order_v2`
-- ويعيد `maint_create_order` الأصلية بجسمها الكامل.
--
-- **لا يحذف بيانات:** صفوف SAP المستوردة والأعمدة الجديدة تبقى (حذفها حذف بيانات
-- خلف موافقة المالك). والأولوية لا تُعاد «متوسطة» للسجل — كانت قيمة مختلَقة.
-- ويبقى قيد المصدر والنظام موسَّعًا لأن صفوف SAP قائمة؛ تضييقه يفشل عليها.
--
-- idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function public.maint_kpis() from anon;
revoke execute on function public.maint_analytics() from anon;
revoke execute on function public.maint_stage_pct(text, text) from anon;
-- يعيد تشديد `20260626140444`: لا تنفيذ لفحص العضوية من الزائر.
revoke execute on function public.is_org_member(uuid, public.org_role) from anon;

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

-- المؤشرات والتحليلات بجسمها الأصلي (نسخةٌ حرفية من `20261006120000`) — جسمها
-- الجديد يقرأ أعمدةً ودالّةً يُسقطها هذا التراجع.
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

drop function if exists public.maint_public_read_open();

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

drop function if exists public.maint_create_order_v2(text, text, text, text, text, text, text, text, date);
