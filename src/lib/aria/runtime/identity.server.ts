/**
 * Phase 9.2 — Identity issuance for runtime agents.
 * Fingerprint is deterministic per (agent_id, org, parent, issuer).
 */

import type { AgentIdentity } from "./types";

export interface IssueIdentityInput {
  agent_id: string;
  display_name: string;
  org_id: string | null;
  parent_agent_id: string | null;
  issued_by: string;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export async function issueIdentity(input: IssueIdentityInput): Promise<AgentIdentity> {
  const created_at = new Date().toISOString();
  const fingerprint = await sha256Hex(
    `${input.agent_id}|${input.org_id ?? ""}|${input.parent_agent_id ?? ""}|${input.issued_by}|${created_at}`,
  );
  return {
    agent_id: input.agent_id,
    display_name: input.display_name,
    org_id: input.org_id,
    parent_agent_id: input.parent_agent_id,
    created_at,
    issued_by: input.issued_by,
    fingerprint,
  };
}
