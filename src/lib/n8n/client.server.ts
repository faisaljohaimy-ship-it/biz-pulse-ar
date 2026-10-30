/**
 * عميل n8n — **الموضع الوحيد في المستودع الذي ينادي الشبكة باتجاه n8n.**
 *
 * لا يستورده اليوم مستهلك (المرحلة P1): بُني واختُبر قبل أن يوصَل بـ`/api/chat` أو بوكيل FNN.
 * حارسه `n8n-client.contract.test.ts`: موضع `fetch` واحد · POST وحده · مسارات من جدول مغلق · لا
 * عنوان حرفي · `redirect: "error"` · مهلة · لا قاعدة ولا خدمة-دور في سلسلة استيراده · وكل مستورِد
 * يفحص مفتاح الإيقاف قبله.
 *
 * ## لا يرمي أبدًا
 *
 * كل مدخلٍ يعيد نتيجةً مميَّزة: `{ served: true, … }` أو `{ served: false, reason }` بسببٍ من
 * قائمة ثوابت ASCII مغلقة (`N8N_REASONS`). **لا نصّ بعيدًا في سبب** (لا رسالة خطأ ولا جسم ردّ ولا
 * مضيف ولا سرّ)، ولا يسجّل هذا الملف شيئًا. وأي استثناءٍ غير متوقَّع داخله يُحوَّل إلى `n8n_error`
 * بدل أن يصعد إلى المستدعي.
 *
 * ## ترتيب البوّابات — كل ما قبل `POST` بلا شبكة
 *
 * ١. مفتاح الإيقاف القائم `aiKillSwitchOn` (`SADEED_AI_DISABLED`) ثم `SADEED_WEB_DISABLED` ⇒ `disabled`.
 * ٢. مهيّأ؟ أصل https صالح وسرّ ≥ 32 حرفًا للسطح ⇒ وإلا `not_configured` **متزامنًا**.
 * ٣. وضع بحث سَدِيد (`SADEED_WEB_RESEARCH`: `off` أو `members` مع غير عضو) ⇒ `disabled`.
 * ٤. تحقّق من الطلب بالمخطط الصارم (خللٌ برمجيٌّ في المستدعي يُرفض محليًّا: `n8n_error`).
 * ٥. الكاش: إصابةٌ موجبة تُخدم ولو كان القاطع مفتوحًا؛ والسالب (30 ث) يعيد السبب نفسه بلا نداء.
 * ٦. القاطع ⇒ `breaker_open`.
 * ٧. `POST` موقَّع، `redirect: "error"`، مهلة بـ`AbortController` **تُفرَض ولو تجاهل النقل الإشارة**
 *    (سباق مع إشارة الإلغاء)، سقف جسم 32 كيلوبايت، تحقّق من توقيع الردّ وانحرافه، ثم مخططٌ صارم.
 *
 * ## ما يُحتسب على القاطع
 *
 * إخفاق القناة (مهلة · شبكة · توقيع · غلاف · تضخّم · `internal`/`all_providers_failed`) ⇒ إخفاق.
 * ردٌّ موقَّعٌ سليم بأي رمزٍ تطبيقي (`auth_failed` · `budget_exhausted` · `bad_request` ·
 * `unknown_workflow` · `bad_params`) ⇒ القناة حيّة ⇒ نجاح للقاطع (والنتيجة غير مخدومة).
 *
 * ## ما يصل المستهلك
 *
 * نتائج مُعاد بناؤها (`normalize.server.ts`) لا غلاف n8n: مرشّح عناوين، `domain`/`tier` من جدول
 * الكود، نصوصٌ معقَّمة. وتحمل النتيجة `untrusted: true`: الويب مصدرٌ غير موثّق وأرقامه لا تُعرض
 * كحقيقة المنتج (المادة ٢٧). والتطبيق لا يجلب أي عنوانٍ منها.
 */
