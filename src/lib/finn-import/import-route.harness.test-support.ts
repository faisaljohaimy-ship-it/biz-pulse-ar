/**
 * عُدّة اختبار مسار `POST /api/finn/import` المشتركة بين ملفَّي الاختبار (المصفوفة والتضعيف):
 * الحالة المحاكاة `sim` ومصانع الوحدات المحاكاة. كل ملف اختبار يستدعيها من داخل `vi.mock` حتى
 * يبقى `vi.mock` مرفوعًا لأعلى الملف ويبقى `sim` مثيلًا واحدًا لكل ملف (سجلّ الوحدات معزول لكل ملف).
 *
 * ما يُحاكى: المصادقة (`verifySupabaseUser`) وحدّ المعدّل وعميل الخدمة (مطالبة الرمز) والإدخال
 * (`prepareIngest` / `ingestKnowledgeParts`). ما لا يُحاكى: بوّابة المالك والمعالج نفسه والقارئ الآمن
 * وبانِي الوثائق والرمز الموقَّع. لا شبكة ولا قاعدة ولا مفتاح حقيقي.
 */
import { signImportToken } from "./import-token.server";
import {
  APPROVAL_SECRET,
  OWNER,
  buildRequest,
  handlersOf,
  jsonOf,
  xlsxBytes,
  type BuildOptions,
  type Handlers,
} from "./import-route.test-support";

export interface FakeIngestOutcome {
  total: number;
  queued: number;
  deduped: number;
  failed: number;
  parts: Array<"queued" | "deduped" | "failed">;
}

export const sim = {
  rateCalls: [] as Array<{ key: string; max: number; window: number }>,
  rate: { allowed: true } as { allowed: boolean; unavailable?: boolean },
  rateThrows: false,
  /**
   * السقف اليومي (`enforceAiQuota`): يمرّ بـ`enforceRateLimit` نفسها بمفاتيح `ai-daily-*`، فيُفرَد عن
   * `rateCalls` (حدّ الاستيراد في الدقيقة) كي لا يختلط العدّان؛ وحكمه يُضبط مستقلًّا.
   */
  quotaCalls: [] as Array<{ key: string; max: number; window: number }>,
  quota: { allowed: true } as { allowed: boolean; unavailable?: boolean },
  verifyCalls: 0,
  verifyUser: null as string | null,
  /** نداءات `check_rate_limit` عبر عميل الخدمة (مطالبة الرمز). */
  claimCalls: [] as Array<{ bucket: string; max: number }>,
  claimBuckets: new Map<string, number>(),
  claimMode: "normal" as "normal" | "error",
  prepareCalls: 0,
  prepareOk: true,
  ingestCalls: [] as Array<{
    parts: Array<{ title: string; text: string }>;
    deps: Record<string, unknown>;
  }>,
  ingestThrows: null as string | null,
  ingestOutcome: null as null | ((parts: unknown[]) => FakeIngestOutcome),
  fetchCalls: 0,
};

export function resetSim(): void {
  sim.rateCalls = [];
  sim.rate = { allowed: true };
  sim.rateThrows = false;
  sim.quotaCalls = [];
  sim.quota = { allowed: true };
  sim.verifyCalls = 0;
  sim.verifyUser = OWNER;
  sim.claimCalls = [];
  sim.claimBuckets = new Map();
  sim.claimMode = "normal";
  sim.prepareCalls = 0;
  sim.prepareOk = true;
  sim.ingestCalls = [];
  sim.ingestThrows = null;
  sim.ingestOutcome = null;
  sim.fetchCalls = 0;
}

/** كل ما قد يُنفَق/يُكتب: حدّ · مطالبة · تهيئة إدخال · إدخال · fetch. صفر في الحالات «بلا كتابة». */
export const spend = () => ({
  rate: sim.rateCalls.length,
  claim: sim.claimCalls.length,
  prepare: sim.prepareCalls,
  ingest: sim.ingestCalls.length,
  fetch: sim.fetchCalls,
});

