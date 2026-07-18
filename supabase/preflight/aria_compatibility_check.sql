-- NEXIOS / ARIA read-only migration preflight.
-- Run this file before the three 20260718 migrations. It performs no writes.
-- Every row must report WILL_CREATE or COMPATIBLE. Stop on BLOCKED_*.

with required(table_name, column_name, expected_udt) as (
  values
    ('hcis_directives','code','text'),
    ('hcis_directives','category','text'),
    ('hcis_directives','name_ar','text'),
    ('hcis_directives','name_en','text'),
    ('hcis_directives','scope_ar','text'),
    ('hcis_directives','issue_note_ar','text'),
    ('hcis_directives','sort_order','int4'),
    ('hcis_directives','updated_at','timestamptz'),
    ('hcis_sectors','id','int4'),
    ('hcis_sectors','name_ar','text'),
    ('hcis_sectors','name_en','text'),
    ('hcis_sectors','is_primary','bool'),
    ('hcis_approval_stages','stage_no','int4'),
    ('hcis_approval_stages','name_ar','text'),
    ('hcis_approval_stages','name_en','text'),
    ('hcis_approval_stages','description_ar','text'),
    ('hcis_compliance_status','id','uuid'),
    ('hcis_compliance_status','directive_code','text'),
    ('hcis_compliance_status','region_code','text'),
    ('hcis_compliance_status','status','text'),
    ('hcis_compliance_status','priority','text'),
    ('hcis_compliance_status','notes_ar','text'),
    ('hcis_compliance_status','is_simulation','bool'),
    ('hcis_compliance_status','updated_at','timestamptz'),
    ('aria_knowledge','id','uuid'),
    ('aria_knowledge','slug','text'),
    ('aria_knowledge','domain','text'),
    ('aria_knowledge','title_ar','text'),
    ('aria_knowledge','title_en','text'),
    ('aria_knowledge','content_ar','text'),
    ('aria_knowledge','tags','_text'),
    ('aria_knowledge','source','text'),
    ('aria_knowledge','lang','text'),
    ('aria_knowledge','updated_at','timestamptz'),
    ('aria_outbound_messages','id','uuid'),
    ('aria_outbound_messages','org_id','uuid'),
    ('aria_outbound_messages','actor_id','uuid'),
    ('aria_outbound_messages','channel','text'),
    ('aria_outbound_messages','recipient_hint','text'),
    ('aria_outbound_messages','content_hash','text'),
    ('aria_outbound_messages','payload_ciphertext','text'),
    ('aria_outbound_messages','payload_iv','text'),
    ('aria_outbound_messages','idempotency_key','text'),
    ('aria_outbound_messages','status','text'),
    ('aria_outbound_messages','approval_expires_at','timestamptz'),
    ('aria_outbound_message_events','id','uuid'),
    ('aria_outbound_message_events','message_id','uuid'),
    ('aria_outbound_message_events','org_id','uuid'),
    ('aria_outbound_message_events','provider','text'),
    ('aria_outbound_message_events','provider_event_id','text'),
    ('aria_outbound_message_events','event_type','text'),
    ('aria_outbound_message_events','payload_hash','text'),
    ('aria_adaptive_preferences','id','uuid'),
    ('aria_adaptive_preferences','user_id','uuid'),
    ('aria_adaptive_preferences','preference_key','text'),
    ('aria_adaptive_preferences','preference_value','text'),
    ('aria_adaptive_preferences','confidence','float4'),
    ('aria_adaptive_preferences','evidence_count','int4'),
    ('aria_adaptive_preferences','safety_passed','bool'),
    ('aria_adaptive_preferences','updated_at','timestamptz')
), inspected as (
  select
    r.*,
    c.column_name is not null as column_exists,
    c.udt_name as actual_udt
  from required r
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = r.table_name
   and c.column_name = r.column_name
)
select
  table_name,
  case
    when to_regclass(format('public.%I', table_name)) is null then 'WILL_CREATE'
    when bool_and(column_exists and actual_udt = expected_udt) then 'COMPATIBLE'
    else 'BLOCKED_SCHEMA_MISMATCH'
  end as compatibility,
  coalesce(
    string_agg(
      format('%I expected %s, found %s', column_name, expected_udt, coalesce(actual_udt, 'MISSING')),
      '; ' order by column_name
    ) filter (where not column_exists or actual_udt <> expected_udt),
    'required columns and types are present'
  ) as detail
