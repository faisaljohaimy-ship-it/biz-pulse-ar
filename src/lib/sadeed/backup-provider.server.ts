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
  const status =
    error && typeof error === "object" && "statusCode" in error
      ? Number(error.statusCode)
      : Number(msg.match(/\b(4\d\d|5\d\d)\b/)?.[1]);
  // A denial or invalid request stays terminal, even when its text contains
  // "quota" or "unavailable". Never spend on a second provider for it.
  if ([400, 401, 402, 403].includes(status)) return false;
  return (
    /\b(429|500|502|503|504)\b/.test(msg) ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("overloaded") ||
    /high demand|experiencing (?:high )?demand|temporarily busy|try again later/i.test(msg) ||
    msg.includes("unavailable") ||
    // A retired/unknown primary model id must not leave the user with no answer.
    /model[^\n]{0,60}?not (found|supported)/.test(msg)
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
export function coolPrimary(ms = PRIMARY_COOLDOWN_DEFAULT_MS, now = Date.now()): void {
  primaryCooldownUntil = now + ms;
}

export const PRIMARY_COOLDOWN_DEFAULT_MS = 10 * 60_000;
export const PRIMARY_COOLDOWN_MIN_MS = 30_000;
export const PRIMARY_COOLDOWN_MAX_MS = 10 * 60_000;

/**
 * `Retry-After` من خطأ المزوّد (ثوانٍ أو تاريخ HTTP) بالمللي ثانية، أو `null`.
 * يقرأ `responseHeaders` التي يحملها خطأ نداء الـSDK؛ لا يرمي أبدًا.
 */
export function retryAfterMs(error: unknown, now = Date.now()): number | null {
  const headers = (error as { responseHeaders?: unknown })?.responseHeaders;
  if (!headers || typeof headers !== "object") return null;
  const entry = Object.entries(headers as Record<string, unknown>).find(
    ([k]) => k.toLowerCase() === "retry-after",
  );
  const raw = entry?.[1];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const seconds = Number(raw.trim());
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}

/**
 * مدّة تبريد المفتاح المباشر بعد خنقٍ (429/حصّة): تحترم `Retry-After` إن وُجد،
 * محصورةً بين نصف دقيقة وعشر دقائق؛ وبدونه الافتراض عشر دقائق كما كان.
 */
export function primaryCooldownFor(error: unknown, now = Date.now()): number {
  const hinted = retryAfterMs(error, now);
  if (hinted === null) return PRIMARY_COOLDOWN_DEFAULT_MS;
  return Math.min(PRIMARY_COOLDOWN_MAX_MS, Math.max(PRIMARY_COOLDOWN_MIN_MS, hinted));
}
