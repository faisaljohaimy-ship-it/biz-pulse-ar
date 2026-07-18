-- ARIA outbound messaging ledger for Resend/Outlook/Twilio dispatch.
-- Provider credentials remain server-side. Browser roles have no direct
-- access; the authenticated server functions enforce role and approval rules.

begin;

create table if not exists public.aria_outbound_messages (
  id                  uuid primary key,
  org_id              uuid not null,
  actor_id            uuid not null,
  channel             text not null check (channel in ('email', 'sms')),
  recipient_hint      text not null,
  content_hash        text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  payload_ciphertext  text,
  payload_iv          text,
  idempotency_key     text not null unique,
  status              text not null default 'pending_approval'
                      check (status in (
                        'pending_approval', 'dispatching', 'accepted',
                        'delivered', 'failed', 'cancelled', 'expired', 'unknown'
                      )),
  approval_expires_at timestamptz not null,
  approved_by         uuid,
  approved_at         timestamptz,
  provider            text,
  provider_message_id text,
  provider_status     text,
  dispatched_at       timestamptz,
  delivered_at        timestamptz,
  failure_code        text,
  failure_detail      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (
    (payload_ciphertext is null and payload_iv is null)
    or (payload_ciphertext is not null and payload_iv is not null)
  )
);

create table if not exists public.aria_outbound_message_events (
  id                 uuid primary key default gen_random_uuid(),
  message_id         uuid not null references public.aria_outbound_messages(id) on delete cascade,
  org_id             uuid not null,
  provider           text not null,
  provider_event_id  text not null,
  event_type         text not null,
  delivery_status    text,
  payload_hash       text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  occurred_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists aria_outbound_actor_created_idx
  on public.aria_outbound_messages (actor_id, created_at desc);
create index if not exists aria_outbound_org_status_idx
  on public.aria_outbound_messages (org_id, status, created_at desc);
create unique index if not exists aria_outbound_provider_message_uidx
  on public.aria_outbound_messages (provider, provider_message_id)
  where provider is not null and provider_message_id is not null;
create index if not exists aria_outbound_events_message_idx
  on public.aria_outbound_message_events (message_id, created_at);

alter table public.aria_outbound_messages enable row level security;
alter table public.aria_outbound_message_events enable row level security;

-- RLS without a browser policy deliberately fails closed. All operations in
-- this bundle run after authentication/authorization through supabaseAdmin.
-- Do not rewrite pre-existing grants here: the read-only compatibility check
-- must pass before this migration is applied to an existing NEXIOS schema.

comment on table public.aria_outbound_messages is
  'Encrypted, one-time-claim ARIA outbound message ledger. Provider payloads must be purged according to retention policy.';
comment on table public.aria_outbound_message_events is
  'Append-only audit and provider delivery events for ARIA outbound messages.';

commit;
