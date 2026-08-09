/**
 * بوّابة «مجلس العشرة» — إثبات **سلوكيّ** لا نصّي.
 *
 * ## لماذا هذا الملف موجود إلى جانب `chat-latency.contract.test.ts`
 *
 * ذاك يقرأ نصّ المصدر ويتأكّد أن الشرط مكتوب. وهذا يشغّل المعالج فعلًا
 * ويسأل: **هل استُدعي المجلس؟** والفرق بينهما ليس تجميلًا:
 *
 * حين أردتُ التحقّق أوّل مرّة رفعتُ خادم `vite preview` وقِستُ عليه زمن
 * أوّل بايت ورموز الحالة. وكانت كل الأرقام كذبًا: هذا المشروع يبني إلى
 * `.output/` (إعداد nitro)، بينما `vite preview` يستورد
 * `dist/server/server.js` — فيفشل استيراد الخادم عند كل طلب. فما ظهر
 * «200 في ٧ مللي ثانية» كان `index.html` من احتياط الـSPA، وما ظهر «500»
 * كان فشل الاستيراد نفسه. أي أن الرقمين معًا لم يمسّا `/api/chat` أصلًا،
 * ومنهما وُلد «عُطلان» لا وجود لهما: `replyMode: "bogus"` يعيد ٤٠٠ صحيحةً
 * دائمًا، ولا 500 متقطّعة في المسار الافتراضي.
 *
 * **الدرس:** خادمٌ يردّ ليس خادمًا يعمل. والاختبار الذي لا يُثبت أنه بلغ
 * الكود المقصود يقيس شيئًا آخر ويسمّيه باسمه.
 *
 * ## لماذا هو محكم البيئة
 *
 * يُثبّت المتغيّرات بنفسه ويوقف كل خرج شبكي: بلا ذلك يقرأ الاختبار بيئة
 * المشغّل — فيسلك المعالج مسار «الردّ المضمون المحلي» حين لا مفتاح، ويمرّ
 * فحص الافتراضي لسببٍ خاطئ (لأن الطلب لم يبلغ البوّابة) بينما يسقط فحص
 * `deep`. حارسٌ يمرّ لأن الكود لم يُنفَّذ أسوأ من غياب الحارس.
 */
import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";

/** كل استدعاء للمجلس يُسجَّل هنا — وهو موضع الحكم في هذا الملف. */
const councilCalls: unknown[] = [];

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

/**
 * عميل Supabase صوري: كل سلسلة استدعاءات تنتهي إلى `{data: null}`.
 * الغرض منع أي خرج شبكي — لا محاكاة سلوك القاعدة.
 */
function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    from: () => chain,
    rpc: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  };
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));

vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));

/** المحدِّد يسمح — فحصه ليس موضوع هذا الملف. */
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true, remaining: 99 }),
  rateLimitUnavailableResponse: () => new Response("unavailable", { status: 503 }),
}));

vi.mock("@/lib/sadeed/orchestrator", () => ({
  runAgentMission: async (input: unknown) => {
    councilCalls.push(input);
    return {
      mission_id: "mission-stub",
      results: [],
      answer: {
        text_ar: "خلاصة صورية",
        text_en: "",
        risks: [],
        recommendation: null,
        next_action: null,
      },
    };
  },
}));

/** لا استدعاء نموذجٍ حقيقي — الزمن هنا زمن المنطق لا زمن المزوّد. */
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => ({ text: "ردّ صوري." }),
}));

afterAll(() => vi.unstubAllEnvs());

type Handler = (args: { request: Request }) => Promise<Response>;

async function post(extra: Record<string, unknown>) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "ما نطاق SEC-18؟" }] }],
        threadId: "thread-stub",
        ...extra,
      }),
    }),
  });
}

beforeEach(() => {
  councilCalls.length = 0;
});

describe("المجلس اختياريّ لا افتراضيّ — سلوكيًّا", () => {
  it("المسار الافتراضي يردّ ولا يستدعي المجلس", async () => {
    const res = await post({});
    expect(res.status).toBe(200);
    expect(councilCalls, "المجلس استُدعي في المسار الافتراضي").toHaveLength(0);
  });

  it('`replyMode: "deep"` يستدعيه — فالقدرة محفوظة لا محذوفة', async () => {
    // هذا الفحص هو ما يفرّق بين «بوّابة» و«حذفٍ صامت»: شرطٌ لا يتحقّق
    // أبدًا يُنجح الفحص الأوّل وحده، وهذا الثاني يكشفه.
    const res = await post({ replyMode: "deep" });
    expect(res.status).toBe(200);
    expect(councilCalls, "المجلس لم يُستدعَ رغم الطلب الصريح").toHaveLength(1);
  });

  it("وضعٌ غير معروف يُرفض ٤٠٠ قبل أي عمل", async () => {
    const res = await post({ replyMode: "bogus" });
    expect(res.status).toBe(400);
    expect(councilCalls).toHaveLength(0);
  });

  it("`voice` ما زال مقبولًا — التشديد لم يكسر وضعًا قائمًا", async () => {
    const res = await post({ replyMode: "voice" });
    expect(res.status).toBe(200);
    expect(councilCalls).toHaveLength(0);
  });
});
