/**
 * لقطة حالة القناة — نقيّة، **وما لم يُقَس فيها `null` لا صفر**.
 *
 * الأرقام هنا تخرج من هذا المعزول وحده وهذه اللحظة وحدها: `p95_ms` من نافذة آخر نداءات ناجحة
 * (لا فاشلة، فزمن مهلةٍ ليس زمن خدمة)، و`last_ok_at` آخر نجاحٍ رآه المعزول. معزولٌ بارد ⇒ الاثنان
 * `null` ⇒ يُعرضان «لم يُقَس». صفرٌ ليس بديلًا عن غياب (المادة ٢٧).
 *
 * لا بيئة ولا شبكة ولا ساعة هنا: العميل يمرّر ما رآه، فيُختبر الشكل بقيمٍ ثابتة.
 */
import type { BreakerState } from "./breaker";
import type { WebResearchMode } from "./config.server";
import type { N8nSurface } from "./protocol";

/** نافذة آخر N زمن خدمة ناجحة (مللي ثانية). */
export class LatencyWindow {
  private readonly samples: number[] = [];
  constructor(private readonly max = 100) {}

  record(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.samples.push(ms);
    if (this.samples.length > this.max) this.samples.shift();
  }

  get count(): number {
    return this.samples.length;
  }

  /** الرتبة الأقرب (nearest-rank) أو `null` بلا عيّنات. */
  p95(): number | null {
    if (this.samples.length === 0) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return Math.round(sorted[Math.ceil(0.95 * sorted.length) - 1]);
  }
}

export interface N8nStatusSnapshot {
  readonly surface: N8nSurface;
  readonly configured: boolean;
  /** مفتاح الإيقاف (`SADEED_AI_DISABLED` أو `SADEED_WEB_DISABLED`) مرفوع. */
  readonly disabled: boolean;
  /** وضع بحث سَدِيد؛ `null` لسطح FNN (لا ينطبق عليه). */
  readonly mode: WebResearchMode | null;
  readonly breaker: BreakerState;
  readonly last_ok_at: string | null;
  readonly p95_ms: number | null;
  /** عدد عيّنات الزمن التي بُني عليها `p95_ms` (0 ⇒ لم يُقَس). */
  readonly samples: number;
}

export interface StatusInput {
  readonly surface: N8nSurface;
  readonly configured: boolean;
  readonly disabled: boolean;
  readonly mode: WebResearchMode;
  readonly breaker: BreakerState;
  readonly lastOkAtMs: number | null;
  readonly latencies: LatencyWindow;
}

export function buildStatusSnapshot(input: StatusInput): N8nStatusSnapshot {
  return {
    surface: input.surface,
    configured: input.configured,
    disabled: input.disabled,
    mode: input.surface === "sadeed" ? input.mode : null,
    breaker: input.breaker,
    last_ok_at: input.lastOkAtMs === null ? null : new Date(input.lastOkAtMs).toISOString(),
    p95_ms: input.latencies.p95(),
    samples: input.latencies.count,
  };
}
