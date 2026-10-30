/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * نقلُ حلقةٍ مغلقة بين جهتَي القناة: عميل التطبيق (P1: `src/lib/n8n/client.server.ts`) ومسارات n8n
 * (P2: `n8n/workflows/*.json` كما هي على القرص، تُنفَّذ بالمحرّك المصغّر `n8n/test-support/mini-engine.js`).
 *
 * يُمرَّر `fetch` هذا إلى `createN8nClient({ fetch })`: الطلب الذي يوقّعه العميل يصل عقدة `Verify` في
 * المسار حرفيًّا (ترويسات X-Nx-* والمتن الخام الثنائي)، والردّ الذي توقّعه عقدة `Sign` يعود إلى العميل
 * كما هو (بايتات + ترويسات) فيتحقّق منه التطبيق بتوقيعه الخاص. لا منطق مستقبِل مكرَّر هنا: كل ما يقرّره
 * المستقبِل يقرّره كود P2 نفسه.
 *
 * ما يحاكيه (ويجب أن يُقرأ كذلك): الشبكة (زمنٌ يُضاف `rttMs` فقط، بلا TLS ولا تحويلات)، وسجلّ المسارات
 * المفعّلة (مسارٌ غير مفعّل ⇒ 404 كما يردّ n8n)، وحفظ static data بين الطلبات، وعدم تفرّد الطلبات
 * المتزامنة. **هذا ليس n8n**: كل قياس زمنٍ هنا من ساعة المحرّك الافتراضية لا من مزوّد ولا شبكة (المادة ٢٧).
 *
 * الزمن: كل نداء يستغرق `elapsedMs` (ساعة المحرّك الافتراضية: مجموع أطول عضو في كل دفعة HTTP) + `rttMs`.
 * يُنفَّذ الانتظار بـ`sleep` قابلٍ للحقن (الافتراضي `setTimeout`)، فيشغّله الاختبار بمؤقّتات مزيَّفة.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";
import { generateNonce, signRequest, verifyResponseSignature } from "@/lib/n8n/sign.server";
import { runWorkflow } from "../test-support/mini-engine.js";
import { makeTransport } from "../test-support/fixtures.js";
import { ALL_CREDENTIALS, ENV as N8N_ENV, ROOT, loadCode } from "./helpers.js";

const SIGN = loadCode("sign-response");

export const WORKFLOW_FILES = {
  "sadeed-research-v1": "sadeed-web-research.json",
  "fnn-research-v1": "fnn-dev-research.json",
  "fnn-runner-v1": "fnn-automation-runner.json",
} as const;

/** المسارات المفعّلة على الخادم المحاكى: path ← مسار JSON كما يُستورد إلى n8n. */
export function committedWorkflows(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const file of [
    "sadeed-web-research.json",
    "fnn-dev-research.json",
    "fnn-automation-runner.json",
    "watchdog-canary.json",
    "error-handler.json",
    "nx-self-test.json",
  ]) {
    const wf = JSON.parse(readFileSync(join(ROOT, "n8n", "workflows", file), "utf8"));
    for (const node of wf.nodes) {
      if (String(node.type).endsWith(".webhook")) {
        out[String(node.parameters.path)] = wf;
      }
    }
  }
  return out;
}

export interface LoopbackCall {
  readonly index: number;
  readonly url: string;
  readonly method: string;
  /** المسار بعد `/webhook/`، أو `null` إن لم يطابق الشكل. */
  readonly path: string | null;
  readonly requestHeaders: Record<string, string>;
  readonly requestBody: string;
  /** هل وصل الطلب إلى مسار مفعّل. */
  readonly matched: boolean;
  /** زمن المحرّك الافتراضي (مللي ثانية)، بلا `rttMs`. */
  readonly engineElapsedMs: number;
  readonly rttMs: number;
  readonly httpCalls: readonly { readonly url: string; readonly timeoutMs: number }[];
  readonly violations: readonly string[];
  readonly failedNodes: readonly unknown[];
  readonly status: number;
  /** الجسم الذي أُعيد فعلًا إلى العميل. */
  readonly responseBody: string;
  readonly responseHeaders: Record<string, string>;
}

