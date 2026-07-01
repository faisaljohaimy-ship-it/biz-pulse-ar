// Policy factory. Zero-trust defaults.
import type { MeshPolicy } from "./types";
import { PolicyZ } from "./contracts";

export function createPolicy(overrides: Partial<MeshPolicy> = {}): MeshPolicy {
  return PolicyZ.parse({
    requireMutualAuth: overrides.requireMutualAuth ?? true,
    maxTtl: overrides.maxTtl ?? 30,
    maxHops: overrides.maxHops ?? 8,
    allowedCapabilities: overrides.allowedCapabilities ?? [],
    deniedCapabilities: overrides.deniedCapabilities ?? [],
    zeroTrust: overrides.zeroTrust ?? true,
  });
}

export function authorizeCapability(
  policy: MeshPolicy,
  capability: string,
): { authorized: boolean; reason: string } {
  if (policy.deniedCapabilities.includes(capability)) {
    return { authorized: false, reason: "denied_by_policy" };
  }
  if (policy.allowedCapabilities.length > 0 && !policy.allowedCapabilities.includes(capability)) {
    return { authorized: false, reason: "not_in_allow_list" };
  }
  return { authorized: true, reason: "allowed" };
}
