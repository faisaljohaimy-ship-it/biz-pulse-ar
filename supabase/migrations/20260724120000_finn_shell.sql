-- NEXIOS FINN Shell — shell-layer tables (idempotent).
-- The shell writes ONLY here; it never touches core (aria_*, sec_*) tables.
-- RLS reuses the repo's existing mechanisms: is_org_member(org_id, org_role)
-- for tenant isolation and has_role(auth.uid(), app_role) for admin writes.
-- Write-only migration — do NOT run `supabase db push`/`db reset` from here.

-- Global capability catalog (identical for every org — reference data, no PII).
create table if not exists public.shell_capabilities (
  id text primary key,
  kind text not null check (kind in ('skill','agent','tool')),
  name_ar text not null,
  description text not null,
  triggers text[] not null default '{}',
  required_role text not null default 'employee',
  runtime_mode text not null default 'advisory_only',
  version text not null default '1.0.0',
  status text not null default 'active' check (status in ('active','shadow','retired')),
  owner text,
  created_at timestamptz not null default now()
);

-- Per-execution telemetry — TENANT-SCOPED (carries org, region, role).
create table if not exists public.shell_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  capability_id text references public.shell_capabilities(id),
  task_hash text not null,
  selected_rank int,
  latency_ms int,
  outcome text check (outcome in ('success','partial','fail')),
  human_rating int check (human_rating between 1 and 5),
  user_role text,
  region text,
  is_simulation boolean not null default true,
  created_at timestamptz not null default now()
);

-- Global bounded tuning parameters (system/human changed only).
create table if not exists public.shell_params (
  key text primary key,
  value_num numeric not null,
  min_num numeric not null,
  max_num numeric not null,
  default_num numeric not null,
  last_changed_by text not null default 'human' check (last_changed_by in ('system','human')),
  changed_at timestamptz not null default now(),
  constraint shell_params_within_bounds check (value_num between min_num and max_num)
);

-- Global adaptation proposals (approved by an admin only).
create table if not exists public.shell_proposals (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  rationale text not null,
  expected_impact text,
  risk text,
  evidence_run_ids uuid[] default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_by text,
  decided_at timestamptz
);

-- Global CI eval artifacts.
create table if not exists public.eval_results (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  passed boolean not null,
  score numeric,
  latency_ms int,
  commit_sha text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shell_runs_org on public.shell_runs(org_id, created_at desc);
create index if not exists idx_shell_runs_cap on public.shell_runs(capability_id, created_at desc);
create index if not exists idx_eval_results_commit on public.eval_results(commit_sha);

alter table public.shell_capabilities enable row level security;
alter table public.shell_runs        enable row level security;
alter table public.shell_params      enable row level security;
alter table public.shell_proposals   enable row level security;
alter table public.eval_results      enable row level security;

-- shell_runs: TENANT ISOLATION — read as an org viewer, write as an org operator.
do $$ begin
  create policy shell_runs_tenant_read on public.shell_runs
    for select to authenticated using (public.is_org_member(org_id, 'viewer'::org_role));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shell_runs_tenant_write on public.shell_runs
    for insert to authenticated with check (public.is_org_member(org_id, 'operator'::org_role));
exception when duplicate_object then null; end $$;

-- Global reference/tuning/CI tables: authenticated read; writes locked to admin.
do $$ begin
  create policy shell_cap_read on public.shell_capabilities
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy shell_cap_admin_write on public.shell_capabilities
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::app_role))
    with check (public.has_role(auth.uid(), 'admin'::app_role));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy shell_params_read on public.shell_params
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy shell_params_admin_write on public.shell_params
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::app_role))
    with check (public.has_role(auth.uid(), 'admin'::app_role));
exception when duplicate_object then null; end $$;

-- Proposals: authenticated read; ONLY an admin may create/approve (fixes the
-- Phase-0 finding where the approval path was left open).
do $$ begin
  create policy shell_proposals_read on public.shell_proposals
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy shell_proposals_admin_write on public.shell_proposals
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::app_role))
    with check (public.has_role(auth.uid(), 'admin'::app_role));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy eval_results_read on public.eval_results
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy eval_results_admin_write on public.eval_results
    for all to authenticated
    using (public.has_role(auth.uid(), 'admin'::app_role))
    with check (public.has_role(auth.uid(), 'admin'::app_role));
exception when duplicate_object then null; end $$;

insert into public.shell_params (key, value_num, min_num, max_num, default_num) values
  ('selection.topK', 3, 1, 5, 3),
  ('selection.confidenceThreshold', 0.62, 0.50, 0.85, 0.62),
  ('response.maxTokens', 900, 300, 1600, 900)
on conflict (key) do nothing;
