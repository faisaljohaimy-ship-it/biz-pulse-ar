-- ═══════════════════════════════════════════════════════════════════════════
-- فحص «أوامر عمل الصيانة» — ترحيل `20261006120000` تحت هجوم.
--
-- ⚠ **يهدم المخطّطين `public` و`auth` ويبنيهما** محاكاةً لما قِيس على الإنتاج
-- ٢٠٢٦/١٠/٠٦ — ومعها **منح Supabase الافتراضي** (anon وauthenticated يملكان
-- كل شيء على كل جدول جديد، وتنفيذ كل دالّة جديدة)، فلا يمرّ هنا ما يفشل هناك.
-- لذلك **يرفض العمل إلا على قاعدةٍ اسمها `sadeed_rls_harness`**.
--
--   createdb sadeed_rls_harness
--   psql -d sadeed_rls_harness -f supabase/preflight/maint_orders_check.sql
-- كل سطر PASS/FAIL محاولةٌ تحت `set local role authenticated|anon`.
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'sadeed_rls_harness' then
    raise exception 'refusing to run on database %: this check rebuilds schemas', current_database();
  end if;
end $$;
drop schema if exists auth cascade; drop schema if exists public cascade; create schema public; create schema auth;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema public, auth to anon, authenticated;
-- منح Supabase الافتراضي كما قِيس (pg_default_acl): كل شيء للزائر والمصادَق.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create type public.app_role as enum ('admin','manager','member');
create type public.org_role as enum ('owner','admin','manager','operator','viewer');
create table public.organizations (id uuid primary key, name text);
create table public.org_members (org_id uuid, user_id uuid, role public.org_role, unique(org_id,user_id));
create table public.user_roles (user_id uuid, role public.app_role);
create table public.profiles (id uuid default gen_random_uuid() primary key, user_id uuid unique, display_name text);
create table public.staff_accounts (user_id uuid primary key, staff_number text unique);
alter table public.profiles enable row level security;
create policy own_profile_select on public.profiles for select to authenticated using (user_id = auth.uid());
alter table public.staff_accounts enable row level security;
create policy staff_accounts_select_own_or_admin on public.staff_accounts for select to authenticated using (user_id = auth.uid());
create function public.is_org_member(_org uuid, _min_role public.org_role default 'viewer') returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.org_members m where m.org_id=_org and m.user_id=auth.uid() and case _min_role
   when 'viewer' then m.role in ('viewer','operator','manager','admin','owner') when 'operator' then m.role in ('operator','manager','admin','owner')
   when 'manager' then m.role in ('manager','admin','owner') when 'admin' then m.role in ('admin','owner') when 'owner' then m.role='owner' end) $$;
create function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create function public.current_org_id() returns uuid language sql stable security definer set search_path to 'public' as $$ select org_id from public.org_members where user_id=auth.uid() limit 1 $$;


-- مؤسستان. M مدير · T فني (operator) · A مشغّل · V مشاهد · X مشغّل في مؤسسة أخرى.
insert into public.organizations values
 ('00000000-0000-0000-0000-000000000001','org1'), ('00000000-0000-0000-0000-000000000009','org9');
insert into auth.users(id) values
 ('a0000000-0000-0000-0000-00000000000a'), ('a0000000-0000-0000-0000-00000000000b'),
 ('a0000000-0000-0000-0000-00000000000c'), ('a0000000-0000-0000-0000-00000000000d'),
 ('a0000000-0000-0000-0000-00000000000e');
insert into public.org_members values
 ('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','manager'),
 ('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000b','operator'),
 ('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000c','operator'),
 ('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000d','viewer'),
 ('00000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000e','operator');
insert into public.profiles(user_id, display_name) values
 ('a0000000-0000-0000-0000-00000000000a','مدير الصيانة'), ('a0000000-0000-0000-0000-00000000000b','فني أول'),
 ('a0000000-0000-0000-0000-00000000000c','مشغّل');
insert into public.staff_accounts values
 ('a0000000-0000-0000-0000-00000000000b','10254'), ('a0000000-0000-0000-0000-00000000000c','10300');

\ir ../migrations/20261006120000_maint_orders.sql
\ir ../migrations/20261006120000_maint_orders.sql
-- (مرّتين: idempotent)

