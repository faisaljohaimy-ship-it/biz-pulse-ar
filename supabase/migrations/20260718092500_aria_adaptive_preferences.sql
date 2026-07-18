-- ARIA bounded adaptive preferences.
-- Stores fixed presentation enums only; never actions, recipients, secrets,
-- authorization changes, retrieved instructions, or executable content.

begin;

create table if not exists public.aria_adaptive_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null,
  preference_value text not null,
  confidence real not null default 0.95 check (confidence between 0 and 1),
  evidence_count integer not null default 1 check (evidence_count between 1 and 1000000),
  safety_passed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aria_adaptive_preferences_allowed_values check (
    (preference_key = 'response_length' and preference_value in ('concise', 'detailed'))
    or (preference_key = 'response_language' and preference_value in ('ar', 'en'))
    or (preference_key = 'response_format' and preference_value in ('bullets', 'no_tables'))
  )
);

create unique index if not exists aria_adaptive_preferences_user_key_uidx
  on public.aria_adaptive_preferences (user_id, preference_key);

alter table public.aria_adaptive_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aria_adaptive_preferences'
      and policyname = 'aria_adaptive_preferences_select_own'
  ) then
    create policy aria_adaptive_preferences_select_own
      on public.aria_adaptive_preferences for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aria_adaptive_preferences'
      and policyname = 'aria_adaptive_preferences_insert_own'
  ) then
    create policy aria_adaptive_preferences_insert_own
      on public.aria_adaptive_preferences for insert
      to authenticated
      with check (auth.uid() = user_id and safety_passed = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aria_adaptive_preferences'
      and policyname = 'aria_adaptive_preferences_update_own'
  ) then
    create policy aria_adaptive_preferences_update_own
      on public.aria_adaptive_preferences for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id and safety_passed = true);
  end if;
end
$$;

revoke all on table public.aria_adaptive_preferences from anon;
grant select, insert, update on table public.aria_adaptive_preferences to authenticated;

commit;
