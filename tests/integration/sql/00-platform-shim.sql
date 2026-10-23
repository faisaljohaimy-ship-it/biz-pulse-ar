-- ============================================================================
-- Supabase platform shim for a plain Postgres 16 cluster — integration tier.
--
-- The migrations under supabase/migrations assume the Supabase platform:
-- the roles anon/authenticated/service_role/authenticator, the `auth`
-- schema with auth.uid()/role()/jwt()/email(), storage/realtime, and the
-- extensions pg_cron / pg_net / supabase_vault / pgmq / vector. None of
-- that exists on a stock Postgres. This file recreates exactly enough of it
-- for the WHOLE forward chain to apply (181/194 files; the 13 known
-- failures are listed in ../expected-migration-failures.txt).
--
-- What is faithful: roles and their nologin/noinherit/bypassrls flags, the
-- `request.jwt.claims` GUC convention (PostgREST 12 sets it; the auth.*
-- helpers read it), storage/realtime tables with RLS enabled.
--
-- What is an inert stand-in (and must never be read as the real thing):
--   * cron.*  — rows are stored, nothing is scheduled.
--   * net.http_post — returns 0, no network.
--   * vault.* — plaintext table, no encryption.
--   * pgmq.*  — no queue; read() returns nothing.
--   * vector  — a varlena type with text I/O whose distance operators
--     return 0. DDL parses; semantic search results are meaningless.
--
-- Default privileges: the Supabase platform grants ALL on new public
-- objects to anon/authenticated/service_role. This is reproduced below so
-- that the explicit REVOKEs in the migrations (e.g. 20260625234437) mean
-- what they mean on the platform. It is an assumption about the platform,
-- not something measured on production (CLAUDE.md: migrations are not the
-- source of truth for production grants).
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then
    create role authenticator login noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname='supabase_realtime_admin') then
    create role supabase_realtime_admin nologin;
  end if;
end $$;
grant anon, authenticated, service_role to authenticator;

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists realtime;
create schema if not exists cron;
create schema if not exists net;
create schema if not exists vault;
create schema if not exists pgmq;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

grant usage on schema public, extensions, auth, storage, realtime to anon, authenticated, service_role;
grant all on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ── auth ────────────────────────────────────────────────────────────────────
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid,
  aud text,
  role text,
  email text,
  phone text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create or replace function auth.email() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
$$;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- ── storage / realtime ──────────────────────────────────────────────────────
create table if not exists storage.buckets (
  id text primary key, name text not null, owner uuid, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[],
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text, owner uuid, owner_id text, metadata jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'),1)-1,0)]
$$;

create table if not exists realtime.messages (
  id bigserial primary key, topic text, extension text, payload jsonb, event text,
  private boolean default false, inserted_at timestamptz default now(), updated_at timestamptz default now()
);
alter table realtime.messages enable row level security;
create or replace function realtime.topic() returns text language sql stable as $$
  select current_setting('realtime.topic', true)
$$;
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- ── pg_cron / pg_net / vault / pgmq — inert ─────────────────────────────────
create table if not exists cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job(jobname, schedule, command) values ($1,$2,$3)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid
$$;
create or replace function cron.unschedule(job_name text) returns boolean language sql as $$
  with d as (delete from cron.job where jobname = $1 returning 1) select exists(select 1 from d)
$$;
create or replace function cron.unschedule(job_id bigint) returns boolean language sql as $$
  with d as (delete from cron.job where jobid = $1 returning 1) select exists(select 1 from d)
$$;
create or replace function net.http_post(
  url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds int default 5000
) returns bigint language sql as $$ select 0::bigint $$;

create table if not exists vault.secrets (
  id uuid primary key default gen_random_uuid(), name text unique, secret text, description text
);
create or replace view vault.decrypted_secrets as
  select id, name, secret as decrypted_secret, description from vault.secrets;
create or replace function vault.create_secret(new_secret text, new_name text default null, new_description text default '')
  returns uuid language sql as $$ insert into vault.secrets(name, secret, description) values ($2,$1,$3) returning id $$;
create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null)
  returns void language sql as $$ update vault.secrets set secret = coalesce($2, secret) where id = $1 $$;

create or replace function pgmq.create(queue_name text) returns void language sql as $$ select $$;
create or replace function pgmq.send(queue_name text, msg jsonb, delay int default 0) returns setof bigint language sql as $$ select 0::bigint $$;
create or replace function pgmq.read(queue_name text, vt int, qty int)
  returns table(msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb)
  language sql as $$ select null::bigint, null::int, null::timestamptz, null::timestamptz, null::jsonb where false $$;
create or replace function pgmq.delete(queue_name text, msg_id bigint) returns boolean language sql as $$ select true $$;
create or replace function pgmq.archive(queue_name text, msg_id bigint) returns boolean language sql as $$ select true $$;

-- ── pgvector stand-in (DDL only) — in public AND extensions ─────────────────
-- Migrations reference both `vector` (public, early chain) and
-- `extensions.vector` (RAG chain). Both resolve; neither computes a distance.
create type public.vector;
create function public.vector_in(cstring, oid, integer) returns public.vector language internal immutable strict as 'textin';
create function public.vector_out(public.vector) returns cstring language internal immutable strict as 'textout';
create type public.vector (
  input = public.vector_in, output = public.vector_out,
  typmod_in = varchartypmodin, typmod_out = varchartypmodout,
  internallength = variable, storage = extended
);
create function public.vector_cosine_distance(public.vector, public.vector) returns float8 language sql immutable as 'select 0::float8';
create operator public.<=> (leftarg = public.vector, rightarg = public.vector, function = public.vector_cosine_distance);
create function public.vector_l2_distance(public.vector, public.vector) returns float8 language sql immutable as 'select 0::float8';
create operator public.<-> (leftarg = public.vector, rightarg = public.vector, function = public.vector_l2_distance);
create function public.vector_ip(public.vector, public.vector) returns float8 language sql immutable as 'select 0::float8';
create operator public.<#> (leftarg = public.vector, rightarg = public.vector, function = public.vector_ip);

create type extensions.vector;
create function extensions.vector_in(cstring, oid, integer) returns extensions.vector language internal immutable strict as 'textin';
create function extensions.vector_out(extensions.vector) returns cstring language internal immutable strict as 'textout';
create type extensions.vector (
  input = extensions.vector_in, output = extensions.vector_out,
  typmod_in = varchartypmodin, typmod_out = varchartypmodout,
  internallength = variable, storage = extended
);
create function extensions.vector_cosine_distance(extensions.vector, extensions.vector) returns float8 language sql immutable as 'select 0::float8';
create operator extensions.<=> (leftarg = extensions.vector, rightarg = extensions.vector, function = extensions.vector_cosine_distance);
create function extensions.vector_l2_distance(extensions.vector, extensions.vector) returns float8 language sql immutable as 'select 0::float8';
create operator extensions.<-> (leftarg = extensions.vector, rightarg = extensions.vector, function = extensions.vector_l2_distance);
create function extensions.vector_ip(extensions.vector, extensions.vector) returns float8 language sql immutable as 'select 0::float8';
create operator extensions.<#> (leftarg = extensions.vector, rightarg = extensions.vector, function = extensions.vector_ip);