-- صفوف مستوردة بصيغة سكربت الاستيراد نفسها (بيانات اصطناعية).
insert into public.maint_orders (org_id, source, stage_basis, imported_untouched, ref, source_row, city, site, system, component, status, stage, hold_reason, requested_at, due_at, completed_at, maintenance_cost, spares_cost, delay_penalty, notes)
select '00000000-0000-0000-0000-000000000001'::uuid, 'cm_log', 'import_evidence', true,
  v.ref, v.source_row::integer, v.city, v.site, v.system, v.component, v.status, v.stage, v.hold_reason,
  v.requested_at::date, v.due_at::date, v.completed_at::date, v.maintenance_cost::numeric, v.spares_cost::numeric, v.delay_penalty::numeric, v.notes
from (values
 ('CM-0001', 2, 'JEDDAH', 'Plant A', 'CCTV', 'Outdoor Fixed Camera', 'on_hold', 'awaiting_parts', 'spare_parts', '2026-01-01', '2026-01-01', null, 1250, 0, 0, 'need to replace'),
 ('CM-0002', 3, 'MAKKAH', 'Plant B', 'GATE', 'Arm Barrier', 'completed', 'closed', null, '2026-01-02', '2026-01-02', '2026-01-05', 1962, 350, 125, 'fixed'),
 ('CM-0003', 4, 'MAKKAH', 'Plant B', 'GATE', 'Arm Barrier', 'completed', 'closed', null, '2026-01-20', '2026-01-20', '2026-01-20', 1962, 0, 0, 'fixed again')
) as v(ref, source_row, city, site, system, component, status, stage, hold_reason, requested_at, due_at, completed_at, maintenance_cost, spares_cost, delay_penalty, notes)
on conflict (org_id, source, source_row) do nothing;
insert into public.maint_orders (org_id, source, ref, source_row, site, system, status, stage)
values ('00000000-0000-0000-0000-000000000009', 'cm_log', 'CM-0001', 2, 'Other org site', 'CCTV', 'open', 'registered');

\set ON_ERROR_STOP off
create or replace function pg_temp.t(label text, sql text, expect_ok boolean) returns void language plpgsql as $$
declare ok boolean := true; err text; begin
  begin execute sql; exception when others then ok := false; err := sqlerrm; end;
  raise notice '% %  (%)', case when ok = expect_ok then 'PASS' else 'FAIL' end, label, case when ok then 'allowed' else 'denied: ' || err end;
end $$;
create or replace function pg_temp.eq(label text, sql text, expected text) returns void language plpgsql as $$
declare got text; begin
  begin execute sql into got; exception when others then got := 'ERROR ' || sqlerrm; end;
  raise notice '% %  (got %, expected %)', case when got is not distinct from expected then 'PASS' else 'FAIL' end, label, got, expected;
end $$;

-- ── الزائر: لا شيء ─────────────────────────────────────────────────────────
begin; set local role anon;
select pg_temp.t('anon select maint_orders', 'select count(*) from public.maint_orders', false);
select pg_temp.t('anon select maint_orders_v', 'select count(*) from public.maint_orders_v', false);
select pg_temp.t('anon select events', 'select count(*) from public.maint_order_events', false);
select pg_temp.t('anon maint_kpis', 'select public.maint_kpis()', false);
select pg_temp.t('anon maint_create_order', $q$select public.maint_create_order('S','JEDDAH','CCTV','c','description','high',null)$q$, false);
select pg_temp.t('anon truncate', 'truncate public.maint_orders cascade', false);
select pg_temp.t('anon maint_staff_directory', 'select * from public.maint_staff_directory()', false);
rollback;

-- ── V مشاهد: يقرأ مؤسسته كلها والأسماء، ولا يكتب ─────────────────────────
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000d';
select pg_temp.eq('V reads all org1 orders (not org9)', 'select count(*)::text from public.maint_orders_v', '3');
select pg_temp.eq('V reads table directly within org', 'select count(*)::text from public.maint_orders', '3');
select pg_temp.eq('V progress of on_hold awaiting_parts = 60', $q$select progress_pct::text from public.maint_orders_v where ref='CM-0001'$q$, '60');
select pg_temp.eq('V delay of completed late = 3', $q$select delay_days::text from public.maint_orders_v where ref='CM-0002'$q$, '3');
select pg_temp.eq('V kpis total', $q$select public.maint_kpis()->>'total'$q$, '3');
select pg_temp.eq('V kpis on_time_rate 1 of 2 = 50.0', $q$select public.maint_kpis()->>'on_time_rate'$q$, '50.0');
select pg_temp.eq('V repeat failure detected (same site+component ≤30d)', $q$select (public.maint_analytics()->'repeat_failures'->0->>'n')$q$, '1');
select pg_temp.t('V create order (viewer)', $q$select public.maint_create_order('Site','JEDDAH','CCTV','cam','camera down','high',null)$q$, false);
select pg_temp.t('V direct insert', $q$insert into public.maint_orders(org_id,ref,status,stage) values ('00000000-0000-0000-0000-000000000001','X-1','open','registered')$q$, false);
select pg_temp.t('V direct update', $q$update public.maint_orders set status='completed'$q$, false);
select pg_temp.t('V truncate', 'truncate public.maint_orders cascade', false);
select pg_temp.t('V staff directory (not manager) returns nothing', $q$do $d$ begin if (select count(*) from public.maint_staff_directory()) > 0 then raise exception 'leak'; end if; end $d$$q$, true);
rollback;