export interface LoopbackOptions {
  /** أصل n8n المحاكى (`https://host`)؛ كل ما عداه يفشل كأن المضيف غير موجود. */
  readonly base: string;
  /** ساعة جهة التطبيق بالمللي ثانية (مشتركة مع العميل المحقون). */
  readonly now: () => number;
  /** فرق ساعة n8n عن ساعة التطبيق (مللي ثانية). */
  readonly serverClockOffsetMs?: () => number;
  /** متغيّرات بيئة n8n (الأسرار وإعدادات غير سرّية). */
  readonly env?: Record<string, string | undefined>;
  readonly credentials?: readonly string[] | "*";
  /** مسارات مفعّلة (path ← JSON). الافتراضي: الملفات المتعقَّبة كما هي. */
  readonly workflows?: Record<string, any>;
  /** سلوك المزوّدين بحسب `fixtures.makeTransport`، أو دالة نقل كاملة. */
  readonly providerPlan?: Record<string, any>;
  readonly providerTransport?: (req: any) => Promise<any>;
  readonly notifier?: (n: any) => Promise<any>;
  /** كمونٌ يُضاف إلى كل ردّ (شبكة + طابور n8n). */
  readonly rttMs?: number | (() => number);
  /** يرسل الطلب نفسه مرّتين (وسيطٌ يعيد المحاولة) ويعيد الردّ الثاني. */
  readonly duplicate?: boolean;
  /** هل يضع n8n المتن الخام في الثنائي (`rawBody`)؟ false ⇒ يعيد المسار تسلسل JSON القانوني. */
  readonly withRawBinary?: boolean;
  /**
   * يبدّل جسم الردّ بعد أن بناه n8n ويعيد توقيعه بسرّ n8n الصحيح ونونس الطلب نفسه: لجسمٍ لا يخرجه
   * P2 أبدًا (ضخم، مشوَّه) كي يُمتحَن العميل على ردٍّ **موقَّع** سليم التوقيع.
   */
  readonly rewriteBody?: (body: string, call: { path: string; requestBody: string }) => string;
  readonly sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** ما غادر n8n إلى المزوّدين (العنوان بمعاملاته والجسم والترويسات): مادة فحص الخصوصية. */
export interface Egress {
  readonly url: string;
  readonly method: string;
  readonly headers: unknown;
  readonly body: unknown;
}

export function createLoopback(opts: LoopbackOptions) {
  const workflows = opts.workflows ?? committedWorkflows();
  const calls: LoopbackCall[] = [];
  const egress: Egress[] = [];
  /** عدّادا الانتظار: يعرف مشغّل المؤقتات المزيَّفة متى بدأ الردّ ينتظر وكم ردٍّ سُلّم. */
  const gauge = { started: 0, finished: new Set<number>() };
  const staticByPath: Record<string, any> = {};
  const rawSleep = opts.sleep ?? realSleep;
  const sleep = async (ms: number): Promise<void> => {
    const id = ++gauge.started;
    try {
      await rawSleep(ms);
    } finally {
      gauge.finished.add(id);
    }
  };
  const base = new URL(opts.base).origin;

  const baseTransport =
    opts.providerTransport ?? makeTransport(opts.providerPlan ?? {}, { calls: [] as any[] });
  const recordingTransport = async (req: any) => {
    egress.push({ url: req.url, method: req.method, headers: req.headers, body: req.body });
    return baseTransport(req);
  };

  async function once(path: string, headers: Record<string, string>, body: string, nowMs: number) {
    const wf = workflows[path];
    staticByPath[path] = staticByPath[path] || {};
    const result = await runWorkflow(wf, {
      trigger: {
        type: "webhook",
        method: "POST",
        path,
        headers,
        rawBody: body,
        withRawBinary: opts.withRawBinary ?? true,
      },
      env: { ...N8N_ENV, ...(opts.env ?? {}) },
      credentials: opts.credentials === undefined ? ALL_CREDENTIALS : (opts.credentials as any),
      transport: recordingTransport,
      notifier: opts.notifier ?? (async () => ({ ok: true, result: { message_id: 1 } })),
      staticData: staticByPath[path],
      nowMs,
    });
    return result;
  }

  const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url);
    if (parsed.origin !== base) throw new TypeError("fetch failed");
    const method = String(init.method ?? "GET").toUpperCase();
    const pathMatch = /^\/webhook\/([^/]+)$/.exec(parsed.pathname);
    const path = pathMatch ? pathMatch[1] : null;
    const requestHeaders: Record<string, string> = {};
    const h = new Headers(init.headers);
    h.forEach((v, k) => {
      requestHeaders[k.toLowerCase()] = v;
    });
    const requestBody = typeof init.body === "string" ? init.body : "";
    const rtt = typeof opts.rttMs === "function" ? opts.rttMs() : (opts.rttMs ?? 0);
    const index = calls.length;