from inspected
group by table_name
order by table_name;

with expected(key_name, table_name, key_columns) as (
  values
    ('hcis_directives_code_key','hcis_directives',array['code']::text[]),
    ('hcis_sectors_id_key','hcis_sectors',array['id']::text[]),
    ('hcis_stages_stage_no_key','hcis_approval_stages',array['stage_no']::text[]),
    ('hcis_compliance_directive_region_key','hcis_compliance_status',array['directive_code','region_code']::text[]),
    ('aria_knowledge_slug_key','aria_knowledge',array['slug']::text[]),
    ('aria_outbound_messages_id_key','aria_outbound_messages',array['id']::text[]),
    ('aria_outbound_messages_idempotency_key','aria_outbound_messages',array['idempotency_key']::text[]),
    ('aria_outbound_events_provider_event_key','aria_outbound_message_events',array['provider','provider_event_id']::text[]),
    ('aria_adaptive_preferences_user_key','aria_adaptive_preferences',array['user_id','preference_key']::text[])
), actual as (
  select
    tbl.relname as table_name,
    array_agg(att.attname order by key_part.ordinality)::text[] as key_columns
  from pg_index idx
  join pg_class tbl on tbl.oid = idx.indrelid
  join pg_namespace ns on ns.oid = tbl.relnamespace and ns.nspname = 'public'
  join lateral unnest(idx.indkey::smallint[]) with ordinality
    as key_part(attnum, ordinality)
    on key_part.ordinality <= idx.indnkeyatts
  join pg_attribute att
    on att.attrelid = tbl.oid
   and att.attnum = key_part.attnum
  where idx.indisunique
    and idx.indpred is null
  group by tbl.relname, idx.indexrelid
)
select
  e.key_name,
  case
    when to_regclass(format('public.%I', e.table_name)) is null then 'WILL_CREATE'
    when exists (
      select 1 from actual a
      where a.table_name = e.table_name and a.key_columns = e.key_columns
    ) then 'COMPATIBLE'
    else 'BLOCKED_MISSING_UNIQUE_KEY'
  end as compatibility,
  e.table_name,
  e.key_columns
from expected e
order by e.key_name;

with expected(index_name, expected_table) as (
  values
    ('hcis_directives_category_sort_idx','hcis_directives'),
    ('hcis_compliance_region_status_idx','hcis_compliance_status'),
    ('aria_knowledge_domain_idx','aria_knowledge'),
    ('aria_knowledge_fts_idx','aria_knowledge'),
    ('aria_outbound_actor_created_idx','aria_outbound_messages'),
    ('aria_outbound_org_status_idx','aria_outbound_messages'),
    ('aria_outbound_provider_message_uidx','aria_outbound_messages'),
    ('aria_outbound_events_message_idx','aria_outbound_message_events'),
    ('aria_adaptive_preferences_user_key_uidx','aria_adaptive_preferences')
), existing as (
  select
    idx.relname as index_name,
    tbl.relname as actual_table
  from pg_class idx
  join pg_namespace ns on ns.oid = idx.relnamespace and ns.nspname = 'public'
  join pg_index pi on pi.indexrelid = idx.oid
  join pg_class tbl on tbl.oid = pi.indrelid
  where idx.relkind = 'i'
)
select
  e.index_name,
  case
    when x.index_name is null then 'WILL_CREATE'
    when x.actual_table = e.expected_table then 'COMPATIBLE'
    else 'BLOCKED_INDEX_NAME_COLLISION'
  end as compatibility,
  coalesce(x.actual_table, e.expected_table) as table_name
from expected e
left join existing x using (index_name)
order by e.index_name;

-- Existing access rules are listed for operator review. The HCIS migration
-- adds authenticated read policies to its five reference tables; outbound
-- tables intentionally receive no browser policy.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'hcis_directives',
    'hcis_sectors',
    'hcis_approval_stages',
    'hcis_compliance_status',
    'aria_knowledge',
    'aria_outbound_messages',
    'aria_outbound_message_events',
    'aria_adaptive_preferences'
  )
order by tablename, policyname;