// الوحدة الحدّية الوحيدة: مفتاح الإيقاف القائم. تحمّل عميل القاعدة لأجل الحصّة، فلا يمسحها حارس المادة ٢٥
// داخليًّا، ويُقيَّد استيرادها بهذا الاسم وحده (`n8n-client.contract.test.ts` ④).
import { aiKillSwitchOn } from "@/lib/governance/ai-quota.server";
import { CircuitBreaker, type BreakerState } from "./breaker";
import { CACHE_NEGATIVE_TTL_MS, cacheKeyOf, ResearchCache, ttlFor } from "./cache.server";
import { isConfigured, readN8nConfig, type N8nEnv } from "./config.server";
import {
  ARM_DEADLINE_MS,
  HEADER,
  MAX_RESPONSE_BYTES,
  N8N_REASONS,
  RESEARCH_MODES,
  type Freshness,
  type FnnResearchMode,
  type N8nPath,
  type N8nReason,
  type N8nSurface,
  type RunnerWorkflow,
  type SadeedResearchMode,
} from "./protocol";
import { normalizeResearchResults, sanitizeWebText, type WebResult } from "./normalize.server";
import {
  researchEnvelopeSchema,
  researchRequestSchema,
  RUNNER_ITEM_CHARS,
  RUNNER_SUMMARY_CHARS,
  runnerEnvelopeSchema,
  runnerRequestSchema,
  type Brief,
} from "./schema";
import { generateNonce, signRequest, verifyResponseSignature } from "./sign.server";
import { buildStatusSnapshot, LatencyWindow, type N8nStatusSnapshot } from "./status.server";

// ── المدخلات والنتائج ───────────────────────────────────────────────────────

export type ResearchInput =
  | {
      readonly surface: "sadeed";
      readonly mode: SadeedResearchMode;
      readonly brief: Brief;
      /** من يسأل — يقرّر وضع `members` وحده؛ الزائر لا يبحث إلا في وضع `all`. */
      readonly audience: "member" | "anonymous";
      readonly freshness?: Freshness;
      readonly maxResults?: number;
    }
  | {
      readonly surface: "fnn";
      readonly mode: FnnResearchMode;
      readonly brief: Brief;
      readonly freshness?: Freshness;
      readonly maxResults?: number;
    };

export type ResearchOutcome =
  | {
      readonly served: true;
      /** نتائج الويب غير موثّقة — لا تُعرض أرقامها كحقيقة المنتج. */
      readonly untrusted: true;
      readonly code: "ok" | "no_results";
      readonly degraded: boolean;
      readonly fetchedAt: string;
      readonly results: readonly WebResult[];
      /** `null` حين خُدمت من الكاش (لا طلب هذه المرّة). */
      readonly requestId: string | null;
      readonly fromCache: boolean;
      readonly latencyMs: number;
    }
  | { readonly served: false; readonly reason: N8nReason; readonly latencyMs: number };

export interface RunInput {
  readonly workflow: RunnerWorkflow;
  readonly params: Readonly<Record<string, string | number>>;
  /** نونس التأكيد من المالك — يصير `Idempotency-Key`؛ التكرار يعيد `already_done` (24 ساعة). */
  readonly idempotencyKey: string;
}

export type RunOutcome =
  | {
      readonly served: true;
      readonly untrusted: true;
      readonly code: "ok" | "already_done";
      readonly summary: string | null;
      readonly items: readonly string[];
      readonly requestId: string;
      readonly latencyMs: number;
    }
  | { readonly served: false; readonly reason: N8nReason; readonly latencyMs: number };

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;

// ── الاعتماديات القابلة للحقن (الاختبار وحده يمرّرها) ─────────────────────────

export interface N8nClientDeps {
  /** النقل. الافتراضي `globalThis.fetch`. */
  readonly fetch?: typeof globalThis.fetch;
  /** البيئة تُقرأ عند كل نداء. الافتراضي `process.env`. */
  readonly env?: N8nEnv;
  /** ساعة بالمللي ثانية. */
  readonly now?: () => number;
  readonly randomBytes?: (n: number) => Uint8Array;
  readonly randomUuid?: () => string;
  /** مفتاح الإيقاف القائم. الافتراضي `aiKillSwitchOn`. */
  readonly killSwitch?: () => boolean;
  /** استبدال مهلات الأذرع (اختبارٌ بمهلاتٍ قصيرة). الإنتاج: `ARM_DEADLINE_MS`. */
  readonly deadlines?: Partial<Record<N8nPath, number>>;
  readonly cache?: ResearchCache<CachedResearch>;
  readonly breakers?: Partial<Record<N8nSurface, CircuitBreaker>>;
}

interface CachedResearch {
  readonly code: "ok" | "no_results";
  readonly degraded: boolean;
  readonly fetchedAt: string;
  readonly results: readonly WebResult[];
}

export interface N8nClient {
  research(input: ResearchInput): Promise<ResearchOutcome>;
  run(input: RunInput): Promise<RunOutcome>;
  status(surface: N8nSurface): N8nStatusSnapshot;
}

