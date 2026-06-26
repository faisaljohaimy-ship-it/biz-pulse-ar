
UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','classify',
  'steps', jsonb_build_array(
    jsonb_build_object('id','classify','kind','condition',
      'when', jsonb_build_object('path','trigger.severity','equals','critical'),
      'ifTrue','gather_critical','ifFalse','gather_standard'),
    jsonb_build_object('id','gather_critical','kind','tool','toolId','sql.read','next','wait_brief',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title_en','severity','status'),'limit',5)),
    jsonb_build_object('id','gather_standard','kind','tool','toolId','sql.read','next','wait_brief',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title_en','severity'),'limit',5)),
    jsonb_build_object('id','wait_brief','kind','wait','seconds',1)
  )
) WHERE name = 'incident_response_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load_permit',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load_permit','kind','tool','toolId','sql.read','next','check_kind',
      'input', jsonb_build_object('table','sec_permits','columns', jsonb_build_array('id','work_type','status','created_by'),'limit',5)),
    jsonb_build_object('id','check_kind','kind','condition',
      'when', jsonb_build_object('path','trigger.permit_type','equals','hot_work'),
      'ifTrue','escalate','ifFalse','auto_approve'),
    jsonb_build_object('id','escalate','kind','wait','next','auto_approve','seconds',1),
    jsonb_build_object('id','auto_approve','kind','wait','seconds',1)
  )
) WHERE name = 'permit_approval_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load_patrol',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load_patrol','kind','tool','toolId','sql.read','next','notify',
      'input', jsonb_build_object('table','sec_patrols','columns', jsonb_build_array('id','status','started_at'),'limit',5)),
    jsonb_build_object('id','notify','kind','wait','seconds',1)
  )
) WHERE name = 'patrol_overdue_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','verify',
  'steps', jsonb_build_array(
    jsonb_build_object('id','verify','kind','tool','toolId','sql.read','next','register',
      'input', jsonb_build_object('table','sec_visitors','columns', jsonb_build_array('id','status','host'),'limit',5)),
    jsonb_build_object('id','register','kind','wait','seconds',1)
  )
) WHERE name = 'visitor_checkin_v1';
