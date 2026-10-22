/**
 * Backup reasoning path for SADEED ("سَدِيد لا يتعطل", layer 2).
 *
 * When the direct Gemini key is exhausted (free-tier quota 429) or the vendor
 * fails transiently, the same turn is answered through the configured OpenAI-compatible provider
 * with a Gemini model — the user never sees a quota error or an endless spinner.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { classifyProviderFailure } from "./provider-error";

export const SADEED_BACKUP_MODEL = "google/gemini-3-flash-preview";

/** Only quota, rate-limit and transient upstream failures move to the backup. */
export function shouldUseBackup(error: unknown): boolean {
  return classifyProviderFailure(error).backupEligible;
}

export function createSadeedBackupModel() {
  const key = process.env.OPENAI_API_KEY?.trim();
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  if (!key || !baseURL) return null;
  // This route speaks a Gemini gateway model, not an OpenAI model. A key
  // alone must never enable provider spend or bypass the chat route's
  // explicit direct-OpenAI opt-in. Require a separately configured gateway.
  let endpoint: URL;
  try {
    endpoint = new URL(baseURL);
  } catch {
    return null;
  }
  const host = endpoint.hostname.toLowerCase().replace(/\.$/, "");
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    host === "openai.com" ||
    host.endsWith(".openai.com")
  ) {
    return null;
  }
  const provider = createOpenAICompatible({
    name: "sadeed-openai-compatible",
    baseURL,
    headers: { Authorization: `Bearer ${key}` },
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
