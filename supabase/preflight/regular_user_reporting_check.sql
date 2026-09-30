-- ═══════════════════════════════════════════════════════════════════════════
-- فحص «المستخدم العادي يسجّل البلاغات» — ترحيل `20260929210000` تحت هجوم.
--
-- ⚠ **يهدم المخطّطين `public` و`auth` ويبنيهما** محاكاةً لما قِيس على الإنتاج
-- ٢٠٢٦/٠٩/٢٩ (الدوالّ والسياسات من `pg_policies`، والأعمدة من
-- `information_schema`). لذلك **يرفض العمل إلا على قاعدةٍ اسمها
-- `sadeed_rls_harness`** — لا يُشغَّل على الإنتاج ولا على قاعدة تطوير.
--
-- التشغيل (Postgres حقيقي، UTF8):
--   createdb sadeed_rls_harness
--   psql -d sadeed_rls_harness -f supabase/preflight/regular_user_reporting_check.sql
-- كل سطر «PASS/FAIL» ناتجُ محاولةٍ تحت `set local role authenticated|anon` —
-- الفحص بصلاحية superuser يمرّ دائمًا ولا يُثبت شيئًا (قاعدة CLAUDE.md).
--
-- **رُئي يحمرّ (المادة ٣٠):** على نسخة الترحيل الأولى مرّت ١٢ هجمة (تزوير
-- المراجعة والاعتماد والإغلاق وزمن الاستجابة، وحدثٌ مزوّر على بلاغ غيرك).
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'sadeed_rls_harness' then
    raise exception 'refusing to run on database %: this check rebuilds schemas', current_database();
  end if;
end $$;
-- محاكاة الإنتاج كما قِيس ٢٠٢٦/٠٩/٢٩ (الدوالّ والسياسات من pg_proc/pg_policies)
drop schema if exists auth cascade; drop schema if exists public cascade; create schema public; create schema auth;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema public, auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create type public.app_role as enum ('admin','manager','member');
create type public.org_role as enum ('owner','admin','manager','operator','viewer');
create table public.org_members (org_id uuid, user_id uuid, role public.org_role, unique(org_id,user_id));
create table public.user_roles (user_id uuid, role public.app_role);
create function public.is_org_member(_org uuid, _min_role public.org_role default 'viewer') returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.org_members m where m.org_id=_org and m.user_id=auth.uid() and case _min_role
   when 'viewer' then m.role in ('viewer','operator','manager','admin','owner') when 'operator' then m.role in ('operator','manager','admin','owner')
   when 'manager' then m.role in ('manager','admin','owner') when 'admin' then m.role in ('admin','owner') when 'owner' then m.role='owner' end) $$;
create function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create function public.current_org_id() returns uuid language sql stable security definer set search_path to 'public' as $$ select org_id from public.org_members where user_id=auth.uid() limit 1 $$;
create table public.sec_activity_events (id uuid default gen_random_uuid() not null primary key, entity_type text not null, entity_id uuid not null, entity_ref text, event text not null, actor_id uuid, actor_name text, payload jsonb default '{}'::jsonb not null, occurred_at timestamp with time zone default now() not null, org_id uuid default public.current_org_id() not null);
create table public.sec_incidents (id uuid default gen_random_uuid() not null primary key, ref text not null, site_id uuid, category text not null, title_ar text not null, title_en text not null, severity text not null, status text default 'open'::text not null, owner text, reported_at timestamp with time zone default now() not null, resolved_at timestamp with time zone, response_minutes integer, root_cause text, ai_summary text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, priority text default 'medium'::text not null, assigned_to text, corrective_actions jsonb default '[]'::jsonb not null, attachments jsonb default '[]'::jsonb not null, escalated boolean default false not null, ai_risk_score integer, created_by uuid, org_id uuid default public.current_org_id() not null, executive_review text, executive_reviewed_by uuid, executive_reviewed_at timestamp with time zone, aria_auto_analyzed boolean default false not null, attachments_count integer default 0 not null);
create table public.sec_permits (id uuid default gen_random_uuid() not null primary key, ref text not null, site_id uuid, work_type text not null, contractor text not null, risk_level text default 'medium'::text not null, status text default 'pending'::text not null, starts_at timestamp with time zone not null, ends_at timestamp with time zone not null, approver text, notes text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, approved_by uuid, approved_at timestamp with time zone, attachments jsonb default '[]'::jsonb not null, created_by uuid, org_id uuid default public.current_org_id() not null);
create table public.sec_work_orders (id uuid default gen_random_uuid() not null primary key, ref text not null, site_id uuid, building_id uuid, asset_kind text not null, asset_code text, kind text not null, title_ar text not null, title_en text not null, priority text default 'medium'::text not null, status text default 'open'::text not null, assigned_to text, contractor text, opened_at timestamp with time zone default now() not null, due_at timestamp with time zone, closed_at timestamp with time zone, notes text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, source_incident_id uuid, approved_by uuid, approved_at timestamp with time zone, attachments jsonb default '[]'::jsonb not null, completion_notes text, created_by uuid, org_id uuid default public.current_org_id() not null);
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
do $$ declare t text; begin foreach t in array array['sec_incidents','sec_work_orders','sec_permits','sec_activity_events'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy tenant_isolation_%1$s on public.%1$I as restrictive for all to authenticated using (public.is_org_member(org_id,''viewer'')) with check (public.is_org_member(org_id,''operator''))', t);
end loop; end $$;
create policy sec_incidents_admin_write on public.sec_incidents for all to authenticated using (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'operator')) with check (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'operator'));
create policy sec_incidents_select_member on public.sec_incidents for select to authenticated using (public.is_org_member(org_id,'viewer'));
create policy sec_work_orders_admin_write on public.sec_work_orders for all to authenticated using (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'viewer')) with check (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'operator'));
create policy sec_work_orders_select_admin on public.sec_work_orders for select to authenticated using (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'viewer'));
create policy sec_permits_admin_write on public.sec_permits for all to authenticated using (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'viewer')) with check (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'operator'));
create policy sec_permits_select_admin on public.sec_permits for select to authenticated using (public.has_role(auth.uid(),'admin') and public.is_org_member(org_id,'viewer'));
create policy sec_activity_events_insert_admin on public.sec_activity_events for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy sec_activity_events_select_admin on public.sec_activity_events for select to authenticated using (public.has_role(auth.uid(),'admin'));
-- المؤسستان والمستخدمون: مشغّل A، مشاهد V، مشغّل من مؤسسة أخرى X
insert into public.org_members values
 ('00000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','operator'),
 ('00000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','viewer'),
 ('00000000-0000-0000-0000-000000000009','cccccccc-0000-0000-0000-000000000003','operator');

