/**
 * نقلٌ مزيَّف حتمي لـn8n — يطبّق جهة المستقبِل من العقد حرفيًّا كي تُختبر القناة بلا n8n حقيقي.
 *
 * ما يفعله كمستقبِل: يتحقّق من توقيع الطلب والانحراف (`verifyRequestSignature`)، ويحتفظ بالنونس
 * 120 ث حتى 5000 مدخل ويردّ على المكرَّر `auth_failed`، ويجيب **دائمًا HTTP 200** برمز تطبيقي
 * (لا 4xx/5xx للأخطاء التطبيقية)، ويوقّع كل ردّ بسرّ سطح المسار ونونس الطلب.
 *
 * وما يفعله كعاطب: خطط سلوك (`StubPlan`) تُحاكي الأعطال التي يقيسها الحارس — توقّف تام · ثقب أسود لا
 * يردّ · بطء · 500 · جسم مشوّه · جسم ضخم (بطول معلَن وبلا) · نصٌّ حاقن · توقيعٌ فاسد · ردٌّ قديم
 * مُعاد · تحويل. لا يقرأ شيئًا من البيئة ولا يمسّ شبكة. ولا يستوردها كودُ الإنتاج.
 */
import { PATH_SURFACE, type N8nPath, type N8nSurface } from "./protocol";
import { signResponse, verifyRequestSignature } from "./sign.server";

export interface StubResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  provider: string;
}

export type StubPlan =
  /** غلاف بحثٍ ناجح (الافتراضي نتيجتان صالحتان). */
  | { kind: "research"; results?: StubResult[]; code?: string; ok?: boolean; extra?: object }
  /** غلاف مشغّل. */
  | { kind: "runner"; code?: string; ok?: boolean; result?: object | null }
  /** رد HTTP بحالةٍ وجسمٍ حرفيّين، موقَّع صحيحًا. */
  | { kind: "http"; status: number; body?: string }
  /** جسم نصّي حرفي بتوقيعٍ صحيح (مشوّه أو JSON بلا شكل). */
  | { kind: "text"; body: string }
  /** بايتات حرفية موقَّعة بتوقيعٍ صحيح (لاختبار ترميزٍ فاسد). */
  | { kind: "bytes"; bytes: Uint8Array }
  /** `fetch` يرفض كأن الخدمة ساقطة. */
  | { kind: "network" }
  /** لا يردّ أبدًا ويتجاهل الإشارة. */
  | { kind: "blackhole" }
  /** يؤخّر `ms` (يتجاهل الإشارة) ثم ينفّذ الخطة التالية. */
  | { kind: "slow"; ms: number; then: StubPlan }
  /** جسمٌ ضخم: بطول معلَن، أو بثّ بلا طول (يُسحب بكسل لقياس ما قُرئ منه). */
  | { kind: "huge"; bytes: number; declareLength: boolean; pulled?: { bytes: number } }
  /** غلاف صالح موقَّع بسرٍّ آخر. */
  | { kind: "wrong-secret" }
  /** غلاف صالح بلا رأسَي التوقيع. */
  | { kind: "unsigned" }
  /** غلاف صالح بتوقيع قبل `ageSeconds` ثانية. */
  | { kind: "stale"; ageSeconds: number }
  /** يعيد الجسم والرؤوس المسجَّلة من ردٍّ سابق (إعادة تشغيل ردّ). */
  | { kind: "replay-response"; captured: { body: string; headers: Record<string, string> } }
  /** تحويل: يرفض `fetch` كما يفعل `redirect: "error"`. */
  | { kind: "redirect" };

export interface StubCall {
  readonly index: number;
  readonly url: string;
  readonly path: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: string;
  readonly init: RequestInit;
}

interface StubOptions {
  readonly secrets: Readonly<Record<N8nSurface, string>>;
  /** ساعة المستقبِل بالمللي ثانية. */
  readonly now: () => number;
  readonly plan: StubPlan | ((call: StubCall) => StubPlan);
}

const NONCE_TTL_MS = 120_000;
const NONCE_CAP = 5_000;

const FIXED_RESULTS: StubResult[] = [
  {
    title: "دليل أمني",
    url: "https://docs.example.com/guide",
    snippet: "ملخص الدليل.",
    publishedAt: "2026-09-01T00:00:00Z",
    provider: "stub-a",
  },
  {
    title: "Second source",
    url: "https://www.example.org/page",
    snippet: "Second snippet.",
    publishedAt: null,
    provider: "stub-b",
  },
];

