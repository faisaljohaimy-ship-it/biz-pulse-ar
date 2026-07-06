
-- =========================================================
-- 1) MS user tokens (delegated per-user OAuth)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ms_user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  ms_account_id text,
  ms_upn text,
  access_token_ct text NOT NULL,      -- AES-256-GCM ciphertext (base64)
  access_token_iv text NOT NULL,      -- IV (base64)
  access_token_tag text NOT NULL,     -- auth tag (base64)
  refresh_token_ct text,
  refresh_token_iv text,
  refresh_token_tag text,
  scope text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  last_refresh_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

GRANT SELECT, DELETE ON public.ms_user_tokens TO authenticated;
GRANT ALL ON public.ms_user_tokens TO service_role;

ALTER TABLE public.ms_user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_tokens_owner_select"
  ON public.ms_user_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ms_tokens_owner_delete"
  ON public.ms_user_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ms_tokens_service_all"
  ON public.ms_user_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ms_user_tokens_updated
  BEFORE UPDATE ON public.ms_user_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) MS activity log (Graph calls per org)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ms_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service text NOT NULL,       -- outlook | teams | sharepoint | calendar | onedrive
  action text NOT NULL,        -- list | send | post | upload | download ...
  path text,
  status int,
  duration_ms int,
  items_count int,
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ms_activity_log TO authenticated;
GRANT ALL ON public.ms_activity_log TO service_role;

ALTER TABLE public.ms_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_activity_org_read"
  ON public.ms_activity_log FOR SELECT TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, 'viewer'));

CREATE POLICY "ms_activity_service_write"
  ON public.ms_activity_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ms_activity_org_time
  ON public.ms_activity_log(org_id, created_at DESC);

-- =========================================================
-- 3) SAP connections per org
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sap_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Primary',
  base_url text NOT NULL,
  auth_mode text NOT NULL CHECK (auth_mode IN ('oauth_client_credentials','basic')),
  client_id_ref text,        -- name of secret holding client id
  client_secret_ref text,    -- name of secret holding client secret
  username_ref text,
  password_ref text,
  token_url text,
  default_service text,      -- e.g. /sap/opu/odata/sap/API_BUSINESS_PARTNER
  enabled boolean NOT NULL DEFAULT true,
  last_test_at timestamptz,
  last_test_status text,
  last_test_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sap_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sap_connections TO authenticated;
GRANT ALL ON public.sap_connections TO service_role;

ALTER TABLE public.sap_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sap_conn_org_read"
  ON public.sap_connections FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'));

CREATE POLICY "sap_conn_manager_insert"
  ON public.sap_connections FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY "sap_conn_manager_update"
  ON public.sap_connections FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, 'manager'))
  WITH CHECK (public.is_org_member(org_id, 'manager'));

CREATE POLICY "sap_conn_admin_delete"
  ON public.sap_connections FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, 'admin'));

CREATE POLICY "sap_conn_service_all"
  ON public.sap_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_sap_connections_updated
  BEFORE UPDATE ON public.sap_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4) SAP sync / call log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sap_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.sap_connections(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  path text,
  status int,
  duration_ms int,
  items_count int,
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sap_sync_log TO authenticated;
GRANT ALL ON public.sap_sync_log TO service_role;

ALTER TABLE public.sap_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sap_log_org_read"
  ON public.sap_sync_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'));

CREATE POLICY "sap_log_service_write"
  ON public.sap_sync_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sap_log_org_time
  ON public.sap_sync_log(org_id, created_at DESC);
