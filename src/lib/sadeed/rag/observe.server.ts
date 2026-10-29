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
 * النسب المئوية التسعون والخمس (p95) لكمون كل ذراع وعدد مرشّحيها تُحسب على
 * نافذة منزلقة في ذاكرة المعزول (`RAG_LATENCY_WINDOW` عيّنة لكل ذراع) — رقمٌ
 * مقيس على ما مرّ بهذا المعزول، لا على الأسطول؛ ويُطبع «لم يُقَس» (`null`)
 * حين لا عيّنة.
 */
import type { AggregateOutcome } from "@/lib/retrieval/aggregate.server";

export const RAG_LATENCY_WINDOW = 200;

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
  servedArms: string[];
  hitCount: number;
  latencyMs: number;
  arms: Record<string, ArmObservation>;
}

/** يسجّل العيّنات ويبني الحدث؛ معرَّض للقياس (يُعيد ما طُبع). */
export function observeRagOutcome(
  outcome: AggregateOutcome,
  meta: { requestId?: string | null; audience: string },
  log: Pick<typeof console, "info" | "warn"> = console,
): RagOutcomeEvent {
  const arms: Record<string, ArmObservation> = {};
  for (const a of outcome.arms) {
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
