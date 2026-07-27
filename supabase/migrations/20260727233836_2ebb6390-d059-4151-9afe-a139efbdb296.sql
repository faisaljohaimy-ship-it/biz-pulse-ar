-- 1) Tighten sec_incidents admin write: require operator+ org membership
DROP POLICY IF EXISTS sec_incidents_admin_write ON public.sec_incidents;
CREATE POLICY sec_incidents_admin_write ON public.sec_incidents
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_org_member(org_id, 'operator'::org_role));

-- 2) Realtime broadcast: anchor UUID extraction to the topic prefix so a
-- crafted topic like "sec:BAD-<validuuid>:..." cannot smuggle another org's
-- UUID into the org-membership check.
DROP POLICY IF EXISTS admins_can_subscribe_sec_channels ON realtime.messages;
CREATE POLICY admins_can_subscribe_sec_channels ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    (
      realtime.topic() ~ '^sec:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:|$)'
      AND is_org_member(
        (substring(realtime.topic() FROM '^sec:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid,
        'admin'::org_role
      )
    )
    OR
    (
      realtime.topic() ~ '^public:sec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_|$)'
      AND is_org_member(
        (substring(realtime.topic() FROM '^public:sec_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid,
        'admin'::org_role
      )
    )
  );

DROP POLICY IF EXISTS admins_can_broadcast_sec_channels ON realtime.messages;
CREATE POLICY admins_can_broadcast_sec_channels ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      realtime.topic() ~ '^sec:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:|$)'
      AND is_org_member(
        (substring(realtime.topic() FROM '^sec:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid,
        'admin'::org_role
      )
    )
    OR
    (
      realtime.topic() ~ '^public:sec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_|$)'
      AND is_org_member(
        (substring(realtime.topic() FROM '^public:sec_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::uuid,
        'admin'::org_role
      )
    )
  );