export function createStubN8n(opts: StubOptions) {
  const calls: StubCall[] = [];
  const seen = new Map<string, number>();

  function nonceSeen(nonce: string, nowMs: number): boolean {
    for (const [n, exp] of seen) if (exp <= nowMs) seen.delete(n);
    if (seen.has(nonce)) return true;
    seen.set(nonce, nowMs + NONCE_TTL_MS);
    while (seen.size > NONCE_CAP) {
      const oldest = seen.keys().next();
      if (oldest.done) break;
      seen.delete(oldest.value);
    }
    return false;
  }

  async function signed(
    secret: string,
    nonce: string,
    body: string | Uint8Array,
    status = 200,
    respTs = Math.floor(opts.now() / 1000),
  ): Promise<Response> {
    const headers = await signResponse({ secret, respTs, requestNonce: nonce, body });
    return new Response(body as BodyInit, {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  const researchEnvelope = (requestId: string, plan: Extract<StubPlan, { kind: "research" }>) => ({
    v: 1,
    ok: plan.ok ?? (plan.code === undefined || plan.code === "ok" || plan.code === "no_results"),
    code: plan.code ?? "ok",
    requestId,
    degraded: false,
    fetchedAt: new Date(opts.now()).toISOString(),
    providers: [{ id: "stub-a", status: "ok", ms: 120, n: 2 }],
    results: plan.code && plan.code !== "ok" ? [] : (plan.results ?? FIXED_RESULTS),
    ...plan.extra,
  });

  type Answerable = Exclude<StubPlan, { kind: "network" | "redirect" | "blackhole" | "slow" }>;

  async function answer(plan: Answerable, call: StubCall, secret: string, nonce: string) {
    const body = call.body ? (JSON.parse(call.body) as { requestId?: string }) : {};
    const requestId = body.requestId ?? "00000000-0000-4000-8000-000000000000";
    switch (plan.kind) {
      case "research":
        return signed(secret, nonce, JSON.stringify(researchEnvelope(requestId, plan)));
      case "runner":
        return signed(
          secret,
          nonce,
          JSON.stringify({
            v: 1,
            ok: plan.ok ?? (plan.code === undefined || plan.code === "ok"),
            code: plan.code ?? "ok",
            requestId,
            result: plan.result === undefined ? { summary: "تم.", items: ["a", "b"] } : plan.result,
          }),
        );
      case "http":
        return signed(secret, nonce, plan.body ?? "", plan.status);
      case "text":
        return signed(secret, nonce, plan.body);
      case "bytes":
        return signed(secret, nonce, plan.bytes);
      case "huge": {
        const chunk = new Uint8Array(16 * 1024).fill(97);
        let sent = 0;
        const stream = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (sent >= plan.bytes) return controller.close();
            const n = Math.min(chunk.byteLength, plan.bytes - sent);
            sent += n;
            if (plan.pulled) plan.pulled.bytes = sent;
            controller.enqueue(chunk.subarray(0, n));
          },
        });
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          [`X-Nx-Resp-Ts`]: String(Math.floor(opts.now() / 1000)),
          [`X-Nx-Resp-Sig`]: `v1=${"0".repeat(64)}`,
        };
        if (plan.declareLength) headers["Content-Length"] = String(plan.bytes);
        return new Response(stream, { status: 200, headers });
      }
      case "wrong-secret":
        return signed(
          `${secret}-not-the-shared-one`,
          nonce,
          JSON.stringify(researchEnvelope(requestId, { kind: "research" })),
        );
      case "unsigned":
        return new Response(JSON.stringify(researchEnvelope(requestId, { kind: "research" })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      case "stale":
        return signed(
          secret,
          nonce,
          JSON.stringify(researchEnvelope(requestId, { kind: "research" })),
          200,
          Math.floor(opts.now() / 1000) - plan.ageSeconds,
        );
      case "replay-response":
        return new Response(plan.captured.body, { status: 200, headers: plan.captured.headers });
    }
  }

  const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.slice(url.lastIndexOf("/") + 1) as N8nPath;
    const call: StubCall = {
      index: calls.length,
      url,
      path,
      method: String(init.method ?? "GET"),
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? init.body : "",
      init,
    };
    calls.push(call);
    const surface = PATH_SURFACE[path];
    const secret = surface ? opts.secrets[surface] : "";
    let plan = typeof opts.plan === "function" ? opts.plan(call) : opts.plan;
    const nonce = call.headers.get("X-Nx-Nonce") ?? "0".repeat(32);

    // أعطال النقل تسبق منطق المستقبِل: لا يصل الطلب أصلًا أو لا يعود شيء.
    while (plan.kind === "slow") {
      await new Promise((r) => setTimeout(r, plan.kind === "slow" ? plan.ms : 0));
      plan = plan.then;
    }
    if (plan.kind === "network" || plan.kind === "redirect") throw new TypeError("fetch failed");
    if (plan.kind === "blackhole") return new Promise<Response>(() => undefined);

    // جهة المستقبِل: توقيع ثم انحراف ثم إعادة تشغيل — وأي رفضٍ ⇒ 200 برمز auth_failed (لا 4xx).
    const verdict = await verifyRequestSignature({
      secret,
      headers: call.headers,
      path,
      body: call.body,
      nowSeconds: Math.floor(opts.now() / 1000),
    });
    const replayed = verdict.ok && nonceSeen(verdict.nonce, opts.now());
    if (!verdict.ok || replayed || !surface) {
      const requestId =
        (call.body ? (JSON.parse(call.body) as { requestId?: string }).requestId : undefined) ??
        "00000000-0000-4000-8000-000000000000";
      const envelope = path.endsWith("runner-v1")
        ? { v: 1, ok: false, code: "auth_failed", requestId, result: null }
        : {
            v: 1,
            ok: false,
            code: "auth_failed",
            requestId,
            degraded: false,
            fetchedAt: new Date(opts.now()).toISOString(),
            providers: [],
            results: [],
          };
      return signed(secret, nonce, JSON.stringify(envelope));
    }
    return answer(plan, call, secret, nonce);
  };

  return { fetch: fetchImpl as typeof fetch, calls, seenNonces: seen };
}
