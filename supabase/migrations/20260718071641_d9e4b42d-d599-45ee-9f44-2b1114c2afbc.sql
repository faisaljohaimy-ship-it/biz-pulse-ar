-- 1) Add org_id columns
ALTER TABLE public.aria_alerts ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.aria_alert_acks ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2) Backfill from creator's org membership (best effort; unmatched rows get default org)
UPDATE public.aria_alerts a
SET org_id = m.org_id
FROM public.org_members m
WHERE a.org_id IS NULL AND m.user_id = a.created_by;

UPDATE public.aria_alerts
SET org_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE org_id IS NULL;

UPDATE public.aria_alert_acks k
SET org_id = a.org_id
FROM public.aria_alerts a
WHERE k.org_id IS NULL AND k.alert_id = a.id;

-- 3) Enforce NOT NULL
ALTER TABLE public.aria_alerts ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.aria_alert_acks ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS aria_alerts_org_idx ON public.aria_alerts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_alert_acks_org_idx ON public.aria_alert_acks(org_id);

-- 4) Replace permissive read-all with org-scoped policies
DROP POLICY IF EXISTS "alerts_read_all" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_insert_privileged" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_update_own" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_delete_own" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_tenant_isolation" ON public.aria_alerts;

CREATE POLICY "alerts_tenant_isolation" ON public.aria_alerts
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::public.org_role))
  WITH CHECK (public.is_org_member(org_id, 'viewer'::public.org_role));

CREATE POLICY "alerts_read_org" ON public.aria_alerts
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::public.org_role));

CREATE POLICY "alerts_insert_privileged" ON public.aria_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_org_member(org_id, 'manager'::public.org_role)
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
    )
  );

CREATE POLICY "alerts_update_own" ON public.aria_alerts
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND public.is_org_member(org_id, 'manager'::public.org_role))
  WITH CHECK (auth.uid() = created_by AND public.is_org_member(org_id, 'manager'::public.org_role));

CREATE POLICY "alerts_delete_own" ON public.aria_alerts
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by AND public.is_org_member(org_id, 'manager'::public.org_role));

-- 5) Ack policies — tenant-scoped
DROP POLICY IF EXISTS "acks_self_select" ON public.aria_alert_acks;
DROP POLICY IF EXISTS "acks_self_insert" ON public.aria_alert_acks;
DROP POLICY IF EXISTS "acks_tenant_isolation" ON public.aria_alert_acks;

CREATE POLICY "acks_tenant_isolation" ON public.aria_alert_acks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_org_member(org_id, 'viewer'::public.org_role))
  WITH CHECK (public.is_org_member(org_id, 'viewer'::public.org_role));

CREATE POLICY "acks_self_select" ON public.aria_alert_acks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "acks_self_insert" ON public.aria_alert_acks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.aria_alerts a WHERE a.id = alert_id AND a.org_id = aria_alert_acks.org_id)
  );