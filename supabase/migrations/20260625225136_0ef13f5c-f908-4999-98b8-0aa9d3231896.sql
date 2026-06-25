
-- ===== Phase A: Enterprise Execution Engine =====

-- 1) Tool Registry
CREATE TABLE public.tool_registry (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('sap','m365','outlook','teams','sharepoint','azure_ad','oracle','rest','graph','n8n','webhook','sql','edge','internal','twin')),
  name text NOT NULL,
  description text,
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  permissions text[] NOT NULL DEFAULT '{}',
  requires_approval boolean NOT NULL DEFAULT false,
  rollback_kind text NOT NULL DEFAULT 'none' CHECK (rollback_kind IN ('none','inverse','compensating')),
  rollback_tool_id text,
  enabled boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tool_registry TO authenticated;
GRANT ALL ON public.tool_registry TO service_role;
ALTER TABLE public.tool_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_registry_admin_select ON public.tool_registry FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY tool_registry_admin_write  ON public.tool_registry FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Tool Executions
CREATE TABLE public.tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id text NOT NULL REFERENCES public.tool_registry(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_run_id uuid,
  agent_run_id uuid,
  parent_execution_id uuid REFERENCES public.tool_executions(id) ON DELETE SET NULL,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','rolled_back','pending_approval','rejected','cancelled')),
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb,
  error text,
  attempt int NOT NULL DEFAULT 1,
  duration_ms int,
  started_at timestamptz,
  finished_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tool_executions_tool_idx ON public.tool_executions(tool_id, created_at DESC);
CREATE INDEX tool_executions_corr_idx ON public.tool_executions(correlation_id);
CREATE INDEX tool_executions_status_idx ON public.tool_executions(status, created_at DESC);
GRANT SELECT ON public.tool_executions TO authenticated;
GRANT ALL ON public.tool_executions TO service_role;
ALTER TABLE public.tool_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_exec_admin_select ON public.tool_executions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR actor_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.tool_executions;
ALTER TABLE public.tool_executions REPLICA IDENTITY FULL;

-- 3) Workflows
CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  definition_json jsonb NOT NULL,
  version int NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_topic text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflows_trigger_idx ON public.workflows(trigger_topic) WHERE enabled = true;
GRANT SELECT ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflows_admin_select ON public.workflows FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY workflows_admin_write  ON public.workflows FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER workflows_updated BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Workflow Runs
CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','waiting_approval','succeeded','failed','cancelled','rolled_back')),
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_event text,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step text,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX workflow_runs_wf_idx ON public.workflow_runs(workflow_id, started_at DESC);
CREATE INDEX workflow_runs_status_idx ON public.workflow_runs(status, started_at DESC);
GRANT SELECT ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY wf_runs_admin_select ON public.workflow_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR triggered_by = auth.uid());

-- 5) Workflow Step Runs
CREATE TABLE public.workflow_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('tool','condition','loop','approval','parallel','wait','subworkflow')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','skipped','waiting','cancelled')),
  attempt int NOT NULL DEFAULT 1,
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb,
  tool_execution_id uuid REFERENCES public.tool_executions(id) ON DELETE SET NULL,
  error text,
  started_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX wf_step_runs_run_idx ON public.workflow_step_runs(run_id, started_at);
GRANT SELECT ON public.workflow_step_runs TO authenticated;
GRANT ALL ON public.workflow_step_runs TO service_role;
ALTER TABLE public.workflow_step_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY wf_step_admin_select ON public.workflow_step_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 6) Enterprise Events
CREATE TABLE public.enterprise_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','dead')),
  retry_count int NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);
CREATE INDEX events_topic_idx ON public.enterprise_events(topic, occurred_at DESC);
CREATE INDEX events_status_idx ON public.enterprise_events(status) WHERE status <> 'processed';
CREATE INDEX events_corr_idx ON public.enterprise_events(correlation_id);
GRANT SELECT ON public.enterprise_events TO authenticated;
GRANT ALL ON public.enterprise_events TO service_role;
ALTER TABLE public.enterprise_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_admin_select ON public.enterprise_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.enterprise_events;
ALTER TABLE public.enterprise_events REPLICA IDENTITY FULL;

-- 7) Agent Definitions
CREATE TABLE public.agent_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  goal text NOT NULL,
  system_prompt text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  tool_allowlist text[] NOT NULL DEFAULT '{}',
  memory_scope text NOT NULL DEFAULT 'shared',
  model text NOT NULL DEFAULT 'openai/gpt-5',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_definitions TO authenticated;
GRANT ALL ON public.agent_definitions TO service_role;
ALTER TABLE public.agent_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_def_admin_select ON public.agent_definitions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY agents_def_admin_write  ON public.agent_definitions FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER agents_def_updated BEFORE UPDATE ON public.agent_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Agent Runs
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  goal_override text,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  summary text,
  steps int NOT NULL DEFAULT 0,
  audit_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX agent_runs_agent_idx ON public.agent_runs(agent_id, started_at DESC);
GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_runs_admin_select ON public.agent_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR triggered_by = auth.uid());

