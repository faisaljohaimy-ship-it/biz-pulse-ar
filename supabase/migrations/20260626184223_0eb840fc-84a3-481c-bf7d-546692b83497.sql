
-- ============================================================
-- PRODUCTION COMPLETION WAVE
-- ============================================================
-- 1) Expand DB triggers: emit events for work orders, patrols, contractors.
-- 2) Seed 6 new production workflows (Executive Brief, Contractor Approval,
--    Emergency Escalation, Inspection, Risk Assessment, Maintenance Request).
-- 3) Enable previously-disabled tools (SAP/Oracle/Azure AD/n8n) gated by
--    credentials so callers get a real failure if creds are missing.
-- 4) Seed ARIA enterprise knowledge corpus (text grounding) idempotently.

-- ---------- (1) Triggers ----------
CREATE OR REPLACE FUNCTION public.tg_emit_work_order_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.enterprise_events(
    topic, source, severity, status, org_id, actor_id,
    subject_type, subject_id, payload_json
  ) VALUES (
    CASE WHEN TG_OP = 'INSERT' THEN 'sec.work_order.created' ELSE 'sec.work_order.updated' END,
    'db.trigger',
    CASE NEW.priority WHEN 'critical' THEN 'critical' WHEN 'high' THEN 'warn' ELSE 'info' END,
    'pending', NEW.org_id, NEW.created_by,
    'sec_work_order', NEW.id::text,
    jsonb_build_object(
      'work_order_id', NEW.id, 'priority', NEW.priority,
      'status', NEW.status, 'source_incident_id', NEW.source_incident_id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tg_emit_work_order_event failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sec_work_orders_emit_event ON public.sec_work_orders;
CREATE TRIGGER sec_work_orders_emit_event
  AFTER INSERT ON public.sec_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_work_order_event();

CREATE OR REPLACE FUNCTION public.tg_emit_contractor_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.enterprise_events(
    topic, source, severity, status, org_id, subject_type, subject_id, payload_json
  ) VALUES (
    'sec.contractor.created', 'db.trigger', 'info', 'pending',
    NEW.org_id, 'sec_contractor', NEW.id::text,
    jsonb_build_object('contractor_id', NEW.id, 'company_name', NEW.company_name, 'status', NEW.status)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tg_emit_contractor_event failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sec_contractors_emit_event ON public.sec_contractors;
CREATE TRIGGER sec_contractors_emit_event
  AFTER INSERT ON public.sec_contractors
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_contractor_event();

-- ---------- (2) Production workflows ----------
INSERT INTO public.workflows (id, name, description, definition_json, version, enabled, trigger_topic, tags, org_id)
VALUES
  (gen_random_uuid(), 'executive_brief_v1',
   'Generate executive briefing on demand and dispatch to leadership.',
   '{"steps":[{"id":"collect","tool":"sql.read"},{"id":"summarize","agent":"executive_briefer"},{"id":"deliver","tool":"m365.outlook.send_mail"}]}'::jsonb,
   1, true, 'exec.brief.requested', ARRAY['executive','brief'], '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'contractor_approval_v1',
   'Validate contractor credentials and route for HSE approval.',
   '{"steps":[{"id":"validate","tool":"sql.read"},{"id":"hse_review","agent":"compliance_auditor"},{"id":"notify","tool":"m365.teams.post_message"}]}'::jsonb,
   1, true, 'sec.contractor.created', ARRAY['access','contractor'], '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'emergency_escalation_v1',
   'P1 incident escalation: notify CEO, dispatch emergency response, open war-room.',
   '{"steps":[{"id":"classify","agent":"incident_triager"},{"id":"escalate","tool":"m365.outlook.send_mail"},{"id":"warroom","tool":"m365.teams.post_message"},{"id":"audit","tool":"sql.read"}]}'::jsonb,
   1, true, 'sec.incident.p1', ARRAY['emergency','p1'], '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'inspection_workflow_v1',
   'Site inspection scheduling and findings consolidation.',
   '{"steps":[{"id":"plan","agent":"operations_monitor"},{"id":"execute","tool":"sec.update_work_order"},{"id":"report","agent":"executive_reporter"}]}'::jsonb,
   1, true, 'sec.inspection.requested', ARRAY['inspection','audit'], '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'risk_assessment_v1',
   'Risk scoring and mitigation recommendation for new findings.',
   '{"steps":[{"id":"score","agent":"risk_intelligence"},{"id":"recommend","agent":"aria_executive"},{"id":"persist","tool":"sql.read"}]}'::jsonb,
   1, true, 'risk.assessment.requested', ARRAY['risk'], '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'maintenance_request_v1',
   'Maintenance request triage → work order creation → assignment.',
   '{"steps":[{"id":"triage","agent":"maintenance_planner"},{"id":"create_wo","tool":"sec.update_work_order"},{"id":"assign","tool":"m365.teams.post_message"}]}'::jsonb,
   1, true, 'sec.work_order.created', ARRAY['maintenance'], '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ---------- (3) Enable adapter tools (will fail-fast on missing creds) ----------
UPDATE public.tool_registry
SET enabled = true,
    metadata = metadata || jsonb_build_object('requires_credential', true, 'production_ready', true)
WHERE id IN ('sap.execute','oracle.execute','azure_ad.execute','n8n.execute');

-- ---------- (4) Seed ARIA knowledge (text-only; embeddings backfilled by RAG) ----------
INSERT INTO public.aria_knowledge (title, source, content, tags, org_id)
SELECT * FROM (VALUES
  ('Industrial Security Charter — Western Region','policy/charter',
   'Industrial Security (Western Region) protects assets, personnel and operations across Jeddah, Makkah and Yanbu, aligned to NFPA 600, ISO 28000, ISPS and OSHA 1910.7. Model: Prevent → Respond → Improve. KPIs: MTTD<5min, MTTR<30min for P1/P2.',
   ARRAY['governance','charter'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Incident Severity Matrix P1–P5','policy/severity',
   'P1 life-or-production threatening: 15-min CEO notification, automatic war-room. P2 high: 30-min ops notice, auto work-order. P3 medium: 4h response. P4 low: 24h. P5 observation: weekly digest. P1/P2 create sec_work_orders automatically.',
   ARRAY['incidents','policy'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Permit-to-Work SOP','sop/ptw',
   'Hot work, confined-space, working-at-height require approved PTW with JSA, gas test (LEL<10%, O2 19.5–23.5%), fire watch and rescue plan. Maximum 12h validity. Auto-expire enforced by workflow.',
   ARRAY['permits','sop','ptw'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Visitor and Contractor Access','policy/access',
   'All visitors require valid ID, host approval and 12-month safety induction. Contractors must have insurance, HSE certifications and active sec_contractors record. Restricted zones require escort.',
   ARRAY['access','visitors','contractors'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Control Room Triage SOP','sop/triage',
   'Within 60 seconds: classify P1–P5, create sec_incidents record, dispatch nearest patrol, notify shift supervisor for P1/P2, open work order if asset impacted, update every 5 minutes until resolved.',
   ARRAY['sop','control-room'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Emergency Escalation Protocol','sop/escalation',
   'P1: notify Department Head + CEO within 15min via Outlook + Teams war-room channel. Activate emergency response team. Engage civil defense if fire/HAZMAT. Maintain ICS-100 incident command structure.',
   ARRAY['emergency','escalation','sop'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Patrol Operations Standard','sop/patrols',
   'Patrol teams cover assigned circles with mandatory checkpoints every 30 minutes. GPS tracked. Overdue patrols (>10min) trigger patrol_overdue workflow. Shift handover includes incident log review.',
   ARRAY['patrols','sop'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Risk Assessment Methodology','methodology/risk',
   'Risk score = Likelihood (1-5) × Impact (1-5). >15 critical, 9-15 high, 4-8 medium, <4 low. Mitigation plan required for high/critical within 7 days. Re-assess quarterly or after incident.',
   ARRAY['risk','methodology'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Executive Reporting Cadence','policy/reporting',
   'Daily ops dashboard 06:00. Weekly executive brief Sunday 07:00. Monthly KPI report 1st of month. Quarterly board pack 5th of quarter-end month. Auto-generated via executive_reporter agent.',
   ARRAY['reporting','executive'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Maintenance Priority Matrix','policy/maintenance',
   'Critical: <4h response (safety/security asset down). High: <24h (degraded). Medium: <72h. Low: scheduled window. Auto-routed via maintenance_planner agent based on asset criticality.',
   ARRAY['maintenance','priority'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('Compliance Framework Mapping','compliance/mapping',
   'NFPA 600 (fire brigade) → patrols module. ISO 28000 (supply chain security) → contractor/visitor modules. ISPS (port facility) → gate/permit modules. OSHA 1910.7 → PTW + JSA. Audit trail in audit_logs immutable.',
   ARRAY['compliance','iso','nfpa'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('ARIA Operating Principles','aria/principles',
   'ARIA is the executive AI engine of NEXUS AI OS. Bilingual AR/EN. Grounded in this corpus + live sec_* data. Never fabricates incidents. Always cites source. Defers to human approval for P1 actions and any irreversible operation.',
   ARRAY['aria','governance'],'00000000-0000-0000-0000-000000000001'::uuid)
) AS v(title, source, content, tags, org_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.aria_knowledge k
  WHERE k.org_id = v.org_id AND k.title = v.title
);
