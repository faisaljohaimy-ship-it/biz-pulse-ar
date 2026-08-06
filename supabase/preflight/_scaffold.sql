-- ============================================================================
-- سقالة العنقود المؤقّت — مشتركة بين فحوص ما قبل التطبيق وقياس الاسترجاع.
-- استُخرجت من `rag_layer_check.sql` لتُقرأ من موضع واحد: نسختان من سقالة
-- واحدة تفترقان بصمت، فيقيس أحد الملفّين شيئًا ويفحص الآخر غيره.
-- ============================================================================

-- أدوار Supabase التي تفترضها ملفات الترحيل — العنقود المؤقّت لا يعرفها.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists extensions;
create schema if not exists auth;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Faithful stubs of the EXISTING platform objects the migrations depend on ──
create type public.org_role as enum ('owner', 'admin', 'manager', 'operator', 'viewer');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.org_role not null default 'operator',
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- auth.uid() reads the JWT sub GUC, exactly like Supabase (null for a guest).
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

-- Verbatim copies of the real helpers (same bodies recon'd from the migrations).
create function public.current_org_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,current_org}', '')::uuid,
    (select org_id from public.org_members where user_id = auth.uid() order by joined_at limit 1)
  );
$$;

create function public.is_org_member(_org uuid, _min_role public.org_role default 'viewer')
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = _org and m.user_id = auth.uid()
      and case _min_role
        when 'viewer'   then m.role in ('viewer','operator','manager','admin','owner')
        when 'operator' then m.role in ('operator','manager','admin','owner')
        when 'manager'  then m.role in ('manager','admin','owner')
        when 'admin'    then m.role in ('admin','owner')
        when 'owner'    then m.role = 'owner'
      end
  );
$$;

create function public.update_updated_at_column() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

grant usage on schema public, extensions to authenticated;

-- ── Include the REAL migrations under test ────────────────────────────────