-- ── X من مؤسسة أخرى: لا يرى org1 ولا يكتب فيها ─────────────────────────────
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000e';
select pg_temp.eq('X sees only own org', 'select count(*)::text from public.maint_orders_v', '1');
select pg_temp.eq('X kpis exclude org1', $q$select public.maint_kpis()->>'total'$q$, '1');
select pg_temp.t('X advance org1 order', $q$select public.maint_advance_stage((select id from public.maint_orders where ref='CM-0001' and org_id='00000000-0000-0000-0000-000000000001'),'repairing',null)$q$, false);
rollback;

-- ── A مشغّل: يُنشئ باسمه في المرحلة الأولى ──────────────────────────────────
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000c';
select pg_temp.t('A create order', $q$select public.maint_create_order('Reference Site 9','jeddah','CCTV','Outdoor Fixed Camera','camera 12 no video','high',null)$q$, true);
select pg_temp.t('A create with invalid system', $q$select public.maint_create_order('Reference Site 9','jeddah','HVAC','x','something broken','high',null)$q$, false);
select pg_temp.t('A create with past due date', $q$select public.maint_create_order('Reference Site 9','jeddah','CCTV','x','something broken','high',current_date - 1)$q$, false);
select pg_temp.eq('A order is registered 10% by A with staff number', $q$select stage||'/'||progress_pct||'/'||created_by_staff||'/'||created_by_name from public.maint_orders_v where source='app'$q$, 'registered/10/10300/مشغّل');
select pg_temp.eq('A created event logged', $q$select count(*)::text from public.maint_order_events where event='created'$q$, '1');
select pg_temp.t('A assign (not manager)', $q$select public.maint_assign((select id from public.maint_orders where source='app'),'a0000000-0000-0000-0000-00000000000b')$q$, false);
select pg_temp.t('A advance (not assignee)', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'on_site',null)$q$, false);
select pg_temp.t('A direct event insert', $q$insert into public.maint_order_events(order_id,org_id,event) select id, org_id, 'note' from public.maint_orders where source='app'$q$, false);
commit;

-- ── M مدير: يُسند لعضوٍ فقط ─────────────────────────────────────────────────
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';
select pg_temp.t('M assign to non-member X', $q$select public.maint_assign((select id from public.maint_orders where source='app'),'a0000000-0000-0000-0000-00000000000e')$q$, false);
select pg_temp.t('M assign to T', $q$select public.maint_assign((select id from public.maint_orders where source='app'),'a0000000-0000-0000-0000-00000000000b')$q$, true);
select pg_temp.eq('assigned → stage assigned 20% with T staff', $q$select stage||'/'||progress_pct||'/'||assigned_to_staff from public.maint_orders_v where source='app'$q$, 'assigned/20/10254');
select pg_temp.eq('M directory lists org1 members only', 'select count(*)::text from public.maint_staff_directory()', '4');
commit;

-- ── T الفني المُسنَد: إلى الأمام حتى الاختبار، لا إغلاق ولا رجوع ولا إلغاء ──
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000b';
select pg_temp.t('T advance to on_site', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'on_site','arrived')$q$, true);
select pg_temp.t('T move back to assigned', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'assigned',null)$q$, false);
select pg_temp.t('T close (manager only)', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'closed',null)$q$, false);
select pg_temp.t('T hold without reason', $q$select public.maint_set_status((select id from public.maint_orders where source='app'),'on_hold',null,null)$q$, false);
select pg_temp.t('T hold with reason', $q$select public.maint_set_status((select id from public.maint_orders where source='app'),'on_hold','spare_parts','PSU')$q$, true);
select pg_temp.t('T cancel (manager only)', $q$select public.maint_set_status((select id from public.maint_orders where source='app'),'cancelled',null,null)$q$, false);
select pg_temp.t('T advance resumes from hold → testing', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'testing','replaced PSU')$q$, true);
select pg_temp.eq('resumed: open/testing/90, hold cleared', $q$select status||'/'||stage||'/'||progress_pct||'/'||coalesce(hold_reason,'-') from public.maint_orders_v where source='app'$q$, 'open/testing/90/-');
select pg_temp.t('T advance an imported order not assigned to T', $q$select public.maint_advance_stage((select id from public.maint_orders where ref='CM-0001' and org_id='00000000-0000-0000-0000-000000000001'),'repairing',null)$q$, false);
commit;

