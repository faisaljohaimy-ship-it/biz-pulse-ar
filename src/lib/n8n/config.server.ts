/**
 * قراءة إعداد n8n من البيئة — الموضع الوحيد في المستودع الذي يقرأ أسماء هذا الربط.
 *
 * قدرةٌ **اختيارية**: غياب أي متغيّر ⇐ `not_configured` متزامنًا بلا شبكة، لا خطأ ولا استثناء
 * (عقيدة «سَدِيد لا يتعطل»: غياب مفتاحٍ لا يُسقط سطحًا). ولا تُسجَّل هنا ولا تُعاد القيم —
 * أسماء وحالات فقط.
 *
 * ## ما يُعدّ «مهيّأً»
 *
 * - `SADEED_N8N_BASE_URL`: أصلٌ `https` عام (لا IP ولا اسم داخلي ولا مسار ولا استعلام ولا
 *   بيانات اعتماد). عنوان الويبهوك الإنتاجي = الأصل + `/webhook/` + المسار من الجدول المغلق.
 * - السرّ: `SADEED_N8N_SECRET` لمسار سَدِيد و`FINN_N8N_SECRET` لمسارَي FNN، **سرّان منفصلان**
 *   لا يقلّ كلٌّ منهما عن 32 حرفًا. وسرٌّ واحد مكرّر عبر السطحين = لا تهيئة لأيٍّ منهما:
 *   فصل النطاق قيدٌ لا نصيحة.
 *
 * ## مفاتيح التحكّم
 *
 * - `SADEED_WEB_DISABLED` (`1`/`on`/`true`): إيقافٌ كامل بلا نشر، على صيغة مفتاح الإيقاف القائم.
 * - `SADEED_WEB_RESEARCH` (`off`/`members`/`all`، الافتراضي `off`): من يحقّ لسَدِيد البحث له.
 *   **أي قيمة أخرى = `off`** (يفشل مغلقًا). ولا أثر له على سطح FNN (للمالك وحده بحارس مساره).
 */
import { isPublicHostname } from "./domain-tiers";
import { MIN_SECRET_CHARS, N8N_SURFACES, type N8nSurface } from "./protocol";

export type N8nEnv = Readonly<Record<string, string | undefined>>;

export type WebResearchMode = "off" | "members" | "all";

export interface N8nConfig {
  /** أصل n8n (`https://host`) بلا شرطة مائلة ختامية، أو `null` إن لم يصحّ. */
  readonly baseUrl: string | null;
  /** السرّ لكل سطح، أو `null` إن غاب أو قصر أو تكرّر عبر السطحين. */
  readonly secrets: Readonly<Record<N8nSurface, string | null>>;
  readonly mode: WebResearchMode;
  readonly webDisabled: boolean;
}

/** اسم متغيّر السرّ لكل سطح — فصل النطاق في الاسم نفسه. */
export const SECRET_ENV: Readonly<Record<N8nSurface, string>> = {
  sadeed: "SADEED_N8N_SECRET",
  fnn: "FINN_N8N_SECRET",
};

/** أصل `https` عام نظيف، أو `null`. لا يُقبل مسارٌ غير الجذر (عنوان الويبهوك يُبنى من الجدول لا من البيئة). */
export function parseBaseUrl(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!/^https:\/\//i.test(v)) return null;
  if (/[\s\\"'`<>]/.test(v)) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username !== "" || u.password !== "") return null;
  if (u.search !== "" || u.hash !== "") return null;
  if (u.pathname !== "/" && u.pathname !== "") return null;
  if (!isPublicHostname(u.hostname)) return null;
  return u.origin;
}

function parseSecret(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  return v.length >= MIN_SECRET_CHARS ? v : null;
}

export function parseMode(raw: string | undefined): WebResearchMode {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "members" || v === "all" ? v : "off";
}

export function parseWebDisabled(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "on" || v === "true";
}

export function readN8nConfig(env: N8nEnv = process.env): N8nConfig {
  const sadeed = parseSecret(env[SECRET_ENV.sadeed]);
  const fnn = parseSecret(env[SECRET_ENV.fnn]);
  // سرٌّ واحد مكرّر ⇒ لا فصل نطاق ⇒ لا تهيئة (يفشل مغلقًا لكلا السطحين).
  const shared = sadeed !== null && fnn !== null && sadeed === fnn;
  return {
    baseUrl: parseBaseUrl(env.SADEED_N8N_BASE_URL),
    secrets: { sadeed: shared ? null : sadeed, fnn: shared ? null : fnn },
    mode: parseMode(env.SADEED_WEB_RESEARCH),
    webDisabled: parseWebDisabled(env.SADEED_WEB_DISABLED),
  };
}

/** هل السطح مهيّأ؟ أصلٌ صالح وسرٌّ صالح لهذا السطح. */
export function isConfigured(cfg: N8nConfig, surface: N8nSurface): boolean {
  return cfg.baseUrl !== null && cfg.secrets[surface] !== null;
}

/** السطوح المهيّأة كلّها — للحالة المعروضة. */
export function configuredSurfaces(cfg: N8nConfig): N8nSurface[] {
  return N8N_SURFACES.filter((s) => isConfigured(cfg, s));
}
