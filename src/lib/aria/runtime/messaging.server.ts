/**
 * Phase 9.2 — Inter-agent messaging bus.
 */

import { RuntimeMessageSchema } from "./contracts";
import type { RuntimeMessage } from "./types";

const inbox = new Map<string, RuntimeMessage[]>();
const broadcasts: RuntimeMessage[] = [];
const MAX_PER = 500;

function push(agentId: string, msg: RuntimeMessage): void {
  const list = inbox.get(agentId) ?? [];
  list.push(msg);
  if (list.length > MAX_PER) list.splice(0, list.length - MAX_PER);
  inbox.set(agentId, list);
}

export function sendMessage(msg: RuntimeMessage): RuntimeMessage {
  const parsed = RuntimeMessageSchema.parse(msg) as RuntimeMessage;
  if (parsed.to_agent_id === "broadcast") {
    broadcasts.push(parsed);
    if (broadcasts.length > MAX_PER) broadcasts.splice(0, broadcasts.length - MAX_PER);
  } else {
    push(parsed.to_agent_id, parsed);
  }
  return parsed;
}

export function receive(agentId: string, since_iso?: string): RuntimeMessage[] {
  const cutoff = since_iso ? Date.parse(since_iso) : 0;
  const direct = (inbox.get(agentId) ?? []).filter((m) => Date.parse(m.sent_at) >= cutoff);
  const bc = broadcasts.filter(
    (m) => Date.parse(m.sent_at) >= cutoff && m.from_agent_id !== agentId,
  );
  return [...direct, ...bc].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
}

export function clearMessages(): void {
  inbox.clear();
  broadcasts.length = 0;
}