\ir ../migrations/20260929210000_regular_user_reporting.sql
\ir ../migrations/20260929210000_regular_user_reporting.sql
-- (مرّتين: idempotent)
\set ON_ERROR_STOP off
create or replace function pg_temp.t(label text, sql text, expect_ok boolean) returns void language plpgsql as $$
declare ok boolean := true; err text; begin
  begin execute sql; exception when others then ok := false; err := sqlerrm; end;
  raise notice '% %  (%)', case when ok = expect_ok then 'PASS' else 'FAIL' end, label, case when ok then 'allowed' else 'denied' end;
end $$;
-- A (operator) — المسار المشروع كما يكتبه الخادم
begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.t('A legit incident', $q$insert into public.sec_incidents(id,ref,category,title_ar,title_en,severity,priority,status,reported_at,ai_risk_score,created_by) values ('11111111-1111-1111-1111-111111111111','INC-1','intrusion','t','t','medium','medium','open',now(),40,'aaaaaaaa-0000-0000-0000-000000000001')$q$, true);
select pg_temp.t('A legit registered event on own incident (with location)', $q$insert into public.sec_activity_events(entity_type,entity_id,entity_ref,event,actor_id,actor_name,payload) values ('incident','11111111-1111-1111-1111-111111111111','INC-1','registered','aaaaaaaa-0000-0000-0000-000000000001','A','{"location":{"lat":24.7,"lng":46.6}}')$q$, true);
select pg_temp.t('A duplicate registered event', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id) values ('incident','11111111-1111-1111-1111-111111111111','registered','aaaaaaaa-0000-0000-0000-000000000001')$q$, false);
select pg_temp.t('A legit work order', $q$insert into public.sec_work_orders(id,ref,asset_kind,kind,title_ar,title_en,status,created_by) values ('22222222-2222-2222-2222-222222222222','WO-1','ac','corrective','w','w','open','aaaaaaaa-0000-0000-0000-000000000001')$q$, true);
select pg_temp.t('A legit created event on own WO', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id) values ('work_order','22222222-2222-2222-2222-222222222222','created','aaaaaaaa-0000-0000-0000-000000000001')$q$, true);
select pg_temp.t('A legit permit', $q$insert into public.sec_permits(id,ref,work_type,contractor,status,starts_at,ends_at,created_by) values ('33333333-3333-3333-3333-333333333333','PTW-1','hot','c','pending',now(),now()+interval '1 day','aaaaaaaa-0000-0000-0000-000000000001')$q$, true);
select pg_temp.t('A legit submitted event on own permit', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id) values ('permit','33333333-3333-3333-3333-333333333333','submitted','aaaaaaaa-0000-0000-0000-000000000001')$q$, true);
-- هجمات الحارس: تزوير الحقول المحجوزة
select pg_temp.t('ATK incident with executive review', $q$insert into public.sec_incidents(ref,category,title_ar,title_en,severity,status,created_by,executive_review,executive_reviewed_by,executive_reviewed_at) values ('X','c','t','t','low','open','aaaaaaaa-0000-0000-0000-000000000001','ok','aaaaaaaa-0000-0000-0000-000000000001',now())$q$, false);
select pg_temp.t('ATK incident with resolved_at+response_minutes', $q$insert into public.sec_incidents(ref,category,title_ar,title_en,severity,status,created_by,resolved_at,response_minutes) values ('X','c','t','t','low','open','aaaaaaaa-0000-0000-0000-000000000001',now(),1)$q$, false);
select pg_temp.t('ATK incident ai_summary/escalated/analyzed', $q$insert into public.sec_incidents(ref,category,title_ar,title_en,severity,status,created_by,ai_summary,escalated,aria_auto_analyzed) values ('X','c','t','t','low','open','aaaaaaaa-0000-0000-0000-000000000001','fake',true,true)$q$, false);
select pg_temp.t('ATK incident corrective_actions/root_cause', $q$insert into public.sec_incidents(ref,category,title_ar,title_en,severity,status,created_by,root_cause,corrective_actions) values ('X','c','t','t','low','open','aaaaaaaa-0000-0000-0000-000000000001','rc','[{"a":1}]')$q$, false);
select pg_temp.t('ATK incident backdated reported_at', $q$insert into public.sec_incidents(ref,category,title_ar,title_en,severity,status,created_by,reported_at) values ('X','c','t','t','low','open','aaaaaaaa-0000-0000-0000-000000000001',now()-interval '30 days')$q$, false);
select pg_temp.t('ATK permit pre-signed', $q$insert into public.sec_permits(ref,work_type,contractor,status,starts_at,ends_at,created_by,approved_by,approved_at,approver) values ('P','hot','c','pending',now(),now(),'aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',now(),'مدير الأمن')$q$, false);
select pg_temp.t('ATK work order closed_at+completion_notes', $q$insert into public.sec_work_orders(ref,asset_kind,kind,title_ar,title_en,status,created_by,closed_at,completion_notes) values ('W','ac','c','w','w','open','aaaaaaaa-0000-0000-0000-000000000001',now(),'done')$q$, false);
select pg_temp.t('ATK work order approved_by', $q$insert into public.sec_work_orders(ref,asset_kind,kind,title_ar,title_en,status,created_by,approved_by,approved_at) values ('W','ac','c','w','w','open','aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',now())$q$, false);
commit;
-- D (مشغّل ثانٍ في المؤسسة نفسها) يهاجم بلاغ A
insert into public.org_members values ('00000000-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-00000000000d','operator') on conflict do nothing;
begin; set local role authenticated; set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-00000000000d';
select pg_temp.t('ATK D registered event on A incident with fake location', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id,actor_name,payload) values ('incident','11111111-1111-1111-1111-111111111111','registered','dddddddd-0000-0000-0000-00000000000d','مدير الأمن','{"location":{"lat":1,"lng":1}}')$q$, false);
select pg_temp.t('ATK D event on nonexistent entity', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id) values ('incident','99999999-9999-9999-9999-999999999999','registered','dddddddd-0000-0000-0000-00000000000d')$q$, false);
select pg_temp.t('ATK D event future occurred_at on own (none)', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id,occurred_at) values ('incident','11111111-1111-1111-1111-111111111111','registered','dddddddd-0000-0000-0000-00000000000d',now()+interval '1 day')$q$, false);
select pg_temp.t('ATK D created event on A work order', $q$insert into public.sec_activity_events(entity_type,entity_id,event,actor_id) values ('work_order','22222222-2222-2222-2222-222222222222','created','dddddddd-0000-0000-0000-00000000000d')$q$, false);
commit;
-- المشاهد V، والزائر، ومؤسسة أخرى X
begin; set local role authenticated; set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.t('V viewer incident', $q$insert into public.sec_incidents(ref,category,title_ar,title_en,severity,status,created_by) values ('V','c','t','t','low','open','bbbbbbbb-0000-0000-0000-000000000002')$q$, false);
select 'V sees A WOs = ' || count(*) from public.sec_work_orders;
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
select pg_temp.t('X other-org incident into org 1', $q$insert into public.sec_incidents(org_id,ref,category,title_ar,title_en,severity,status,created_by) values ('00000000-0000-0000-0000-000000000001','X','c','t','t','low','open','cccccccc-0000-0000-0000-000000000003')$q$, false);
select 'X sees A incidents = ' || count(*) from public.sec_incidents;
commit;
begin; set local role anon;
select pg_temp.t('anon incident', $q$insert into public.sec_incidents(org_id,ref,category,title_ar,title_en,severity,status) values ('00000000-0000-0000-0000-000000000001','Z','c','t','t','low','open')$q$, false);
select pg_temp.t('anon read staff_accounts', $q$select * from public.staff_accounts$q$, false);
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select 'A sees own WOs = ' || count(*) || ' · own permits = ' || (select count(*) from public.sec_permits) from public.sec_work_orders;
commit;
insert into auth.users values ('eeeeeeee-0000-0000-0000-00000000000e','s1@x.com','{"staff_number":"10254","role":"admin"}');
insert into auth.users values ('ffffffff-0000-0000-0000-00000000000f','s2@x.com','{"staff_number":"10254"}');
select 'users=' || (select count(*) from auth.users) || ' staff_rows=' || count(*) || ' user_roles=' || (select count(*) from public.user_roles) from public.staff_accounts;
