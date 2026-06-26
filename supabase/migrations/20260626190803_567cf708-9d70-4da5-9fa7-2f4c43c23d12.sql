
UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','collect',
  'steps', jsonb_build_array(
    jsonb_build_object('id','collect','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title_en','severity','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'executive_brief_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_contractors','columns', jsonb_build_array('id','name','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'contractor_approval_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','classify',
  'steps', jsonb_build_array(
    jsonb_build_object('id','classify','kind','condition',
      'when', jsonb_build_object('path','trigger.severity','equals','P1'),
      'ifTrue','escalate','ifFalse','log'),
    jsonb_build_object('id','escalate','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title_en','severity'),'limit',5)),
    jsonb_build_object('id','log','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title_en'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'emergency_escalation_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_sites','columns', jsonb_build_array('id','name_en','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'inspection_workflow_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','assess',
  'steps', jsonb_build_array(
    jsonb_build_object('id','assess','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title_en','severity','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'risk_assessment_v1';