-- Seed: register baseline tool catalog (production-honest; gated entries flagged disabled)
INSERT INTO public.tool_registry (id, category, name, description, schema_json, permissions, requires_approval, enabled) VALUES
  ('m365.outlook.send_mail','outlook','Outlook: Send Mail','Send an email via Microsoft Graph using the linked Outlook connector.', '{"type":"object","required":["to","subject","body"],"properties":{"to":{"type":"array","items":{"type":"string"}},"subject":{"type":"string"},"body":{"type":"string"},"cc":{"type":"array","items":{"type":"string"}}}}'::jsonb, ARRAY['admin'], true, true),
  ('m365.teams.post_message','teams','Teams: Post Channel Message','Post a message into a Teams channel via Graph.', '{"type":"object","required":["teamId","channelId","content"],"properties":{"teamId":{"type":"string"},"channelId":{"type":"string"},"content":{"type":"string"}}}'::jsonb, ARRAY['admin'], true, true),
  ('m365.sharepoint.upload_file','sharepoint','SharePoint: Upload File','Upload a small file (<=4MB) to a SharePoint site default drive.', '{"type":"object","required":["siteId","filename","contentBase64"],"properties":{"siteId":{"type":"string"},"filename":{"type":"string"},"contentBase64":{"type":"string"}}}'::jsonb, ARRAY['admin'], true, true),
  ('m365.graph.get_user','graph','Graph: Get User','Read user profile via Microsoft Graph.', '{"type":"object","required":["userId"],"properties":{"userId":{"type":"string"}}}'::jsonb, ARRAY['admin'], false, true),
  ('rest.http','rest','REST: HTTP Request','Make an outbound HTTP request to an allowlisted host.', '{"type":"object","required":["method","url"],"properties":{"method":{"type":"string","enum":["GET","POST","PUT","PATCH","DELETE"]},"url":{"type":"string"},"headers":{"type":"object"},"body":{}}}'::jsonb, ARRAY['admin'], true, true),
  ('webhook.dispatch','webhook','Webhook: Dispatch','Send a JSON payload to a configured webhook URL.', '{"type":"object","required":["url","payload"],"properties":{"url":{"type":"string"},"payload":{"type":"object"}}}'::jsonb, ARRAY['admin'], true, true),
  ('sql.read','sql','SQL: Read Query','Run a read-only SELECT against the public schema (RLS applies as caller).', '{"type":"object","required":["table","columns"],"properties":{"table":{"type":"string"},"columns":{"type":"array","items":{"type":"string"}},"filters":{"type":"object"},"limit":{"type":"integer"}}}'::jsonb, ARRAY['admin'], false, true),
  ('supabase.invoke_edge_function','edge','Edge Function: Invoke','Invoke a Supabase Edge Function by name.', '{"type":"object","required":["name"],"properties":{"name":{"type":"string"},"payload":{}}}'::jsonb, ARRAY['admin'], true, true),
  ('sec.create_incident','internal','Security: Create Incident','Create a new sec_incidents record.', '{"type":"object","required":["title","severity"],"properties":{"title":{"type":"string"},"severity":{"type":"string"},"description":{"type":"string"},"site_id":{"type":"string"}}}'::jsonb, ARRAY['admin','moderator'], false, true),
  ('sec.update_work_order','internal','Operations: Update Work Order','Update status/assignment on a work order.', '{"type":"object","required":["id"],"properties":{"id":{"type":"string"},"status":{"type":"string"},"assigned_to":{"type":"string"}}}'::jsonb, ARRAY['admin','moderator'], false, true),
  ('sap.execute','sap','SAP: Execute (disabled)','Stub for SAP integration; enable after connecting an SAP connector.', '{}'::jsonb, ARRAY['admin'], true, false),
  ('oracle.execute','oracle','Oracle: Execute (disabled)','Stub for Oracle integration; enable after connecting an Oracle connector.', '{}'::jsonb, ARRAY['admin'], true, false),
  ('azure_ad.execute','azure_ad','Azure AD: Execute (disabled)','Stub for Azure AD admin operations; enable after granting tenant-level permissions.', '{}'::jsonb, ARRAY['admin'], true, false),
  ('n8n.execute','n8n','n8n: Execute Workflow','Trigger an MCP-exposed n8n workflow.', '{"type":"object","required":["workflowId"],"properties":{"workflowId":{"type":"string"},"payload":{}}}'::jsonb, ARRAY['admin'], true, false)
ON CONFLICT (id) DO NOTHING;

-- Seed: baseline agents
INSERT INTO public.agent_definitions (id, name, goal, system_prompt, permissions, tool_allowlist, memory_scope, enabled) VALUES
  ('incident_triager','Incident Triager','Triage open incidents, recommend severity escalations, and draft initial response plans.', 'You are the Incident Triage Agent for an industrial security operations center. Analyze open incidents using the provided context and propose a structured triage with severity, recommended assignee, and next 3 actions. Always cite the incident id.', ARRAY['admin'], ARRAY['sec.create_incident','sec.update_work_order','sql.read'], 'shared', true),
  ('compliance_auditor','Compliance Auditor','Audit recent operations for compliance gaps against governance policies and produce findings.', 'You are the Compliance Audit Agent. Inspect recent activities, permits, and patrols. Produce findings categorized as compliant / minor / major with evidence references.', ARRAY['admin'], ARRAY['sql.read','m365.outlook.send_mail'], 'shared', true),
  ('maintenance_planner','Maintenance Planner','Plan preventive maintenance based on asset health and predictions.', 'You are the Maintenance Planning Agent. Review asset health and work-order history to propose a prioritized 14-day maintenance schedule.', ARRAY['admin'], ARRAY['sql.read','sec.update_work_order'], 'shared', true),
  ('executive_briefer','Executive Briefer','Generate concise executive briefings from live KPIs and recent events.', 'You are the Executive Briefing Agent for industrial security leadership. Produce a 5-bullet executive summary covering risk index, top incidents, readiness, and recommended decisions.', ARRAY['admin'], ARRAY['sql.read','m365.outlook.send_mail','m365.teams.post_message'], 'shared', true)
ON CONFLICT (id) DO NOTHING;
