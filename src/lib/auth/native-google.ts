/**
 * دخول Google الأصلي عبر Supabase — دوالّ خالصة، بلا وصولٍ إلى `window`.
 *
 * السبب (قِيس على الإنتاج ٢٠٢٦/١٠/٢٩): الزرّ كان يستدعي وسيط Lovable الذي يتّجه إلى
 * `/~oauth/initiate`، وهو مسارٌ تخدمه استضافة Lovable وحدها؛ والإنتاج على Vercel بمشروع
 * Supabase خاصّ به، فيعود المسار 404 ويهبط المستخدم على صفحة «غير موجود». هنا لا وسيط:
 * القدرة تُسأل أولًا من نقطة الصحة العامة، والزرّ لا يعمل إلا حين يؤكّدها الخادم.
 */

export type GoogleProviderState = "enabled" | "disabled" | "unknown";

/** نقطة القدرة العامة (منطقيّات فقط، بلا هويات ولا أسرار). */
export const GOOGLE_PROBE_PATH = "/api/fnn/auth-health";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * يسأل: هل مزوّد Google مفعّلٌ في خدمة الهوية؟
 * `enabled` بتأكيدٍ صريح فقط (200 و`checked` و`googleEnabled` كلاهما `true`)؛
 * `disabled` حين يقول الخادم صراحةً إنه فحص ولم يجده مفعّلًا؛
 * وكل ما عدا ذلك (انقطاع، غير 200، جسمٌ مشوَّه، مهلة) `unknown` — لا يُخمَّن تفعيلٌ ولا تعطيل.
 */
export async function probeGoogleProvider(
  fetchFn: FetchLike,
  { timeoutMs = 5_000 }: { timeoutMs?: number } = {},
): Promise<GoogleProviderState> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // المهلة سباقٌ صريح لا اعتمادًا على احترام `fetch` لإشارة الإلغاء: الجسم المعلَّق يُحتسب أيضًا.
  const deadline = new Promise<GoogleProviderState>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("unknown");
    }, timeoutMs);
  });
  const run = (async (): Promise<GoogleProviderState> => {
    const response = await fetchFn(GOOGLE_PROBE_PATH, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status !== 200) return "unknown";
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return "unknown";
    const { checked, googleEnabled } = body as { checked?: unknown; googleEnabled?: unknown };
    if (checked !== true) return "unknown";
    return googleEnabled === true ? "enabled" : "disabled";
  })().catch((): GoogleProviderState => "unknown");
  try {
    return await Promise.race([run, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// eslint-disable-next-line no-control-regex -- الغرض رفض محارف التحكّم صراحةً
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * وجهة العودة بعد الدخول: مسارٌ من الأصل نفسه فحسب. يبدأ بشرطةٍ مائلة واحدة؛ ما عدا ذلك
 * (`//host` · `https://…` · `javascript:` · شرطة عكسية · محارف تحكّم · فراغ) ⇒ `/`.
 */
export function safeAuthTarget(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("\\") || CONTROL_CHARS.test(raw)) return "/";
  // حزام ثانٍ: لو حلّ المحلِّل هذا المسار خارج أصله فهو مرفوض.
  try {
    if (new URL(raw, "https://origin.invalid").origin !== "https://origin.invalid") return "/";
  } catch {
    return "/";
  }
  return raw;
}

/**
 * وسائط `supabase.auth.signInWithOAuth` لـGoogle. الأصل https (أو http على localhost/127.0.0.1
 * للتطوير) بلا بيانات اعتماد مضمَّنة، وإلا يرمي — لا يُبنى رابط عودةٍ على أصلٍ غير آمن.
 * بلا `skipBrowserRedirect`: التوجيه يتولّاه المتصفّح.
 */
export function googleOAuthOptions(origin: string, target: unknown) {
  const base = new URL(origin);
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if (
    base.username ||
    base.password ||
    (base.protocol !== "https:" && !(local && base.protocol === "http:"))
  ) {
    throw new Error("unsafe_auth_origin");
  }
  return {
    provider: "google" as const,
    options: {
      redirectTo: new URL(safeAuthTarget(target), base.origin).href,
      queryParams: { prompt: "select_account" },
    },
  };
}

/** نصوص الحالة — ثابتة، لا تعكس نصّ خادمٍ ولا تحوي عبارات مصادقة تقنية. */
export function googleNoticeMessage(kind: "disabled" | "unknown", isAr: boolean): string {
  if (kind === "disabled") {
    return isAr
      ? "دخول Google غير مفعّل في النظام بعد. استخدم البريد وكلمة المرور أدناه."
      : "Google sign-in is not enabled yet. Use email and password below.";
  }
  return isAr
    ? "تعذّر التحقق من دخول Google الآن. استخدم البريد وكلمة المرور."
    : "Google sign-in could not be verified right now. Use email and password.";
}
