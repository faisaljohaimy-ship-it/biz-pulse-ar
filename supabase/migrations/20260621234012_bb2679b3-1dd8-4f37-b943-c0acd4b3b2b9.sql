-- Explicit admin-only Realtime channel authorization for security operations tables.
-- The sec_* tables are published to supabase_realtime and consumed via postgres_changes
-- (which enforces per-table RLS, admin-only). The existing realtime.messages policies
-- only allow 'user:<uid>' topics, so non-admin clients cannot subscribe to public:sec_*
-- topics. We add an explicit admin allow policy to make intent unambiguous and to cover
-- any future Broadcast/Presence channels scoped to security operations topics.

CREATE POLICY "admins_can_subscribe_sec_channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() LIKE 'public:sec_%'
    OR realtime.topic() LIKE 'sec:%'
  )
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "admins_can_broadcast_sec_channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'public:sec_%'
    OR realtime.topic() LIKE 'sec:%'
  )
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);