// ── الإنشاء ─────────────────────────────────────────────────────────────────

type Wire =
  | { readonly kind: "ok"; readonly json: unknown }
  | { readonly kind: "fail"; readonly reason: N8nReason };

class DeadlineError extends Error {}

const reasonOr = (r: string): N8nReason =>
  (N8N_REASONS as readonly string[]).includes(r) ? (r as N8nReason) : "n8n_error";

interface SurfaceState {
  readonly breaker: CircuitBreaker;
  readonly latencies: LatencyWindow;
  lastOkAtMs: number | null;
}

export function createN8nClient(deps: N8nClientDeps = {}): N8nClient {
  const now = deps.now ?? Date.now;
  // النقل الافتراضي يُحلّ عند النداء لا عند الاستيراد: غياب `fetch` العامّ لا يكسر تحميل الوحدة.
  const net = {
    fetch:
      deps.fetch ??
      ((...args: Parameters<typeof globalThis.fetch>) =>
        Reflect.apply(globalThis.fetch, globalThis, args) as Promise<Response>),
  };
  const killSwitch = deps.killSwitch ?? aiKillSwitchOn;
  const cache = deps.cache ?? new ResearchCache<CachedResearch>({ now });
  const states: Record<N8nSurface, SurfaceState> = {
    sadeed: {
      breaker: deps.breakers?.sadeed ?? new CircuitBreaker({ now }),
      latencies: new LatencyWindow(),
      lastOkAtMs: null,
    },
    fnn: {
      breaker: deps.breakers?.fnn ?? new CircuitBreaker({ now }),
      latencies: new LatencyWindow(),
      lastOkAtMs: null,
    },
  };
  const uuid = deps.randomUuid ?? (() => globalThis.crypto.randomUUID());
  const deadlineOf = (path: N8nPath): number => deps.deadlines?.[path] ?? ARM_DEADLINE_MS[path];
  const env = (): N8nEnv => deps.env ?? process.env;

  /** البوّابات التي لا تلمس شبكة. `null` ⇒ مسموح. */
  function gate(surface: N8nSurface, audience?: "member" | "anonymous"): N8nReason | null {
    const cfg = readN8nConfig(env());
    if (killSwitch() || cfg.webDisabled) return "disabled";
    if (!isConfigured(cfg, surface)) return "not_configured";
    if (surface === "sadeed") {
      if (cfg.mode === "off") return "disabled";
      if (cfg.mode === "members" && audience !== "member") return "disabled";
    }
    return null;
  }

  /** نداءٌ واحد: توقيع ← نقل ← سقف جسم ← تحقّق توقيع الردّ ← JSON. لا يرمي. */
  async function exchange(args: {
    readonly surface: N8nSurface;
    readonly path: N8nPath;
    readonly body: string;
    readonly extraHeaders?: Record<string, string>;
  }): Promise<Wire> {
    const cfg = readN8nConfig(env());
    const secret = cfg.secrets[args.surface];
    if (cfg.baseUrl === null || secret === null) return { kind: "fail", reason: "not_configured" };
    const deadlineMs = deadlineOf(args.path);
    const nonce = generateNonce(deps.randomBytes);
    const signed = await signRequest({
      secret,
      ts: Math.floor(now() / 1000),
      nonce,
      path: args.path,
      body: args.body,
      deadlineMs,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deadlineMs);
    const expired = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(new DeadlineError()), {
        once: true,
      });
    });
    expired.catch(() => undefined);
    // النقل الذي يتجاهل الإشارة (أو لا يردّ أبدًا) لا يتجاوز المهلة: السباق هو الضامن لا تعاون النقل.
    const within = <T>(p: Promise<T>): Promise<T> => {
      p.catch(() => undefined);
      return Promise.race([p, expired]);
    };

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      let res: Response;
      try {
        res = await within(
          net.fetch(`${cfg.baseUrl}/webhook/${args.path}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...signed,
              ...args.extraHeaders,
            },
            body: args.body,
            redirect: "error",
            credentials: "omit",
            cache: "no-store",
            signal: controller.signal,
          }),
        );
      } catch {
        return { kind: "fail", reason: controller.signal.aborted ? "timeout" : "network" };
      }

      if (res.status !== 200) {
        res.body?.cancel().catch(() => undefined);
        return { kind: "fail", reason: "n8n_error" };
      }
      const declared = Number(res.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
        res.body?.cancel().catch(() => undefined);
        return { kind: "fail", reason: "oversized" };
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      if (res.body) {
        reader = res.body.getReader();
        for (;;) {
          let step: ReadableStreamReadResult<Uint8Array>;
          try {
            step = await within(reader.read());
          } catch {
            return { kind: "fail", reason: controller.signal.aborted ? "timeout" : "network" };
          }
          if (step.done) break;
          total += step.value.byteLength;
          if (total > MAX_RESPONSE_BYTES) return { kind: "fail", reason: "oversized" };
          chunks.push(step.value);
        }
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }

      const authentic = await verifyResponseSignature({
        secret,
        headers: res.headers,
        requestNonce: nonce,
        body: bytes,
        nowSeconds: Math.floor(now() / 1000),
      });
      if (!authentic) return { kind: "fail", reason: "bad_signature" };

      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return { kind: "ok", json: JSON.parse(text) as unknown };
      } catch {
        return { kind: "fail", reason: "bad_envelope" };
      }
    } finally {
      clearTimeout(timer);
      reader?.cancel().catch(() => undefined);
    }
  }

  async function research(input: ResearchInput): Promise<ResearchOutcome> {
    const started = now();
    const elapsed = (): number => Math.max(0, now() - started);
    const unserved = (reason: N8nReason): ResearchOutcome => ({
      served: false,
      reason,
      latencyMs: elapsed(),
    });
    try {
      const surface = input.surface;
      const blocked = gate(surface, input.surface === "sadeed" ? input.audience : undefined);
      if (blocked) return unserved(blocked);

      const freshness: Freshness = input.freshness ?? "any";
      const request = researchRequestSchema.safeParse({
        v: 1,
        requestId: uuid(),
        mode: input.mode,
        brief: input.brief,
        maxResults: input.maxResults ?? 5,
        freshness,
      });
      const modeFits = (RESEARCH_MODES[surface] as readonly string[]).includes(input.mode);
      if (!request.success || !modeFits) return unserved("n8n_error");
      const req = request.data;

      const key = cacheKeyOf({
        surface,
        mode: req.mode,
        freshness,
        lang: req.brief.lang,
        maxResults: req.maxResults,
        terms: req.brief.terms,
        codes: req.brief.codes,
      });
      const cached = cache.get(key);
      if (cached.kind === "hit") {
        return {
          served: true,
          untrusted: true,
          code: cached.value.code,
          degraded: cached.value.degraded,
          fetchedAt: cached.value.fetchedAt,
          results: cached.value.results,
          requestId: null,
          fromCache: true,
          latencyMs: elapsed(),
        };
      }
      if (cached.kind === "negative") return unserved(reasonOr(cached.reason));

      const state = states[surface];
      if (!state.breaker.tryAcquire()) return unserved("breaker_open");

      // من هنا القاطع محجوز (قد يكون الفحص): كل مخرجٍ يحسمه مرّةً واحدة بالضبط.
      let settled = false;
      const alive = (): void => {
        if (!settled) state.breaker.recordSuccess();
        settled = true;
      };
      const failed = (): void => {
        if (!settled) state.breaker.recordFailure();
        settled = true;
      };
      const reject = (reason: N8nReason, channelFailed: boolean): ResearchOutcome => {
        if (channelFailed) failed();
        else alive();
        cache.setNegative(key, reason);
        return unserved(reason);
      };
      try {
        const path: N8nPath = surface === "sadeed" ? "sadeed-research-v1" : "fnn-research-v1";
        const wire = await exchange({ surface, path, body: JSON.stringify(req) });
        if (wire.kind === "fail") return reject(wire.reason, true);

        const parsed = researchEnvelopeSchema.safeParse(wire.json);
        if (!parsed.success || parsed.data.requestId !== req.requestId) {
          return reject("bad_envelope", true);
        }
        const envelope = parsed.data;
        switch (envelope.code) {
          case "auth_failed":
            return reject("auth_failed", false);
          case "budget_exhausted":
            return reject("budget_exhausted", false);
          case "bad_request":
            return reject("n8n_error", false);
          case "all_providers_failed":
          case "internal":
            return reject("n8n_error", true);
          case "ok":
          case "no_results":
            break;
        }

        alive();
        const nowMs = now();
        const results = normalizeResearchResults(envelope.results, req.maxResults, nowMs);
        const code = results.length > 0 ? "ok" : "no_results";
        // فراغٌ أو غلافٌ زمنه في المستقبل: لا نصدّق «حداثة» تتقدّم على ساعتنا.
        const claimed = Date.parse(envelope.fetchedAt);
        const fetchedAt = new Date(Number.isFinite(claimed) ? Math.min(claimed, nowMs) : nowMs);
        const value: CachedResearch = {
          code,
          degraded: envelope.degraded,
          fetchedAt: fetchedAt.toISOString(),
          results,
        };
        cache.set(key, value, results.length > 0 ? ttlFor(freshness) : CACHE_NEGATIVE_TTL_MS);
        state.latencies.record(elapsed());
        state.lastOkAtMs = nowMs;
        return {
          served: true,
          untrusted: true,
          code,
          degraded: value.degraded,
          fetchedAt: value.fetchedAt,
          results,
          requestId: req.requestId,
          fromCache: false,
          latencyMs: elapsed(),
        };
      } catch {
        failed();
        return unserved("n8n_error");
      }
    } catch {
      return unserved("n8n_error");
    }
  }

  async function run(input: RunInput): Promise<RunOutcome> {
    const started = now();
    const elapsed = (): number => Math.max(0, now() - started);
    const unserved = (reason: N8nReason): RunOutcome => ({
      served: false,
      reason,
      latencyMs: elapsed(),
    });
    try {
      const blocked = gate("fnn");
      if (blocked) return unserved(blocked);

      const request = runnerRequestSchema.safeParse({
        v: 1,
        requestId: uuid(),
        workflow: input.workflow,
        params: input.params,
      });
      if (!request.success || !IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
        return unserved("n8n_error");
      }
      const req = request.data;

      const state = states.fnn;
      if (!state.breaker.tryAcquire()) return unserved("breaker_open");

      let settled = false;
      const alive = (): void => {
        if (!settled) state.breaker.recordSuccess();
        settled = true;
      };
      const failed = (): void => {
        if (!settled) state.breaker.recordFailure();
        settled = true;
      };
      try {
        const wire = await exchange({
          surface: "fnn",
          path: "fnn-runner-v1",
          body: JSON.stringify(req),
          extraHeaders: { [HEADER.idempotencyKey]: input.idempotencyKey },
        });
        if (wire.kind === "fail") {
          failed();
          return unserved(wire.reason);
        }
        const parsed = runnerEnvelopeSchema.safeParse(wire.json);
        if (!parsed.success || parsed.data.requestId !== req.requestId) {
          failed();
          return unserved("bad_envelope");
        }
        const envelope = parsed.data;
        switch (envelope.code) {
          case "auth_failed":
            alive();
            return unserved("auth_failed");
          case "budget_exhausted":
            alive();
            return unserved("budget_exhausted");
          case "unknown_workflow":
          case "bad_params":
            alive();
            return unserved("n8n_error");
          case "internal":
            failed();
            return unserved("n8n_error");
          case "ok":
          case "already_done":
            break;
        }
        alive();
        state.latencies.record(elapsed());
        state.lastOkAtMs = now();
        return {
          served: true,
          untrusted: true,
          code: envelope.code,
          summary: envelope.result
            ? sanitizeWebText(envelope.result.summary, RUNNER_SUMMARY_CHARS)
            : null,
          items: (envelope.result?.items ?? []).map((i) => sanitizeWebText(i, RUNNER_ITEM_CHARS)),
          requestId: req.requestId,
          latencyMs: elapsed(),
        };
      } catch {
        failed();
        return unserved("n8n_error");
      }
    } catch {
      return unserved("n8n_error");
    }
  }

  function status(surface: N8nSurface): N8nStatusSnapshot {
    const cfg = readN8nConfig(env());
    const s = states[surface];
    const breaker: BreakerState = s.breaker.state();
    return buildStatusSnapshot({
      surface,
      configured: isConfigured(cfg, surface),
      disabled: killSwitch() || cfg.webDisabled,
      mode: cfg.mode,
      breaker,
      lastOkAtMs: s.lastOkAtMs,
      latencies: s.latencies,
    });
  }

  return { research, run, status };
}

/** النسخة الافتراضية للإنتاج (ساعة النظام، `process.env`، `fetch` العامّ). */
const defaultClient = createN8nClient();
export const researchViaN8n = (input: ResearchInput): Promise<ResearchOutcome> =>
  defaultClient.research(input);
export const runViaN8n = (input: RunInput): Promise<RunOutcome> => defaultClient.run(input);
export const n8nStatus = (surface: N8nSurface): N8nStatusSnapshot => defaultClient.status(surface);
