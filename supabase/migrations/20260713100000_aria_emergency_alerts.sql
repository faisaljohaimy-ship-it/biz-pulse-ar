-- ============================================================================
-- ARIA Agent — Phase 4: emergency broadcast alerts + read acknowledgements.
--
-- ADDITIVE ONLY, idempotent. No existing table is altered or dropped, so there
-- is no data-loss risk (constitution art. 2). Rollback: DROP the two tables
-- below (documented in docs/ROLLBACK.md).
--
-- Design: an alert is created by an authenticated user and broadcast to all
-- authenticated users (they can SELECT it), scoped to a region or "all". Each
-- user records their own read acknowledgement in aria_alert_acks. The service
-- role (accountability view / dispatch worker) reads across users.
-- ============================================================================

-- ============ aria_alerts ===================================================
CREATE TABLE IF NOT EXISTS public.aria_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'critical' CHECK (severity IN ('info', 'warning', 'critical')),
  -- 'all' or one of the four region ids (central/western/eastern/southern).
  target TEXT NOT NULL DEFAULT 'all',
  channels JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["email","sms"] actually dispatched
  dispatched INTEGER NOT NULL DEFAULT 0,       -- recipient count (0 in demo mode)
  is_simulation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_alerts TO authenticated;
GRANT ALL ON public.aria_alerts TO service_role;
ALTER TABLE public.aria_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alerts_read_all" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_insert_self" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_update_own" ON public.aria_alerts;
DROP POLICY IF EXISTS "alerts_delete_own" ON public.aria_alerts;
-- Broadcast: every authenticated user can read alerts.
CREATE POLICY "alerts_read_all" ON public.aria_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts_insert_self" ON public.aria_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "alerts_update_own" ON public.aria_alerts FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "alerts_delete_own" ON public.aria_alerts FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE INDEX IF NOT EXISTS aria_alerts_recent_idx ON public.aria_alerts(created_at DESC);

-- ============ aria_alert_acks ===============================================
CREATE TABLE IF NOT EXISTS public.aria_alert_acks (
  alert_id UUID NOT NULL REFERENCES public.aria_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, user_id)
);
GRANT SELECT, INSERT ON public.aria_alert_acks TO authenticated;
GRANT ALL ON public.aria_alert_acks TO service_role;
ALTER TABLE public.aria_alert_acks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acks_self_select" ON public.aria_alert_acks;
DROP POLICY IF EXISTS "acks_self_insert" ON public.aria_alert_acks;
-- A user sees and records only their own acknowledgements (the accountability
-- view for managers reads via the service role).
CREATE POLICY "acks_self_select" ON public.aria_alert_acks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "acks_self_insert" ON public.aria_alert_acks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
