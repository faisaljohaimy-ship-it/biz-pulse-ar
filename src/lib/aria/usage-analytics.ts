/**
 * ARIA usage analytics — deterministic, fixture-derived metrics (Phase 5).
 *
 * No network, no external key: every figure is derived from the SAME simulation
 * fixtures the rest of the deck reads (`regionSim`), so the analytics stay
 * mathematically consistent with the dashboard and are honestly badged
 * «محاكاة» (constitution art. 11 + 13.5: single source of truth, no unlabeled
 * numbers). When a real `aria_usage` telemetry source is wired later, this
 * module is the single seam to swap.
 */
import { REGIONS } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";

export interface UsageKpi {
  readonly key: string;
  readonly ar: string;
  readonly value: string;
  readonly hintAr: string;
}

export interface TopQuestion {
  readonly ar: string;
  readonly count: number;
}

export interface UsageAnalytics {
  readonly kpis: readonly UsageKpi[];
  readonly topQuestions: readonly TopQuestion[];
  /** Last 7 days message volume (index 0 = six days ago … 6 = today). */
  readonly weekly: readonly number[];
  readonly satisfaction: number; // 0–100
}

/** Deterministic 7-day shape scaled to a base volume — no randomness. */
function weeklyShape(base: number): number[] {
  const weights = [0.72, 0.81, 0.9, 0.86, 0.95, 0.6, 1]; // Sun→Sat feel, calm weekend
  return weights.map((w) => Math.round(base * w));
}

export function getUsageAnalytics(): UsageAnalytics {
  const per = REGIONS.map((r) => regionSim(r.id).counts);
  const sum = (f: (c: (typeof per)[number]) => number) => per.reduce((a, c) => a + f(c), 0);

  // Field activity seeds the message volume so the numbers track the deck.
  const fieldStaff = sum((c) => c.contractors_active + c.patrols_active);
  const incidents = sum((c) => c.incidents_open);
  const alerts = sum((c) => c.cctv_new);
  const messagesToday = fieldStaff * 7 + incidents * 11 + alerts * 5;
  const activeUsers = REGIONS.length * 6 + Math.round(fieldStaff / 12);
  // Response time inversely tracks load, clamped to a graceful band.
  const responseMs = 900 + incidents * 12;
  const satisfaction = Math.max(88, 98 - incidents);

  const kpis: UsageKpi[] = [
    {
      key: "messages",
      ar: "رسائل اليوم",
      value: messagesToday.toLocaleString("ar-EG"),
      hintAr: "إجمالي المحادثات عبر المناطق",
    },
    {
      key: "users",
      ar: "مستخدمون نشطون",
      value: String(activeUsers),
      hintAr: "خلال آخر ٢٤ ساعة",
    },
    {
      key: "latency",
      ar: "زمن الاستجابة",
      value: `${(responseMs / 1000).toFixed(1)} ث`,
      hintAr: "متوسط زمن أول رد",
    },
    {
      key: "satisfaction",
      ar: "الرضا 👍",
      value: `${satisfaction}%`,
      hintAr: "من تقييمات المستخدمين",
    },
  ];

  const topQuestions: TopQuestion[] = [
    { ar: "ما حالة البلاغات المفتوحة اليوم؟", count: incidents * 9 + 12 },
    { ar: "لخّص جاهزية المناطق الأربع", count: fieldStaff + 8 },
    { ar: "أنشئ تقرير الأمن الأسبوعي", count: Math.round(fieldStaff / 2) + 6 },
    { ar: "ما أعلى المخاطر الحالية؟", count: incidents * 3 + 5 },
    { ar: "جدول اجتماع مراجعة التصاريح", count: alerts * 4 + 3 },
  ].sort((a, b) => b.count - a.count);

  return {
    kpis,
    topQuestions,
    weekly: weeklyShape(Math.round(messagesToday / 1.2)),
    satisfaction,
  };
}
