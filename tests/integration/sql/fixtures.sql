-- ============================================================================
-- Integration fixtures — two synthetic tenants, four synthetic users.
-- Nothing here is production data; every id is a visibly fake UUID.
--
--   ORG_A  aaaaaaaa-0000-4000-8000-00000000000a   ORG_B  bbbbbbbb-0000-4000-8000-00000000000b
--   ADMIN_A    11111111-…  org_members(A, admin)   + user_roles(admin)
--   MANAGER_A  22222222-…  org_members(A, manager) + user_roles(manager)
--   VIEWER_A   33333333-…  org_members(A, viewer)    (no platform role)
--   ADMIN_B    44444444-…  org_members(B, admin)   + user_roles(admin)
--
-- The auth.users trigger auto-joins every new user to the default org
-- 00000000-…-0001 as viewer (20260726180000). Those rows are removed below so
-- each test user has exactly ONE membership: current_org_id() then resolves
-- unambiguously, and "visible orgs" assertions stay about A and B only.
--
-- agent_definitions.'operations' and the five tool_registry rows carry the
-- PRODUCTION values (20260801183309 for the agent; the registry values are
-- the ones stated for production: sql.read {admin} no approval,
-- rag.search_verified {admin,manager,member}, rag.record_gap DISABLED,
-- sec.create_incident / sec.update_work_order {admin,manager} + approval).
-- Only org_id is re-pointed from the default org to ORG_A: both tables are
-- keyed by a global text id, and the production tenant is not seeded here.
-- ============================================================================

insert into public.organizations (id, name, slug) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'Integration Org A', 'integration-org-a'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'Integration Org B', 'integration-org-b')
on conflict (id) do nothing;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'admin-a@integration.invalid',   'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'manager-a@integration.invalid', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'viewer-a@integration.invalid',  'authenticated', 'authenticated'),
  ('44444444-4444-4444-8444-444444444444', 'admin-b@integration.invalid',   'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Drop the default-org auto-join rows for the four test users (see header).
delete from public.org_members
 where org_id = '00000000-0000-0000-0000-000000000001'
   and user_id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222',
     '33333333-3333-4333-8333-333333333333',
     '44444444-4444-4444-8444-444444444444');

insert into public.org_members (org_id, user_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'admin'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'manager'),
  ('aaaaaaaa-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'viewer'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '44444444-4444-4444-8444-444444444444', 'admin')
on conflict (org_id, user_id) do update set role = excluded.role;

insert into public.user_roles (user_id, role) values
  ('11111111-1111-4111-8111-111111111111', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'manager'),
  ('44444444-4444-4444-8444-444444444444', 'admin')
on conflict (user_id, role) do nothing;

-- ── agent_definitions: 'operations' exactly as production seeds it ──────────
insert into public.agent_definitions
  (id, name, goal, system_prompt, permissions, tool_allowlist, memory_scope, model, enabled, metadata, org_id)
values (
  'operations', 'وكيل العمليات',
  'راقب الحوادث والدوريات والتصاريح والأصول وأوامر العمل، واقترح الاستجابة التشغيلية المنضبطة.',
  'أنت وكيل العمليات ضمن مجلس FINN. اقرأ الحالة الحية بأدوات القراءة، وميّز بوضوح بين المعلومة والتوصية والإجراء. أي إنشاء حادث أو تعديل أمر عمل يظل معلقاً حتى اعتماد الإنسان.',
  array['admin','manager','member'],
  array['sql.read','rag.search_verified','rag.record_gap','sec.create_incident','sec.update_work_order'],
  'tenant', 'gemini-3.6-flash', true,
  '{"chief":"FINN","council_index":4,"domain":"industrial_security_operations","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
  'aaaaaaaa-0000-4000-8000-00000000000a'
)
on conflict (id) do update set
  name = excluded.name, goal = excluded.goal, system_prompt = excluded.system_prompt,
  permissions = excluded.permissions, tool_allowlist = excluded.tool_allowlist,
  memory_scope = excluded.memory_scope, model = excluded.model, enabled = excluded.enabled,
  metadata = excluded.metadata, org_id = excluded.org_id;

-- A second agent owned by ORG_B, only so org B can own agent_runs rows.
insert into public.agent_definitions
  (id, name, goal, system_prompt, permissions, tool_allowlist, memory_scope, model, enabled, metadata, org_id)
values (
  'integration_ops_b', 'Integration Ops B', 'Org B isolation fixture', 'fixture',
  array['admin','manager','member'], array['sql.read'], 'tenant', 'gemini-3.6-flash', true,
  '{"fixture":true}'::jsonb, 'bbbbbbbb-0000-4000-8000-00000000000b'
)
on conflict (id) do update set org_id = excluded.org_id, enabled = excluded.enabled;

-- ── tool_registry: production values for the five tools 'operations' may call ─
insert into public.tool_registry (id, category, name, description, schema_json, permissions, requires_approval, enabled, org_id) values
  ('sql.read',            'sql',      'SQL: Read Query',                 'integration fixture', '{}'::jsonb, array['admin'],                  false, true,  'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('rag.search_verified', 'internal', 'RAG: Search Verified',            'integration fixture', '{}'::jsonb, array['admin','manager','member'], false, true,  'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('rag.record_gap',      'internal', 'RAG: Record Gap',                 'integration fixture', '{}'::jsonb, array['admin','manager','member'], false, false, 'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('sec.create_incident', 'internal', 'Security: Create Incident',       'integration fixture', '{}'::jsonb, array['admin','manager'],          true,  true,  'aaaaaaaa-0000-4000-8000-00000000000a'),
  ('sec.update_work_order','internal','Operations: Update Work Order',   'integration fixture', '{}'::jsonb, array['admin','manager'],          true,  true,  'aaaaaaaa-0000-4000-8000-00000000000a')
on conflict (id) do update set
  permissions = excluded.permissions,
  requires_approval = excluded.requires_approval,
  enabled = excluded.enabled,
  org_id = excluded.org_id,
  metadata = case when excluded.enabled then '{}'::jsonb else public.tool_registry.metadata end;

-- ── sec_incidents: two rows per tenant; refs are the isolation probe ────────
insert into public.sec_incidents (org_id, ref, category, title_ar, title_en, severity, status, reported_at) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'INT-A-1', 'fixture', 'بلاغ أ ١', 'fixture A one', 'low',  'open', now()),
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'INT-A-2', 'fixture', 'بلاغ أ ٢', 'fixture A two', 'high', 'open', now()),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'INT-B-1', 'fixture', 'بلاغ ب ١', 'fixture B one', 'low',  'open', now()),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'INT-B-2', 'fixture', 'بلاغ ب ٢', 'fixture B two', 'high', 'open', now());

-- ── an org-B agent run, so cross-tenant reads have something to NOT see ─────
insert into public.agent_runs (id, agent_id, triggered_by, org_id, status, summary, started_at, finished_at)
values ('bbbbbbbb-0000-4000-8000-0000000000b1', 'integration_ops_b',
        '44444444-4444-4444-8444-444444444444', 'bbbbbbbb-0000-4000-8000-00000000000b',
        'succeeded', 'org B fixture run', now() - interval '1 hour', now() - interval '59 minutes')
on conflict (id) do nothing;
