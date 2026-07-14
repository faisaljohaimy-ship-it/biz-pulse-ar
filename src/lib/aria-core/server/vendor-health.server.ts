/**
 * Vendor health / cool-down registry.
 *
 * In-memory, per-Worker instance. Not persistent, not distributed — that's OK:
 * the goal is to react FAST when one AI vendor starts returning a fatal
 * quota/auth error, and re-prefer another configured vendor on the very next
 * request so ARIA stays online continuously. Keeps ARIA "permanently on" as
 * long as ANY configured provider still has credit.
 *
 * Cool-down TTL is deliberately short (10 minutes) so a temporary top-up or
 * transient upstream blip auto-recovers without a deploy.
 */

export type AiVendor = "openai" | "google" | "anthropic" | "openrouter" | "lovable";

const COOLDOWN_MS = 10 * 60 * 1000;
const state = new Map<AiVendor, number>(); // vendor → coolingUntil (epoch ms)

export function isCooling(vendor: AiVendor, now: number = Date.now()): boolean {
  const until = state.get(vendor);
  if (!until) return false;
  if (until <= now) {
    state.delete(vendor);
    return false;
  }
  return true;
}

export function markVendorFatal(vendor: AiVendor, reason: string, now: number = Date.now()): void {
  state.set(vendor, now + COOLDOWN_MS);
  // Structured log so operators can trace outages.
  console.warn("[vendor-health] cooling vendor", {
    vendor,
    reason,
    coolingUntil: new Date(now + COOLDOWN_MS).toISOString(),
  });
}

/** Classify an upstream error message; returns true iff the vendor should be cooled. */
export function shouldCoolFromError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  const status = (errorMessage.match(/\b(4\d\d|5\d\d)\b/) ?? [])[1];
  if (status === "402") return true;
  if (status === "401" || status === "403") return true;
  if (msg.includes("credit") || msg.includes("quota") || msg.includes("insufficient")) return true;
  if (msg.includes("balance") && (msg.includes("low") || msg.includes("depleted"))) return true;
  return false;
}

/** Explicit reset — used by tests. */
export function _resetVendorHealthForTests(): void {
  state.clear();
}