-- ── M يغلق بعد التحقق؛ والمغلق لا يتحرّك ────────────────────────────────────
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000a';
select pg_temp.t('M close', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'closed','verified')$q$, true);
select pg_temp.eq('closed → completed/100 with completed_at today', $q$select status||'/'||progress_pct||'/'||(completed_at=current_date) from public.maint_orders_v where source='app'$q$, 'completed/100/true');
select pg_temp.t('M advance a completed order', $q$select public.maint_advance_stage((select id from public.maint_orders where source='app'),'testing',null)$q$, false);
select pg_temp.t('M cancel imported on_hold', $q$select public.maint_set_status((select id from public.maint_orders where ref='CM-0001' and org_id='00000000-0000-0000-0000-000000000001'),'cancelled',null,'duplicate')$q$, true);
select pg_temp.eq('cancelled → progress null, untouched flag cleared', $q$select coalesce(progress_pct::text,'null')||'/'||imported_untouched from public.maint_orders_v v join public.maint_orders o using (id) where o.ref='CM-0001' and o.org_id='00000000-0000-0000-0000-000000000001'$q$, 'null/false');
select pg_temp.eq('events: created, assigned, 2 stage, 1 status (T) + close + cancel', 'select count(*)::text from public.maint_order_events', '7');
commit;

-- ── نقض الحارس الثاني: دور التطبيق العامّ لا يعبر المؤسسات، والمحذوف لا يكتب ──
insert into public.maint_orders (id, org_id, source, ref, source_row, site, system, status, stage, assigned_to)
values ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'cm_log', 'CM-0009', 9,
        'Reference Site 3', 'GATE', 'open', 'assigned', 'a0000000-0000-0000-0000-00000000000b');
insert into public.user_roles values ('a0000000-0000-0000-0000-00000000000e', 'manager'), ('a0000000-0000-0000-0000-00000000000d', 'manager');
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000e';
select pg_temp.t('X app-manager of org9 assigns org1 order', $q$select public.maint_assign('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000c')$q$, false);
select pg_temp.t('X app-manager of org9 advances org1 order', $q$select public.maint_advance_stage('c0000000-0000-0000-0000-000000000001','repairing',null)$q$, false);
-- الإلغاء أخيرًا: لو نجح لأغلق الأمر فحجب الحالتين قبله بـ«order is closed».
select pg_temp.t('X app-manager of org9 cancels org1 order', $q$select public.maint_set_status('c0000000-0000-0000-0000-000000000001','cancelled',null,null)$q$, false);
rollback;
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000d';
select pg_temp.t('V app-manager AND org1 member assigns (positive control)', $q$select public.maint_assign('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000c')$q$, true);
rollback;
delete from public.org_members where user_id = 'a0000000-0000-0000-0000-00000000000b';
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000b';
select pg_temp.t('T removed from org advances own assigned order', $q$select public.maint_advance_stage('c0000000-0000-0000-0000-000000000001','on_site',null)$q$, false);
select pg_temp.t('T removed from org holds own assigned order', $q$select public.maint_set_status('c0000000-0000-0000-0000-000000000001','on_hold','power',null)$q$, false);
rollback;
insert into public.org_members values ('00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000b','operator');
begin; set local role authenticated; set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-00000000000b';
select pg_temp.t('T re-added holds with reason', $q$select public.maint_set_status('c0000000-0000-0000-0000-000000000001','on_hold','power','no feed')$q$, true);
select pg_temp.eq('hold reason stored in its column, note clean', $q$select hold_reason||'|'||note from public.maint_order_events where order_id='c0000000-0000-0000-0000-000000000001' and event='status'$q$, 'power|no feed');
rollback;

-- ── الامتيازات كما ستُقاس على الإنتاج ──────────────────────────────────────
select pg_temp.eq('relacl maint_orders: authenticated=r only, no anon',
  $q$select (select string_agg(a, ',' order by a) from unnest(relacl::text[]) a where a ~ '^(anon|authenticated)=') from pg_class where oid='public.maint_orders'::regclass$q$,
  'authenticated=r/' || current_user);
select pg_temp.eq('no SECURITY DEFINER maint_* function executable by anon',
  $q$select count(*)::text from pg_proc where proname like 'maint\_%' and has_function_privilege('anon', oid, 'execute')$q$, '0');
