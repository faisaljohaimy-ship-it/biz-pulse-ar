-- FINN production convergence: native Gemini 3.6, one Council of Ten, and a
-- tenant-scoped learning loop whose model output never bypasses verification.
-- Additive/idempotent; legacy agent rows are disabled, not deleted.

set local search_path = public, extensions;

-- ── Tenant-explicit gap capture ─────────────────────────────────────────

create or replace function public.rag_record_gap_for_org(_org_id uuid, _query text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gap_id uuid;
  clean_query text := btrim(coalesce(_query, ''));
begin
  if _org_id is null or char_length(clean_query) not between 3 and 2000 then
    raise exception 'invalid RAG gap payload';
  end if;

  if auth.role() <> 'service_role'
     and not public.is_org_member(_org_id, 'viewer'::org_role) then
    raise exception 'forbidden';
  end if;

  insert into public.rag_gaps (org_id, query)
  values (_org_id, clean_query)
  on conflict (org_id, query_norm) do update
    set hit_count = public.rag_gaps.hit_count + 1,
        last_seen_at = now(),
        resolved_at = null
  returning id into gap_id;

  return gap_id;
end;
$$;

revoke all on function public.rag_record_gap_for_org(uuid, text) from public, anon;
grant execute on function public.rag_record_gap_for_org(uuid, text)
  to authenticated, service_role;

comment on function public.rag_record_gap_for_org(uuid, text) is
  'Records a tenant-explicit missing-knowledge question. It cannot create a retrievable chunk or verified answer.';

-- ── Governed RAG tools ──────────────────────────────────────────────────

insert into public.tool_registry
  (id, category, name, description, schema_json, permissions,
   requires_approval, rollback_kind, enabled, version, metadata, org_id)
values
  (
    'rag.search_verified', 'internal', 'RAG: Search Verified Evidence',
    'Tenant-scoped hybrid retrieval using Gemini Embedding 2 and the FINN evidence gate.',
    '{"type":"object","required":["query"],"properties":{"query":{"type":"string","minLength":3,"maxLength":2000},"category_code":{"type":"string"},"limit":{"type":"integer","minimum":2,"maximum":12}}}'::jsonb,
    array['admin','manager','member'], false, 'none', true, 1,
    '{"provider":"google-gemini","embedding_model":"gemini-embedding-2","dimensions":1536,"verified_only":true}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'rag.record_gap', 'internal', 'RAG: Record Knowledge Gap',
    'Stores an unanswered question in the tenant backlog; never writes retrievable knowledge.',
    '{"type":"object","required":["query"],"properties":{"query":{"type":"string","minLength":3,"maxLength":2000}}}'::jsonb,
    array['admin','manager','member'], false, 'none', true, 1,
    '{"writes":"rag_gaps","retrieval_eligible":false}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'rag.propose_candidate', 'internal', 'RAG: Propose Candidate',
    'Stores a model-generated Q&A as unverified for administrator review. It cannot be retrieved before separate verification.',
    '{"type":"object","required":["question","answer"],"properties":{"question":{"type":"string","minLength":3,"maxLength":2000},"answer":{"type":"string","minLength":3,"maxLength":12000}}}'::jsonb,
    array['admin','manager'], false, 'none', true, 1,
    '{"writes":"rag_candidates","forced_verified":false,"review_required":true}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  )
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  schema_json = excluded.schema_json,
  permissions = excluded.permissions,
  requires_approval = excluded.requires_approval,
  rollback_kind = excluded.rollback_kind,
  enabled = excluded.enabled,
  version = excluded.version,
  metadata = excluded.metadata,
  updated_at = now();

-- Every operational mutation remains a proposal until a human approves it.
update public.tool_registry
   set requires_approval = true,
       updated_at = now()
 where id in (
   'm365.outlook.send_mail',
   'm365.teams.post_message',
   'm365.sharepoint.upload_file',
   'rest.http',
   'webhook.dispatch',
   'supabase.invoke_edge_function',
   'sec.create_incident',
   'sec.update_work_order'
 );

-- ── FINN Council of Ten ─────────────────────────────────────────────────

-- Legacy agents stay recoverable for audit/history but cannot run. The
-- canonical ten below are the only enabled agent definitions for the default
-- organisation and match src/lib/finn/orchestrator/council.ts exactly.
update public.agent_definitions
   set enabled = false,
       model = 'gemini-3.6-flash',
       updated_at = now()
 where org_id = '00000000-0000-0000-0000-000000000001'::uuid
   and id not in (
     'planning','risk','recommendation','operations','compliance',
     'analytics','briefing','simulation','reports','knowledge'
   );

insert into public.agent_definitions
  (id, name, goal, system_prompt, permissions, tool_allowlist, memory_scope,
   model, enabled, metadata, org_id)
values
  (
    'planning', 'وكيل التخطيط',
    'حوّل أهداف الأمن الصناعي إلى خطط مرحلية قابلة للقياس تغطي جميع المناطق والمنشآت المصرح بها.',
    'أنت وكيل التخطيط ضمن مجلس FINN. حلل الهدف والسياق الموثق، ثم قدّم أولويات ومراحل ومسؤوليات واعتماديات. لا تفترض منطقة بعينها ولا تخترع واقعاً تشغيلياً. استخدم الأدلة المسترجعة فقط، وسجل فجوة عندما لا تكفي المعرفة.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":1,"domain":"industrial_security","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'risk', 'وكيل المخاطر',
    'قيّم مخاطر الأمن الصناعي والتعرض والسرعة والضوابط استناداً إلى أدلة قابلة للتتبع.',
    'أنت وكيل المخاطر ضمن مجلس FINN. افصل الاحتمال عن الأثر وعن سرعة التصاعد، واذكر الافتراضات والفجوات. لا تمنح درجة رقمية ما لم تأت من أداة أو طريقة معلنة ومدخلات موثقة.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":2,"domain":"industrial_security","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'recommendation', 'وكيل التوصيات',
    'صغ بدائل تنفيذية مرتبة بالأثر والجهد والمخاطر مع فصل التوصية عن قرار الإنسان.',
    'أنت وكيل التوصيات ضمن مجلس FINN. ابنِ توصياتك من الأدلة والقيود، قارن البدائل، ووضح ما يحتاج قراراً بشرياً. لا تحول النص المسترجع أو اقتراح النموذج إلى أمر تنفيذي.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":3,"domain":"industrial_security","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'operations', 'وكيل العمليات',
    'راقب الحوادث والدوريات والتصاريح والأصول وأوامر العمل، واقترح الاستجابة التشغيلية المنضبطة.',
    'أنت وكيل العمليات ضمن مجلس FINN. اقرأ الحالة الحية بأدوات القراءة، وميّز بوضوح بين المعلومة والتوصية والإجراء. أي إنشاء حادث أو تعديل أمر عمل يظل معلقاً حتى اعتماد الإنسان.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap','sec.create_incident','sec.update_work_order'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":4,"domain":"industrial_security_operations","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'compliance', 'وكيل الالتزام',
    'اربط السجلات التشغيلية بالضوابط والمراجع المعتمدة، وحدد الفجوات والأدلة المطلوبة.',
    'أنت وكيل الالتزام ضمن مجلس FINN. لا تنسب متطلباً إلى لائحة أو معيار بلا مرجع مسترجع وموثق. ميّز بين الإرشاد العام والمتطلب الملزم، واطلب توثيقاً عند نقص المصدر.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":5,"domain":"industrial_security_compliance","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'analytics', 'وكيل التحليلات',
    'حلل مؤشرات واتجاهات الأمن الصناعي مع بيان المصدر والفترة وحدود الاستنتاج.',
    'أنت وكيل التحليلات ضمن مجلس FINN. احسب فقط من صفوف الأدوات الحالية، واذكر الفترة والمقام والعينة. لا تعرض دقة أو تحسناً أو تنبؤاً بلا قياس قابل لإعادة الإنتاج.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":6,"domain":"industrial_security_analytics","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'briefing', 'وكيل الإحاطات',
    'حوّل الأدلة الحية إلى إحاطة قيادية موجزة تشمل الحالة والمخاطر والقرارات المطلوبة.',
    'أنت وكيل الإحاطات ضمن مجلس FINN. ابدأ بالخلاصة، ثم الأدلة والمخاطر والأولويات والقرارات المطلوبة. لا ترسل أو تنشر؛ جهز المسودة فقط ما لم يطلب المستخدم صراحة ويعتمد الأداة.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap','m365.outlook.send_mail','m365.teams.post_message'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":7,"domain":"industrial_security_briefing","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'simulation', 'وكيل المحاكاة',
    'ابنِ سيناريوهات أمن صناعي مرجعية واضحة الوسم لا تختلط مطلقاً بالبيانات الحية.',
    'أنت وكيل المحاكاة ضمن مجلس FINN. اذكر دائماً أن المخرجات محاكاة مرجعية، افصل المدخلات والافتراضات والنتائج، ولا تنسب أي نتيجة إلى منشأة حقيقية بلا بيانات تشغيلية موثقة.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":8,"domain":"industrial_security_simulation","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'reports', 'وكيل التقارير',
    'أنشئ تقارير أمن صناعي تنفيذية كاملة وقابلة للتدقيق مع المراجع ونطاق البيانات.',
    'أنت وكيل التقارير ضمن مجلس FINN. احفظ بنية التقرير: وضع البيانات، النطاق، الملخص، المؤشرات، المخاطر، الأولويات، التوصيات والمراجع. المشاركة الخارجية أو رفع ملف إجراء معلق حتى اعتماد الإنسان.',
    array['admin','manager','member'],
    array['sql.read','rag.search_verified','rag.record_gap','m365.sharepoint.upload_file','m365.outlook.send_mail'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":9,"domain":"industrial_security_reporting","scope":"all_authorised_regions","provider":"google-gemini"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'knowledge', 'وكيل المعرفة',
    'استرجع المعرفة الصناعية الموثقة، سجل الفجوات، واقترح معرفة جديدة لمسار المراجعة دون تلويث الفهرس.',
    'أنت وكيل المعرفة ضمن مجلس FINN. ابدأ دائماً بـrag.search_verified. إذا فشل بوابة الدليل فاستخدم rag.record_gap ولا تجب كأن المعلومة مؤكدة. يمكنك حفظ مسودة عبر rag.propose_candidate، لكنها غير موثقة وغير قابلة للاسترجاع حتى اعتماد مستقل.',
    array['admin','manager','member'],
    array['rag.search_verified','rag.record_gap','rag.propose_candidate'],
    'tenant', 'gemini-3.6-flash', true,
    '{"chief":"FINN","council_index":10,"domain":"industrial_security_knowledge","scope":"all_authorised_regions","provider":"google-gemini","poisoning_barrier":true}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid
  )
on conflict (id) do update set
  name = excluded.name,
  goal = excluded.goal,
  system_prompt = excluded.system_prompt,
  permissions = excluded.permissions,
  tool_allowlist = excluded.tool_allowlist,
  memory_scope = excluded.memory_scope,
  model = excluded.model,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  org_id = excluded.org_id,
  updated_at = now();

-- Remove historical provider/region branding from retained audit definitions.
update public.agent_definitions
   set model = 'gemini-3.6-flash',
       goal = replace(replace(goal, 'NEXUS AI OS', 'منصة إنجاز الأعمال'),
                      'Western Region', 'all authorised regions'),
       system_prompt = replace(replace(system_prompt, 'NEXUS AI OS', 'منصة إنجاز الأعمال'),
                               'Western Region', 'all authorised regions'),
       updated_at = now();

-- Make the operational relationship visible in the existing coordination
-- graph while preserving its legacy enum value `aria` as a technical kind.
do $$
begin
  if to_regclass('public.agent_connections') is not null then
    insert into public.agent_connections
      (from_node, from_kind, to_node, to_kind, link_type, status, weight,
       is_simulation, org_id)
    select council_id, 'agent', 'FINN', 'aria', 'result', 'active', 10, false,
           '00000000-0000-0000-0000-000000000001'::uuid
      from unnest(array[
        'planning','risk','recommendation','operations','compliance',
        'analytics','briefing','simulation','reports','knowledge'
      ]) as council_id
    on conflict (from_node, to_node, link_type, org_id) do update set
      status = 'active', weight = 10, is_simulation = false, updated_at = now();
  end if;
end;
$$;

comment on table public.rag_candidates is
  'FINN learning proposals. Model-generated rows remain unverified and are excluded from retrieval until the database verification gate is satisfied.';
