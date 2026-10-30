/**
 * رصد الاسترجاع (O7) — حدثان مهيكلان عبر سجلّ الخادم نفسه الذي يكتبه
 * `/api/chat` (`console.*` بكائنٍ يحمل `event`): `rag.arm_failed {arm, code}`
 * و`rag.outcome {servedArms, hitCount, …}`.
 *
 * **التخطّي المتوقَّع ليس فشلًا** (مراجعة ٢٠٢٦/١٠/٢٩): الذراع المتّجهية تعود
 * `flag_off` في **كل** دور مسجَّل ما دامت الراية منخفضة — أي دائمًا في الإنتاج
 * اليوم — وكانت تُنذر `warn` في كل دور فتدفن الرموز الحقيقية (`42P01` ·
 * `42501` · `timeout` · `threw`) التي أُضيف الرصد ليُظهرها. فأسباب
 * `EXPECTED_SKIP_REASONS` تُسجَّل `info` بالحدث `rag.arm_skipped` (الشكل نفسه)،
 * ويبقى `warn` + `rag.arm_failed` للفشل الفعلي.
 *
 * لا نصّ استعلام ولا نصّ مسترجَع ولا هوية مستخدم في أي حدث — أسماء أذرع
 * ورموز أسباب وأعداد وأزمنة ومعرّف الطلب فقط.
 *
 * ## الترويسة وحقول الحدث (O7 أ، ٢٠٢٦/١٠/٣٠)
 *
 * `retrievalHeaderValue(servedArms)` يشتقّ قيمة `X-SADEED-Retrieval` من الأذرع
 * **التي خدمت فعلًا** لا التي جُرِّبت: `none` · `lexical` · `vector` ·
 * `vector+lexical`. ذراعٌ خدمت بنتيجة فارغة خدمت (الفراغ الصادق نتيجة)، وذراعٌ
 * انتهت مهلتها أو رمت أو تُخطّيت (`flag_off` …) لم تخدم. ودالّةٌ نقيّة متزامنة:
 * لا قراءة ولا انتظار — الترويسة تُحسب من نتيجةٍ حُسمت أصلًا.
 *
 * وحدث `rag.outcome` يحمل بجانب حقوله الأقدم (`servedArms` · `hitCount` ·
 * `latencyMs` · `arms`، باقية لقرّاء السجلّ السابق) الحقول الجديدة:
 * `retrieval` · `arms_tried` (ما شُغِّل فعلًا، دون ما أُسقط قبل التشغيل
 * `db_unavailable` و`empty_query`) · `arms_served` · `hits` · `latency_ms` ·
 * `reason_codes` (أسباب الأذرع التي لم تخدم، فريدة مرتّبة) · `auth_state`
 * (`anonymous` · `verified` · `unverified` — رمزٌ مغلق لا هوية). **لا معرّف شخص
 * في الحدث لأي حال جلسة**: المُدخلات اسم الذراع ورمز السبب والعدّ والزمن،
 * ولا `userId` ولا بريد ولا نصّ استعلام في أي موضع من هذا الملف
 * (`retrieval-header.contract.test.ts` يحرس الشكل والمصدر معًا).
 *
 * النسب المئوية التسعون والخمس (p95) لكمون كل ذراع وعدد مرشّحيها تُحسب على
 * نافذة منزلقة في ذاكرة المعزول (`RAG_LATENCY_WINDOW` عيّنة لكل ذراع) — رقمٌ
 * مقيس على ما مرّ بهذا المعزول، لا على الأسطول؛ ويُطبع «لم يُقَس» (`null`)
 * حين لا عيّنة.
 */
import { ARM_NAMES, type AggregateOutcome } from "@/lib/retrieval/aggregate.server";

export const RAG_LATENCY_WINDOW = 200;

/** قيم ترويسة `X-SADEED-Retrieval`: ما خدم الاسترجاع في هذا الدور، لا ما جُرِّب. */
export type RetrievalHeaderValue = "none" | "lexical" | "vector" | "vector+lexical";

/**
 * كل ذراعٍ غير المتّجهية معجمية بالبناء (`ARM_NAMES`: الفهرس الداخلي · `hcis_*`
 * · `finn_knowledge` · `sec_knowledge_articles` · مقاطع المستندات) — والذراع
 * المتّجهية وحدها تُنتج كوساين. الاسم الجديد غير المصنَّف يُعدّ معجميًّا، ويُدان
 * في الاختبار حتى يُصنَّف صراحةً.
 */
export function retrievalHeaderValue(servedArms: readonly string[]): RetrievalHeaderValue {
  const vector = servedArms.includes(ARM_NAMES.vector);
  const lexical = servedArms.some((arm) => arm !== ARM_NAMES.vector);
  if (vector && lexical) return "vector+lexical";
  if (vector) return "vector";
  return lexical ? "lexical" : "none";
}

/** حال الجلسة كما تصل الحدث — رمزٌ مغلق، لا هوية. */
export type RagAuthState = "anonymous" | "verified" | "unverified";
const AUTH_STATES: ReadonlySet<string> = new Set(["anonymous", "verified", "unverified"]);

/** أسبابٌ تعني أن الذراع لم تُشغَّل أصلًا (أُسقطت قبل التشغيل) — ليست «جُرِّبت». */
const NOT_RUN_REASONS: ReadonlySet<string> = new Set(["db_unavailable", "empty_query"]);

