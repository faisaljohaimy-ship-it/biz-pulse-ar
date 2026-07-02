// Support plan.
import type { EvidenceRef, SupportChannel, SupportPlan } from "./types";
import { SupportChannelZ } from "./contracts";

export function buildSupportPlan(input: {
  pilotId: string;
  channels: ReadonlyArray<SupportChannel>;
  escalationPath: ReadonlyArray<string>;
  evidence: ReadonlyArray<EvidenceRef>;
}): SupportPlan {
  if (input.channels.length === 0) throw new Error("support plan requires at least one channel");
  if (input.escalationPath.length === 0) {
    throw new Error("support plan requires an escalation path");
  }
  if (input.evidence.length === 0) throw new Error("support plan requires evidence");
  return {
    pilotId: input.pilotId,
    channels: input.channels.map((c) => SupportChannelZ.parse(c)),
    escalationPath: [...input.escalationPath],
    evidence: input.evidence,
  };
}