// ── مصانع الوحدات المحاكاة (تُستدعى من داخل vi.mock) ───────────────────────────
export async function rateLimitModule(importOriginal: () => Promise<Record<string, unknown>>) {
  return {
    ...(await importOriginal()),
    enforceRateLimit: async (key: string, max: number, window: number) => {
      if (key.startsWith("ai-daily-")) {
        sim.quotaCalls.push({ key, max, window });
        return sim.quota;
      }
      sim.rateCalls.push({ key, max, window });
      if (sim.rateThrows) throw new Error("PLANTED-LIMITER-ERROR-QX7");
      return sim.rate;
    },
  };
}

export function hookAuthModule() {
  return {
    verifySupabaseUser: async () => {
      sim.verifyCalls++;
      return sim.verifyUser ? { userId: sim.verifyUser } : new Response("{}", { status: 401 });
    },
  };
}

export function clientServerModule() {
  return {
    supabaseAdmin: {
      // كما `check_rate_limit`: نداءٌ واحد فقط ضمن الحدّ لكل مفتاح.
      async rpc(_fn: string, args: Record<string, unknown>) {
        const bucket = String(args._bucket_key);
        const max = Number(args._max_requests);
        sim.claimCalls.push({ bucket, max });
        if (sim.claimMode === "error") return { data: null, error: { message: "boom" } };
        const n = (sim.claimBuckets.get(bucket) ?? 0) + 1;
        sim.claimBuckets.set(bucket, n);
        return { data: n <= max, error: null };
      },
    },
  };
}

export function ingestModule() {
  return {
    FINN_IMPORT_TAG: "fnn-import",
    prepareIngest: () => {
      sim.prepareCalls++;
      return sim.prepareOk
        ? {
            ok: true as const,
            supabase: { __fakeOwnerClient: true },
            origin: "https://app.example.test",
            hookSecret: "h".repeat(40),
          }
        : { ok: false as const };
    },
    ingestKnowledgeParts: async (
      parts: Array<{ title: string; text: string }>,
      deps: Record<string, unknown>,
    ) => {
      sim.ingestCalls.push({ parts, deps });
      if (sim.ingestThrows) throw new Error(sim.ingestThrows);
      if (sim.ingestOutcome) return sim.ingestOutcome(parts);
      return {
        total: parts.length,
        queued: parts.length,
        deduped: 0,
        failed: 0,
        parts: parts.map(() => "queued" as const),
      };
    },
  };
}

// ── إجراءات مشتركة ────────────────────────────────────────────────────────────
export async function call(handlers: Handlers, request: Request): Promise<Response> {
  return handlers.POST({ request });
}

export async function loadHandlers(modulePath?: string): Promise<Handlers> {
  return handlersOf(modulePath);
}

/** معاينة ناجحة تُعيد الرمز. تفترض سرّ التأكيد مضبوطًا. */
export async function previewToken(
  handlers: Handlers,
  file?: BuildOptions["file"],
): Promise<string> {
  const res = await call(handlers, buildRequest({ action: "preview", file }));
  const body = await jsonOf(res);
  if (res.status !== 200 || typeof body.token !== "string" || !body.token) {
    throw new Error(`المعاينة فشلت: ${res.status}`);
  }
  return body.token;
}

/** رمزٌ موقَّع يدويًّا لملفٍ ومستخدم محدَّدين (لاختبار الانتحال/الانتهاء/عدم المطابقة). */
export async function signFor(input: Parameters<typeof signImportToken>[0]): Promise<string> {
  const signed = await signImportToken(input);
  if (!signed.ok) throw new Error("sign failed");
  return signed.token;
}

export const stubApprovalSecret = (vi: { stubEnv: (k: string, v: string) => unknown }) => {
  vi.stubEnv("FINN_IMPORT_SIGNING_SECRET", APPROVAL_SECRET);
  vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", "");
  vi.stubEnv("ARIA_MESSAGE_APPROVAL_SECRET", "");
};

export { xlsxBytes };
