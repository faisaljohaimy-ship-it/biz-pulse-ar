/**
 * Phase 9.2 — Capability negotiation between agents.
 */

import { NegotiationOfferSchema } from "./contracts";
import type { NegotiationOffer } from "./types";

const offers: NegotiationOffer[] = [];

export function offer(input: Omit<NegotiationOffer, "status" | "at">): NegotiationOffer {
  const o: NegotiationOffer = {
    ...input,
    status: "offered",
    at: new Date().toISOString(),
  };
  const parsed = NegotiationOfferSchema.parse(o) as NegotiationOffer;
  offers.push(parsed);
  if (offers.length > 2000) offers.splice(0, offers.length - 2000);
  return parsed;
}

function findLatest(from: string, to: string, capability: string): NegotiationOffer | null {
  for (let i = offers.length - 1; i >= 0; i--) {
    const o = offers[i]!;
    if (o.from_agent_id === from && o.to_agent_id === to && o.capability_id === capability)
      return o;
  }
  return null;
}

export function respond(
  from: string,
  to: string,
  capability: string,
  status: "accepted" | "rejected" | "counter" | "expired",
  terms?: Record<string, unknown>,
): NegotiationOffer {
  const latest = findLatest(from, to, capability);
  if (!latest) throw new Error(`runtime: no offer to respond to`);
  const next: NegotiationOffer = {
    ...latest,
    status,
    terms: terms ?? latest.terms,
    at: new Date().toISOString(),
  };
  offers.push(next);
  return next;
}

export function listOffers(agentId?: string): NegotiationOffer[] {
  if (!agentId) return [...offers];
  return offers.filter((o) => o.from_agent_id === agentId || o.to_agent_id === agentId);
}