/** أسباب عدم الخدمة التي هي حالة لا عطل: تُسجَّل `info` لا `warn`. */
export const EXPECTED_SKIP_REASONS: ReadonlySet<string> = new Set([
  "flag_off",
  "guest",
  "db_unavailable",
  "negative_cache",
  "breaker_open",
  "empty_query",
]);

type Window = { latencyMs: number[]; candidates: number[] };
const windows = new Map<string, Window>();

function push(arr: number[], v: number) {
  arr.push(v);
  if (arr.length > RAG_LATENCY_WINDOW) arr.splice(0, arr.length - RAG_LATENCY_WINDOW);
}

/** p95 بالرتبة الأقرب (nearest-rank): `null` بلا عيّنات — لا صفر. */
export function p95(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.95 * sorted.length) - 1));
  return sorted[idx];
}

/** رمز السبب كما يصل الحدث: رمزٌ قصير فقط — نصٌّ حرّ (رسالة خطأ، استعلام) يُردّ `error`. */
const REASON_CODE = /^[A-Za-z0-9_]{1,32}$/;
export function reasonCode(reason: string | null | undefined): string {
  if (!reason) return "unknown";
  return REASON_CODE.test(reason) ? reason : "error";
}

export function recordArmSample(arm: string, latencyMs: number, candidates: number): void {
  let w = windows.get(arm);
  if (!w) {
    w = { latencyMs: [], candidates: [] };
    windows.set(arm, w);
  }
  push(w.latencyMs, latencyMs);
  push(w.candidates, candidates);
}

export interface ArmObservation {
  served: boolean;
  reason: string | null;
  latencyMs: number;
  candidates: number;
  p95LatencyMs: number | null;
  p95Candidates: number | null;
  samples: number;
}

export interface RagOutcomeEvent {
  event: "rag.outcome";
  requestId: string | null;
  audience: string;
  /** حال الجلسة (`anonymous` · `verified` · `unverified`)، أو `null` إن لم يمرّرها المستدعي. */
  auth_state: RagAuthState | null;
  /** قيمة الترويسة `X-SADEED-Retrieval` نفسها. */
  retrieval: RetrievalHeaderValue;
  /** الأذرع التي شُغِّلت فعلًا (دون ما أُسقط قبل التشغيل). */
  arms_tried: string[];
  /** الأذرع التي خدمت — الفراغ الصادق منها خدمة. */
  arms_served: string[];
  /** عدد النتائج المدموجة. */
  hits: number;
  /** زمن المجمِّع بمللي ثانية. */
  latency_ms: number;
  /** رموز أسباب الأذرع التي لم تخدم: فريدة مرتّبة، رمزٌ قصير لا نصّ حرّ. */
  reason_codes: string[];
  /** الحقول الأقدم أدناه باقية لقرّاء السجلّ السابق (CLAUDE.md «بوّابة المخزن»). */
  servedArms: string[];
  hitCount: number;
  latencyMs: number;
  arms: Record<string, ArmObservation>;
}

/** يسجّل العيّنات ويبني الحدث؛ معرَّض للقياس (يُعيد ما طُبع). */
export function observeRagOutcome(
  outcome: AggregateOutcome,
  meta: { requestId?: string | null; audience: string; authState?: string | null },
  log: Pick<typeof console, "info" | "warn"> = console,
): RagOutcomeEvent {
  const arms: Record<string, ArmObservation> = {};
  const reasonCodes = new Set<string>();
  for (const a of outcome.arms) {
    if (!a.served) reasonCodes.add(reasonCode(a.reason));
    if (a.served) recordArmSample(a.arm, a.latencyMs, a.hits.length);
    else {
      const code = reasonCode(a.reason);
      const payload = {
        requestId: meta.requestId ?? null,
        arm: a.arm,
        code,
        latencyMs: a.latencyMs,
      };
      if (EXPECTED_SKIP_REASONS.has(code))
        log.info("[sadeed/rag] arm skipped", { event: "rag.arm_skipped", ...payload });
      else log.warn("[sadeed/rag] arm failed", { event: "rag.arm_failed", ...payload });
    }
    const w = windows.get(a.arm);
    arms[a.arm] = {
      served: a.served,
      reason: a.served ? null : reasonCode(a.reason),
      latencyMs: a.latencyMs,
      candidates: a.hits.length,
      p95LatencyMs: p95(w?.latencyMs ?? []),
      p95Candidates: p95(w?.candidates ?? []),
      samples: w?.latencyMs.length ?? 0,
    };
  }
  const event: RagOutcomeEvent = {
    event: "rag.outcome",
    requestId: meta.requestId ?? null,
    audience: meta.audience,
    // قيمةٌ خارج المفردات المغلقة تُردّ `null` — لا نصّ حرّ يصل الحدث من الحقل.
    auth_state:
      meta.authState && AUTH_STATES.has(meta.authState) ? (meta.authState as RagAuthState) : null,
    retrieval: retrievalHeaderValue(outcome.servedArms),
    arms_tried: outcome.arms
      .filter((a) => a.served || !NOT_RUN_REASONS.has(reasonCode(a.reason)))
      .map((a) => a.arm),
    arms_served: outcome.servedArms,
    hits: outcome.fused.length,
    latency_ms: outcome.latencyMs,
    reason_codes: [...reasonCodes].sort(),
    servedArms: outcome.servedArms,
    hitCount: outcome.fused.length,
    latencyMs: outcome.latencyMs,
    arms,
  };
  log.info("[sadeed/rag] outcome", event);
  return event;
}

/** للاختبارات والقياس وحدهما. */
export function resetRagObservationForTests(): void {
  windows.clear();
}
