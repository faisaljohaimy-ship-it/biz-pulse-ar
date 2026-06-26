
-- ============================================================
-- WAVE 1: Seed 5 production workflows
-- ============================================================
INSERT INTO public.workflows (org_id, name, description, definition_json, trigger_topic, enabled, tags) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'incident_response_v1',
  'استجابة آلية للحوادث الأمنية: تصنيف → تجميع السياق → إخطار',
  jsonb_build_object(
    'start','classify',
    'steps', jsonb_build_array(
      jsonb_build_object('id','classify','kind','condition',
        'when', jsonb_build_object('path','trigger.severity','equals','critical'),
        'ifTrue','gather_critical','ifFalse','gather_standard'),
      jsonb_build_object('id','gather_critical','kind','tool',
        'toolId','sql.read',
        'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title','severity','status'),'filters', jsonb_build_object('id','{{ctx.trigger.incident_id}}'),'limit',1),
        'next','wait_brief'),
      jsonb_build_object('id','gather_standard','kind','tool',
        'toolId','sql.read',
        'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','title','severity'),'filters', jsonb_build_object('id','{{ctx.trigger.incident_id}}'),'limit',1),
        'next','wait_brief'),
      jsonb_build_object('id','wait_brief','kind','wait','seconds',1)
    )
  ),
  'sec.incident.created',
  true,
  ARRAY['security','automation','incident']
),
(
  '00000000-0000-0000-0000-000000000001',
  'permit_approval_v1',
  'مسار اعتماد التصاريح: تصاريح العمل الساخن تتطلب مراجعة إضافية',
  jsonb_build_object(
    'start','load_permit',
    'steps', jsonb_build_array(
      jsonb_build_object('id','load_permit','kind','tool',
        'toolId','sql.read',
        'input', jsonb_build_object('table','sec_permits','columns', jsonb_build_array('id','kind','status','requested_by'),'filters', jsonb_build_object('id','{{ctx.trigger.permit_id}}'),'limit',1),
        'next','check_kind'),
      jsonb_build_object('id','check_kind','kind','condition',
        'when', jsonb_build_object('path','trigger.kind','equals','hot_work'),
        'ifTrue','escalate','ifFalse','auto_approve'),
      jsonb_build_object('id','escalate','kind','wait','seconds',3,'next','auto_approve'),
      jsonb_build_object('id','auto_approve','kind','wait','seconds',1)
    )
  ),
  'sec.permit.created',
  true,
  ARRAY['security','permits','approval']
),
(
  '00000000-0000-0000-0000-000000000001',
  'patrol_overdue_v1',
  'تنبيه عند تأخر دورية أمنية عن جدولها',
  jsonb_build_object(
    'start','load_patrol',
    'steps', jsonb_build_array(
      jsonb_build_object('id','load_patrol','kind','tool',
        'toolId','sql.read',
        'input', jsonb_build_object('table','sec_patrols','columns', jsonb_build_array('id','status','scheduled_at'),'filters', jsonb_build_object('id','{{ctx.trigger.patrol_id}}'),'limit',1),
        'next','notify'),
      jsonb_build_object('id','notify','kind','wait','seconds',1)
    )
  ),
  'sec.patrol.overdue',
  true,
  ARRAY['security','patrols','alert']
),
(
  '00000000-0000-0000-0000-000000000001',
  'visitor_checkin_v1',
  'استقبال زائر جديد: التحقق ثم التسجيل',
  jsonb_build_object(
    'start','verify',
    'steps', jsonb_build_array(
      jsonb_build_object('id','verify','kind','tool',
        'toolId','sql.read',
        'input', jsonb_build_object('table','sec_visitors','columns', jsonb_build_array('id','status','host_employee'),'filters', jsonb_build_object('id','{{ctx.trigger.visitor_id}}'),'limit',1),
        'next','register'),
      jsonb_build_object('id','register','kind','wait','seconds',1)
    )
  ),
  'sec.visitor.created',
  true,
  ARRAY['security','visitors','access']
),
(
  '00000000-0000-0000-0000-000000000001',
  'daily_kpi_rollup_v1',
  'تجميع مؤشرات الأداء اليومية للمنطقة الغربية',
  jsonb_build_object(
    'start','snapshot',
    'steps', jsonb_build_array(
      jsonb_build_object('id','snapshot','kind','tool',
        'toolId','sql.read',
        'input', jsonb_build_object('table','sec_incidents','columns', jsonb_build_array('id','severity','status'),'limit',100),
        'next','wait_done'),
      jsonb_build_object('id','wait_done','kind','wait','seconds',1)
    )
  ),
  'schedule.daily.kpi',
  true,
  ARRAY['kpi','schedule','executive']
);

-- ============================================================
-- WAVE 1: Real producer triggers on sec_* tables
-- Each insert publishes a PENDING enterprise_event so the runtime
-- consumer can fire the matching workflow automatically.
-- ============================================================

-- 1) Incidents → sec.incident.created
CREATE OR REPLACE FUNCTION public.tg_emit_incident_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.enterprise_events(
    topic, source, severity, status, org_id, actor_id,
    subject_type, subject_id, payload_json
  ) VALUES (
    'sec.incident.created',
    'db.trigger',
    CASE COALESCE(NEW.severity,'medium')
      WHEN 'critical' THEN 'critical'
      WHEN 'high' THEN 'warn'
      ELSE 'info'
    END,
    'pending',
    NEW.org_id,
    NEW.reported_by,
    'sec_incident',
    NEW.id::text,
    jsonb_build_object(
      'incident_id', NEW.id,
      'title', NEW.title,
      'severity', NEW.severity,
      'status', NEW.status,
      'site_id', NEW.site_id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tg_emit_incident_event failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sec_incidents_emit_event ON public.sec_incidents;
CREATE TRIGGER sec_incidents_emit_event
AFTER INSERT ON public.sec_incidents
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_incident_event();

-- 2) Permits → sec.permit.created
CREATE OR REPLACE FUNCTION public.tg_emit_permit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.enterprise_events(
    topic, source, severity, status, org_id,
    subject_type, subject_id, payload_json
  ) VALUES (
    'sec.permit.created',
    'db.trigger',
    'info',
    'pending',
    NEW.org_id,
    'sec_permit',
    NEW.id::text,
    jsonb_build_object(
      'permit_id', NEW.id,
      'kind', NEW.kind,
      'status', NEW.status,
      'requested_by', NEW.requested_by
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tg_emit_permit_event failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sec_permits_emit_event ON public.sec_permits;
CREATE TRIGGER sec_permits_emit_event
AFTER INSERT ON public.sec_permits
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_permit_event();

-- 3) Visitors → sec.visitor.created
CREATE OR REPLACE FUNCTION public.tg_emit_visitor_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.enterprise_events(
    topic, source, severity, status, org_id,
    subject_type, subject_id, payload_json
  ) VALUES (
    'sec.visitor.created',
    'db.trigger',
    'info',
    'pending',
    NEW.org_id,
    'sec_visitor',
    NEW.id::text,
    jsonb_build_object(
      'visitor_id', NEW.id,
      'status', NEW.status,
      'host_employee', NEW.host_employee
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tg_emit_visitor_event failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sec_visitors_emit_event ON public.sec_visitors;
CREATE TRIGGER sec_visitors_emit_event
AFTER INSERT ON public.sec_visitors
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_visitor_event();
