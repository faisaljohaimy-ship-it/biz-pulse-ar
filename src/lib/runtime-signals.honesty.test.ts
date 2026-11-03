// @vitest-environment node
/**
 * صدق إشارات التشغيل بعد فصل لوفيبل — اختبارٌ سلوكي بتشغيل دوال الخادم نفسها (وقت بدء TanStack مُحاكى).
 *
 * ① شريحة «الذكاء الاصطناعي» على `/live-dashboard` كانت `aiKeyReady = Boolean(LOVABLE_API_KEY)` — مفتاحُ
 *    بوّابة الاحتياط الاختيارية لا المحرّك — فتُعرض «حرج» والمساعد يعمل بمفتاح Gemini المباشر.
 *    الجاهزية الآن = وجود `GEMINI_API_KEY` أو `GOOGLE_GENERATIVE_AI_API_KEY` (وجودٌ فقط، لا قيمة).
 * ② قائمتا الأسرار المتابَعة (جرد مركز الأمن · جدول التدوير) لا تعرضان `LOVABLE_API_KEY` سطرًا «غير مضبوط».
 * ③ نصوص العرض تسمّي القاعدة «Supabase» لا «Lovable Cloud».
 *
 * كل اختبارٍ هنا يحمرّ عند إرجاع الشرط/النص القديم (المادة ٣٠).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SENTINEL = "gemini-key-sentinel-not-a-secret-9f3a";

vi.mock("@tanstack/react-start", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- محاكاة سلسلة createServerFn
  const chain: any = {
    middleware: () => chain,
    inputValidator: () => chain,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (fn: any) => fn,
  };
  return { createServerFn: () => chain };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/optional-auth-middleware", () => ({ optionalSupabaseAuth: {} }));
vi.mock("@/lib/authz.server", () => ({
  requirePlatformAdmin: async () => {},
  hasPlatformRole: async () => true,
}));
vi.mock("@/lib/exec/workflow-engine.server", () => ({ triggerWorkflow: vi.fn() }));
vi.mock("@/lib/exec/showcase-simulation.server", () => ({
  resilient: async <T>(_label: string, work: () => Promise<T>) => work(),
  buildConnectorsSimulation: () => [],
  buildFabricRowsSimulation: () => ({ eventRows: [], alertRows: [], taskRows: [] }),
}));

/** استعلامٌ فارغ قابل للانتظار: كل حلقة في السلسلة تعيد نفسها، والانتظار يعطي صفوفًا خاوية. */
function emptyQuery() {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "gte", "in", "order", "limit", "eq"]) q[m] = () => q;
  q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return q;
}
const supabase = { from: () => emptyQuery() };
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: supabase }));

import { getSystemPulse } from "./executive-presentation.functions";
import { getSecretInventory } from "./security-center.functions";
import { getSecretsRotationStatus } from "./governance/governance.functions";
import { getFabricSnapshot } from "./intelligence.functions";
import { listIntegrations } from "./integrations/stubs.functions";

type Call = (ctx: unknown) => Promise<unknown>;
const call = (fn: unknown, ctx: unknown = { context: { supabase, userId: "u1" } }) =>
  (fn as Call)(ctx);

const AI_KEYS = ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "LOVABLE_API_KEY"] as const;

describe("شريحة «الذكاء الاصطناعي»: الجاهزية = مفتاح Gemini لا مفتاح لوفيبل", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    for (const k of AI_KEYS) delete process.env[k];
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  const aiChip = async () => {
    const pulse = (await call(getSystemPulse)) as {
      chips: Array<{ key: string; status: string }>;
    };
    return { pulse, chip: pulse.chips.find((c) => c.key === "ai")! };
  };

  it("GEMINI_API_KEY وحده (بلا LOVABLE_API_KEY) ⇒ ليست حرجة", async () => {
    process.env.GEMINI_API_KEY = SENTINEL;
    const { chip } = await aiChip();
    expect(chip.status).not.toBe("critical");
  });

  it("GOOGLE_GENERATIVE_AI_API_KEY وحده ⇒ ليست حرجة", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = SENTINEL;
    const { chip } = await aiChip();
    expect(chip.status).not.toBe("critical");
  });

  it("لا مفتاح Gemini ⇒ حرجة، ولو وُجد LOVABLE_API_KEY (بوّابة الاحتياط ليست المحرّك)", async () => {
    process.env.LOVABLE_API_KEY = "lovable-key-stub-not-a-secret";
    expect((await aiChip()).chip.status).toBe("critical");
    delete process.env.LOVABLE_API_KEY;
    expect((await aiChip()).chip.status).toBe("critical");
  });

  it("مفتاح Gemini فارغ أو مسافات ⇒ غياب (حرجة)", async () => {
    for (const blank of ["", "   "]) {
      process.env.GEMINI_API_KEY = blank;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = blank;
      expect((await aiChip()).chip.status, JSON.stringify(blank)).toBe("critical");
    }
  });

  it("وجودٌ فقط: قيمة المفتاح لا تظهر في أي حقلٍ من النبض", async () => {
    process.env.GEMINI_API_KEY = SENTINEL;
    const { pulse } = await aiChip();
    expect(JSON.stringify(pulse)).not.toContain(SENTINEL);
  });
});

describe("قوائم الأسرار المتابَعة: لا LOVABLE_API_KEY «غير مضبوطًا»", () => {
  it("جرد مركز الأمن يحوي مفتاحَي Gemini ولا يحوي LOVABLE_API_KEY", async () => {
    const inv = (await call(getSecretInventory)) as Array<{ name: string }>;
    const names = inv.map((s) => s.name);
    expect(names).toContain("GEMINI_API_KEY");
    expect(names).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(names).not.toContain("LOVABLE_API_KEY");
  });

  it("جدول التدوير يتتبّع الأسرار الباقية ولا يتتبّع LOVABLE_API_KEY", async () => {
    const rows = (await call(getSecretsRotationStatus)) as Array<{ secret_name: string }>;
    const names = rows.map((r) => r.secret_name);
    expect(names).toEqual(
      expect.arrayContaining([
        "MICROSOFT_GRAPH_CLIENT_SECRET",
        "ELEVENLABS_API_KEY",
        "RESEND_API_KEY",
      ]),
    );
    expect(names).not.toContain("LOVABLE_API_KEY");
  });
});

describe("نصوص العرض: القاعدة «Supabase» لا «Lovable Cloud»", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("مصادر نسيج الذكاء", async () => {
    const snap = (await call(getFabricSnapshot)) as {
      sources: Array<{ id: string; label: string }>;
    };
    expect(snap.sources.find((s) => s.id === "supabase")?.label).toBe("Supabase");
    expect(JSON.stringify(snap.sources)).not.toMatch(/lovable/i);
  });

  it("مركز التكاملات", async () => {
    // موصّلٌ خارجي واحد مضبوط ⇒ تُعاد الصفوف الحيّة لا المحاكاة.
    process.env.SAP_BASE_URL = "https://sap.example.test";
    process.env.SAP_CLIENT_ID = "id";
    process.env.SAP_CLIENT_SECRET = "s";
    const rows = (await call(listIntegrations, {})) as Array<{ id: string; label: string }>;
    expect(rows.find((r) => r.id === "supabase")?.label).toBe("Supabase");
    expect(rows.map((r) => r.label).join("|")).not.toMatch(/lovable cloud/i);
  });
});
