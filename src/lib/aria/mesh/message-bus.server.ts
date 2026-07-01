// Message bus — validates messages against policy. Deduplicates by message id.
import type { MeshMessage, MeshPolicy } from "./types";
import { MessageInputZ, PolicyZ } from "./contracts";

export interface AdmissionResult {
  readonly message: MeshMessage | null;
  readonly admitted: boolean;
  readonly reason: string;
}

export function admitMessage(
  input: unknown,
  policy: MeshPolicy,
  seen: Set<string>,
): AdmissionResult {
  const parsedPolicy = PolicyZ.parse(policy);
  const parsed = MessageInputZ.parse(input);

  if (seen.has(parsed.id)) {
    return { message: null, admitted: false, reason: "duplicate_message" };
  }
  if (parsed.ttl > parsedPolicy.maxTtl) {
    return { message: null, admitted: false, reason: "ttl_exceeded" };
  }
  if (parsed.hops > parsedPolicy.maxHops) {
    return { message: null, admitted: false, reason: "hops_exceeded" };
  }
  if (parsedPolicy.requireMutualAuth && parsed.signature.length === 0) {
    return { message: null, admitted: false, reason: "unauthenticated" };
  }
  if (parsed.capability) {
    if (parsedPolicy.deniedCapabilities.includes(parsed.capability)) {
      return { message: null, admitted: false, reason: "capability_denied" };
    }
    if (
      parsedPolicy.allowedCapabilities.length > 0 &&
      !parsedPolicy.allowedCapabilities.includes(parsed.capability)
    ) {
      return { message: null, admitted: false, reason: "capability_not_allowed" };
    }
  }

  seen.add(parsed.id);
  return { message: parsed, admitted: true, reason: "admitted" };
}
