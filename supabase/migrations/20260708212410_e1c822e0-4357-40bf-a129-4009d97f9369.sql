
DROP POLICY IF EXISTS admins_can_broadcast_sec_channels ON realtime.messages;
DROP POLICY IF EXISTS admins_can_subscribe_sec_channels ON realtime.messages;

CREATE POLICY admins_can_subscribe_sec_channels
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    (realtime.topic() ~ '^sec:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:|$)')
    OR
    (realtime.topic() ~ '^public:sec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_|$)')
  )
  AND public.is_org_member(
    (substring(realtime.topic() from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'))::uuid,
    'admin'::org_role
  )
);

CREATE POLICY admins_can_broadcast_sec_channels
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (realtime.topic() ~ '^sec:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:|$)')
    OR
    (realtime.topic() ~ '^public:sec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_|$)')
  )
  AND public.is_org_member(
    (substring(realtime.topic() from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'))::uuid,
    'admin'::org_role
  )
);
