/**
 * Backup reasoning path for SADEED ("سَدِيد لا يتعطل", layer 2).
 *
 * When the direct Gemini key is exhausted (free-tier quota 429) or the vendor
 * fails transiently, the same turn is answered through the Lovable AI Gateway
 * with a Gemini model — the user never sees a quota error or an endless spinner.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const SADEED_BACKUP_MODEL = "google/gemini-3-flash-preview";

/** Only quota, rate-limit and transient upstream failures move to the backup. */
export function shouldUseBackup(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    /\b(429|500|502|503|504)\b/.test(msg) ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable")
  );
}

export function createSadeedBackupModel() {
  const key = process.env.LOVABLE_API_KEY?.trim();
  if (!key) return null;
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return provider(SADEED_BACKUP_MODEL);
}

/** Direct-key quota cool-down: skip the exhausted key instead of waiting on it. */
let primaryCooldownUntil = 0;
export function primaryCoolingDown(now = Date.now()): boolean {
  return now < primaryCooldownUntil;
}
export function coolPrimary(ms = 10 * 60_000, now = Date.now()): void {
  primaryCooldownUntil = now + ms;
}
