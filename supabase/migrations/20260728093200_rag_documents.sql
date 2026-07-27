-- ============================================================================
-- RAG LAYER (3/4) — rag_documents (source-level records)
--
-- STAGED, NOT APPLIED. One row per ingested source document (an SEC/SAF/PTW
-- directive, a policy, etc.). Row-level isolation by org_id from THIS first
-- migration, built on the platform's EXISTING helpers — nothing reinvented:
--   • current_org_id()  → default org on insert (JWT app_metadata.current_org,
--                          else the caller's single membership).
--   • is_org_member(org, 'viewer'|'admin') → read / write gate.
-- Authenticated + org-isolated ONLY (no anon grant) — same posture as
-- aria_knowledge (constitution: knowledge is behind auth exclusively).
--
-- UNIQUE (id, org_id) exists so rag_chunks can carry a COMPOSITE FK that
-- guarantees a chunk's org_id always equals its document's — isolation cannot
-- drift across the two tables.
-- Idempotent; adds only.
-- ============================================================================

set local search_path = public, extensions;

create table if not exists public.rag_documents (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default public.current_org_id()
                   references public.organizations(id) on delete cascade,
  doc_type       text not null default 'sec'
                   check (doc_type in ('sec', 'saf', 'ptw', 'general')),
  code           text,                                   -- SEC-18, a PTW code… (nullable)
  title          text not null,
  source         text not null,                          -- provenance label (hcis.gov.sa, internal ref)
  lang           text not null default 'ar' check (lang in ('ar', 'en')),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  is_simulation  boolean not null default false,         -- showcase rows carry the badge
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, org_id)                                    -- target of the chunks composite FK
);

create index if not exists rag_documents_org_idx  on public.rag_documents (org_id);
create index if not exists rag_documents_code_idx on public.rag_documents (org_id, code);

alter table public.rag_documents enable row level security;

drop policy if exists rag_documents_member_read on public.rag_documents;
create policy rag_documents_member_read on public.rag_documents
  for select to authenticated
  using (public.is_org_member(org_id, 'viewer'));

drop policy if exists rag_documents_admin_write on public.rag_documents;
create policy rag_documents_admin_write on public.rag_documents
  for all to authenticated
  using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));

grant select on public.rag_documents to authenticated;
grant all    on public.rag_documents to service_role;
-- NOTE: intentionally NO grant to anon — RAG is authenticated + org-isolated.

drop trigger if exists rag_documents_updated on public.rag_documents;
create trigger rag_documents_updated
  before update on public.rag_documents
  for each row execute function public.update_updated_at_column();
