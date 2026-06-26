
-- 1) Grant global admin app_role to org admins so the tool RBAC gate passes
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT om.user_id, 'admin'::app_role
FROM public.org_members om
WHERE om.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Repair workflow definitions that did not parse against WorkflowDefinitionSchema
UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','collect',
  'steps', jsonb_build_array(
    jsonb_build_object('id','collect','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title','severity','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'executive_brief_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_contractors','columns', jsonb_build_array('id','company_name','status'),'limit',5)),
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
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title','severity'),'limit',5)),
    jsonb_build_object('id','log','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'emergency_escalation_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_sites','columns', jsonb_build_array('id','name'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'inspection_workflow_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','assess',
  'steps', jsonb_build_array(
    jsonb_build_object('id','assess','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title','severity','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'risk_assessment_v1';

UPDATE public.workflows SET definition_json = jsonb_build_object(
  'start','load',
  'steps', jsonb_build_array(
    jsonb_build_object('id','load','kind','tool','toolId','sql.read','next','settle',
      'input', jsonb_build_object('table','sec_work_orders','columns', jsonb_build_array('id','priority','status'),'limit',5)),
    jsonb_build_object('id','settle','kind','wait','seconds',1)
  )
) WHERE name = 'maintenance_request_v1';
