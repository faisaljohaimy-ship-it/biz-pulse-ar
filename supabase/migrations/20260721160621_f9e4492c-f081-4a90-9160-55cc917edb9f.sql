-- Close anon-read on agent_connections and agent_approval_proposals.
-- Showcase visitors now read a curated topology via listShowcaseFlow (server fn).

revoke select on public.agent_connections from anon;
revoke select on public.agent_approval_proposals from anon;

drop policy if exists "agent_connections_public_read" on public.agent_connections;
create policy "agent_connections_org_read" on public.agent_connections
  for select to authenticated
  using (is_org_member(org_id, 'viewer'::org_role));

drop policy if exists "agent_approval_public_read" on public.agent_approval_proposals;
create policy "agent_approval_org_read" on public.agent_approval_proposals
  for select to authenticated
  using (is_org_member(org_id, 'viewer'::org_role));