    const notFound = async (): Promise<Response> => {
      calls.push({
        index,
        url,
        method,
        path,
        requestHeaders,
        requestBody,
        matched: false,
        engineElapsedMs: 0,
        rttMs: rtt,
        httpCalls: [],
        violations: [],
        failedNodes: [],
        status: 404,
        responseBody: '{"code":404,"message":"The requested webhook is not registered."}',
        responseHeaders: { "content-type": "application/json" },
      });
      await sleep(rtt);
      return new Response('{"code":404,"message":"The requested webhook is not registered."}', {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    };
    if (path === null || method !== "POST" || !workflows[path]) return notFound();

    const nowMs = opts.now() + (opts.serverClockOffsetMs?.() ?? 0);
    let result = await once(path, requestHeaders, requestBody, nowMs);
    if (opts.duplicate) result = await once(path, requestHeaders, requestBody, nowMs);
    if (!result.executed || result.responses.length === 0) {
      calls.push({
        index,
        url,
        method,
        path,
        requestHeaders,
        requestBody,
        matched: false,
        engineElapsedMs: result.elapsedMs ?? 0,
        rttMs: rtt,
        httpCalls: [],
        violations: result.violations ?? [],
        failedNodes: result.failedNodes ?? [],
        status: 500,
        responseBody: "",
        responseHeaders: {},
      });
      await sleep(rtt);
      return new Response("", { status: 500 });
    }
    const response = result.responses[0];
    let body: string = response.body;
    let respHeaders: Record<string, string> = { ...response.headers };
    if (opts.rewriteBody) {
      body = opts.rewriteBody(body, { path, requestBody });
      const secretName = path === "sadeed-research-v1" ? "SADEED_N8N_SECRET" : "FINN_N8N_SECRET";
      const secret = (opts.env ?? {})[secretName] ?? (N8N_ENV as any)[secretName];
      const signed = SIGN.signResponse({
        secret,
        body,
        nonce: requestHeaders["x-nx-nonce"],
        now: nowMs + result.elapsedMs,
      });
      respHeaders = {
        ...respHeaders,
        ...Object.fromEntries(
          Object.entries(signed.headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
        ),
      };
    }
    const bytes = Buffer.from(body, "utf8");
    respHeaders["content-length"] = String(bytes.byteLength);
    calls.push({
      index,
      url,
      method,
      path,
      requestHeaders,
      requestBody,
      matched: true,
      engineElapsedMs: result.elapsedMs,
      rttMs: rtt,
      httpCalls: result.httpCalls.map((c: any) => ({ url: c.url, timeoutMs: c.timeoutMs })),
      violations: result.violations,
      failedNodes: result.failedNodes,
      status: response.statusCode,
      responseBody: body,
      responseHeaders: respHeaders,
    });
    await sleep(result.elapsedMs + rtt);
    return new Response(bytes, { status: response.statusCode, headers: respHeaders });
  };

  return {
    base,
    fetch: fetchImpl as typeof fetch,
    calls,
    egress,
    gauge,
    staticByPath,
    workflows,
  };
}

export type Loopback = ReturnType<typeof createLoopback>;

/**
 * يشغّل وعدًا ينتظر مؤقّتات مزيَّفة (`vi.useFakeTimers`) بزمنٍ حتمي: يُترك التوقيع غير المتزامن يكتمل
 * بلا تقدّم زمن، ثم يتقدّم الزمن الافتراضي مللي ثانيةً مللي ثانية حتى يُسلَّم الردّ أو تنتهي مهلة العميل،
 * ثم يُجمَّد الزمن ويُترك التحقّق من التوقيع يكتمل. فالكمون المقاس هو كمون المحرّك + `rttMs` بالضبط.
 */
export async function driveFake<T>(p: Promise<T>, lb: Loopback): Promise<T> {
  let done = false;
  let failed = false;
  let value: T | undefined;
  let error: unknown;
  p.then(
    (v) => {
      done = true;
      value = v;
    },
    (e) => {
      done = true;
      failed = true;
      error = e;
    },
  );
  const tick = () => new Promise<void>((r) => setImmediate(r));
  // الانتظار الذي يخصّ هذا النداء هو التالي لما بدأ قبله (نداءات سابقة قد تترك مؤقّتًا معلَّقًا بعد مهلة).
  const before = lb.gauge.started;
  for (let i = 0; !done && lb.gauge.started === before && i < 100_000; i++) await tick();
  const mine = before + 1;
  for (let i = 0; !done && !lb.gauge.finished.has(mine) && i < 600_000; i++) {
    await vi.advanceTimersByTimeAsync(1);
  }
  for (let i = 0; !done && i < 100_000; i++) await tick();
  if (!done) throw new Error("driveFake: الوعد لم يُحسم");
  if (failed) throw error;
  return value as T;
}

export interface RawCallInput {
  readonly path: string;
  readonly body: string;
  readonly secret: string;
  readonly nowMs: number;
  readonly nonce?: string;
  readonly tsOffsetSeconds?: number;
  readonly deadlineMs?: number;
  readonly extraHeaders?: Record<string, string>;
  /** يعدّل الجسم بعد التوقيع (توقيع لا يطابق). */
  readonly tamperBody?: string;
}

/**
 * نداءٌ خام بتوقيع P1 الحقيقي لا يبلغه العميل نفسه (مسارٌ مجهول · معرّفٌ خارج الكتالوج · وسيطٌ سيّئ):
 * يعيد الغلاف المحلَّل وهل يتحقّق منه توقيع P1 للردّ.
 */
export async function rawCall(lb: Loopback, input: RawCallInput) {
  const nonce = input.nonce ?? generateNonce();
  const signed = await signRequest({
    secret: input.secret,
    ts: Math.floor(input.nowMs / 1000) + (input.tsOffsetSeconds ?? 0),
    nonce,
    path: input.path,
    body: input.body,
    deadlineMs: input.deadlineMs ?? 1800,
  });
  const res = await lb.fetch(`${lb.base}/webhook/${input.path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...signed, ...input.extraHeaders },
    body: input.tamperBody ?? input.body,
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const signatureOk = await verifyResponseSignature({
    secret: input.secret,
    headers: res.headers,
    requestNonce: nonce,
    body: bytes,
    nowSeconds: Math.floor(input.nowMs / 1000),
  });
  return { status: res.status, json, text, signatureOk, headers: res.headers, nonce };
}
