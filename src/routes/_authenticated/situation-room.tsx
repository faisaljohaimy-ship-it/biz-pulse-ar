/**
 * Operations Room — `/situation-room`
 *
 * ٢٠٢٦/٠٨/٢٠ — تقليص كبير بتوجيه المالك (لقطة شاشة مؤشَّرة):
 * حُذفت جزيئة أدوار فريق العمليات، والمؤشر العام، وأوامر العمل المفتوحة،
 * ومؤشر الامتثال، وثقة الذكاء الاصطناعي، والوكلاء النشطون، وأعلى ٣ فرص،
 * وزرّا التوأم الرقمي ووضع العرض، وقسم «تعاون بين الوكلاء»، والخط الزمني
 * للمهمة. وتحوّلت البلاغات المفتوحة والحرجة والدوريات النشطة والزوار
 * داخل الموقع والتصاريح الفعّالة إلى بطاقات بارزة في منتصف الواجهة.
 *
 * Reuses `getBridgeState`, `getPredictedRisks`, `generateExecutiveBriefing`
 * and `BriefingStage`. No DB schema, no workflow, no agent logic changes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Loader2,
  PlayCircle,
  TrendingUp,
  Users,
  FileCheck2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";
import { cn } from "@/lib/utils";
import { getBridgeState, type BridgeHealth } from "@/lib/exec/bridge.functions";
import { generateExecutiveBriefing, type ExecutiveBriefing } from "@/lib/exec/briefing.functions";
import { getPredictedRisks } from "@/lib/exec/predictive.functions";
import { BriefingStage } from "@/components/bridge/BriefingStage";
import { DecisionEngine } from "@/components/situation-room/DecisionEngine";
import { userFacingError } from "@/lib/errors/user-facing-error";

export const Route = createFileRoute("/_authenticated/situation-room")({
  head: () => ({
    meta: [
      { title: "غرفة العمليات — إدارة الأمن الصناعي" },
      {
        name: "description",
        // ٢٠٢٦/٠٨/٢٠ — أُزيل ذكر «أدوار الوكلاء» بعد حذف الجزيئة من الصفحة.
        content: "غرفة عمليات حية لمتابعة الحوادث والتنبيهات فور حدوثها وتصنيفها حسب الخطورة.",
      },
    ],
  }),
  component: SituationRoomPage,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="space-y-3">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
        <div className="text-lg font-semibold text-white">Situation Room unavailable</div>
        <div className="max-w-md text-sm text-white/60">{userFacingError(error)}</div>
        <button
          onClick={reset}
          className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
        >
          Retry
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function threatLevel(score: number): {
  key: "secure" | "normal" | "elevated" | "critical";
  ar: string;
  en: string;
  tone: string;
} {
  if (score >= 90)
    return {
      key: "secure",
      ar: "آمن",
      en: "Secure",
      tone: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
    };
  if (score >= 70)
    return {
      key: "normal",
      ar: "عادي",
      en: "Normal",
      tone: "bg-cyan-400/15 text-cyan-200 ring-cyan-400/30",
    };
  if (score >= 50)
    return {
      key: "elevated",
      ar: "مرتفع",
      en: "Elevated",
      tone: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
    };
  return {
    key: "critical",
    ar: "حرج",
    en: "Critical",
    tone: "bg-rose-400/15 text-rose-200 ring-rose-400/30",
  };
}

function SituationRoomPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const getState = useServerFn(getBridgeState);
  const getRisks = useServerFn(getPredictedRisks);
  const genBriefing = useServerFn(generateExecutiveBriefing);

  const state = useQuery({
    queryKey: ["situation-state"],
    queryFn: () => getState(),
    refetchInterval: 45_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const risks = useQuery({
    queryKey: ["situation-risks"],
    queryFn: () => getRisks(),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  // ٢٠٢٦/٠٨/٢٠ — حُذف استعلام الخط الزمني للمهمة وحالة الإيقاف المؤقت مع حذف القسم.

  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);

  const startBriefing = useMutation({
    mutationFn: () => genBriefing(),
    onSuccess: (data) => setBriefing(data),
  });

  const health = state.data?.health;
  const threat = threatLevel(health?.score ?? 0);

  return (
    <main
      className="relative -mt-2 min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D] text-[15px]"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Ambient backdrop — calm, no looping animations */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />
        <div className="absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-emerald-400/[0.05] blur-[140px]" />
        <div className="absolute -bottom-20 left-0 h-[280px] w-[280px] rounded-full bg-amber-400/[0.04] blur-[120px]" />
      </div>

      <TopStatusBar ar={ar} loading={state.isLoading} threat={threat} />

      {/* ٢٠٢٦/٠٨/٢٠ — حُذف عمود الصحة التشغيلية الجانبي (المؤشر العام، أوامر العمل
          المفتوحة، مؤشر الامتثال، ثقة الذكاء الاصطناعي، وكلاء نشطون)، وانتقلت
          مؤشراته الخمسة الباقية بطاقاتٍ إلى منتصف الواجهة. */}
      <div className="relative grid grid-cols-1 gap-5 px-5 pb-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* CENTER — the five operational stat cards + briefing action */}
        <div className="relative flex min-h-[480px] flex-col justify-center gap-6">
          {/* ٢٠٢٦/٠٨/٢٠ — حُذفت جزيئة «أدوار فريق العمليات» (شبكة بطاقات الأدوار). */}
          <OperationalStatCards ar={ar} health={health} loading={state.isLoading} />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => startBriefing.mutate(undefined)}
              disabled={startBriefing.isPending || state.isLoading}
              className={cn(
                "group relative inline-flex min-h-11 items-center gap-3 rounded-2xl px-7 py-4",
                "bg-gradient-to-br from-cyan-400 to-cyan-500 text-[#04111F] shadow-[0_0_56px_rgba(0,212,255,0.5)]",
                "text-sm font-semibold uppercase tracking-[0.2em]",
                "hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed",
                "transition-[opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200",
              )}
              aria-label={ar ? "ابدأ الموجز التنفيذي" : "Begin Executive Briefing"}
            >
              {startBriefing.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
              {ar ? "ابدأ الموجز التنفيذي · 60 ثانية" : "Begin Executive Briefing · 60s"}
            </button>

            {/* ٢٠٢٦/٠٨/٢٠ — حُذف زرّا «التوأم الرقمي» و«وضع العرض» من هذه الصفحة. */}
          </div>

          {startBriefing.error && (
            <div className="text-sm text-rose-300">{userFacingError(startBriefing.error)}</div>
          )}
        </div>

        {/* RIGHT — Executive Decision Engine + Predicted Risks */}
        <div className="flex flex-col gap-4">
          <DecisionEngine ar={ar} />
          <PredictedRiskRail ar={ar} risks={risks.data ?? []} loading={risks.isLoading} />
        </div>
      </div>

      {/* ٢٠٢٦/٠٨/٢٠ — حُذف قسم «تعاون بين الوكلاء» وحُذف «الخط الزمني للمهمة». */}

      {briefing && (
        <BriefingStage
          briefing={briefing}
          ar={ar}
          backTo={{ ar: screenNameAr("/situation-room"), en: screenNameEn("/situation-room") }}
          onClose={() => setBriefing(null)}
        />
      )}
    </main>
  );
}

// ----------------------------------------------------------------------
// TOP — Mission Status / Threat Level
// ----------------------------------------------------------------------

function TopStatusBar({
  ar,
  loading,
  threat,
}: {
  ar: boolean;
  loading: boolean;
  threat: ReturnType<typeof threatLevel>;
}) {
  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 pt-6 pb-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl nx-holo-icon [--nx-holo-rgb:34_211_238]">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-[0.22em] text-cyan-300/80">
            {ar ? "إدارة الأمن الصناعي · متابعة لحظية" : "Industrial Security · Live Operations"}
          </div>
          <div className="truncate text-2xl font-light text-white sm:text-3xl">
            {ar ? "غرفة العمليات" : "Operations Room"}
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/55">
            {/* ٢٠٢٦/٠٨/٢٠ — اكتُفي بالجملة الأولى من الوصف وحُذفت البقية. */}
            {ar
              ? "متابعة الحوادث والتنبيهات فور حدوثها، وتصنيفها حسب الخطورة."
              : "Track incidents and alerts as they occur, and classify severity."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1",
            threat.tone,
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {ar ? "مستوى التهديد:" : "Threat:"} {loading ? "—" : ar ? threat.ar : threat.en}
        </div>
        <LiveClock ar={ar} />
      </div>
    </header>
  );
}

function LiveClock({ ar }: { ar: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] px-4 py-2 backdrop-blur">
      <div className="text-[12px] uppercase tracking-[0.16em] text-white/50">
        {ar ? "البث المباشر" : "Live"}
      </div>
      <div className="text-2xl font-light tabular-nums text-white">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CENTER — the five operational stat cards
// (٢٠٢٦/٠٨/٢٠ — كانت صفوفًا صغيرة في عمود جانبي؛ صارت بطاقات بارزة في
//  المنتصف بنمط StatCard المعتمد: تسمية/قيمة/نبرة، والحالة بالشكل والكلمة
//  لا باللون وحده — مثمّن = خطر · مثلث = تحذير.)
// ----------------------------------------------------------------------

type CenterTone = "danger" | "warning" | "info" | "success";

const CENTER_TONES: Record<
  CenterTone,
  {
    card: string;
    value: string;
    iconCls: string;
    badge?: string;
    badgeEn?: string;
    badgeCls?: string;
  }
> = {
  danger: {
    card: "border-red-500/50 bg-red-500/10",
    value: "text-red-300",
    iconCls: "text-red-400",
    badge: "خطر",
    badgeEn: "Danger",
    badgeCls: "border-red-500/40 bg-red-500/15 text-red-300",
  },
  warning: {
    card: "border-amber-500/50 bg-amber-500/10",
    value: "text-amber-300",
    iconCls: "text-amber-400",
    badge: "تحذير",
    badgeEn: "Warning",
    badgeCls: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  },
  info: {
    card: "border-cyan-400/25 bg-white/[0.03]",
    value: "text-cyan-200",
    iconCls: "text-cyan-300",
  },
  success: {
    card: "border-emerald-500/40 bg-emerald-500/[0.07]",
    value: "text-emerald-200",
    iconCls: "text-emerald-300",
  },
};

/** المادة ٢٧ — الغياب يُعرض «لم يُقَس»، والصفر ليس بديلًا عن الغياب. */
function statValue(loading: boolean, ar: boolean, v: number | null | undefined): string {
  if (loading) return "—";
  if (v == null) return ar ? "لم يُقَس" : "Not measured";
  return String(v);
}

function CenterStatCard({
  ar,
  label,
  labelEn,
  value,
  tone,
  Icon,
}: {
  ar: boolean;
  label: string;
  labelEn: string;
  value: string;
  tone: CenterTone;
  Icon: typeof AlertTriangle;
}) {
  const t = CENTER_TONES[tone];
  return (
    <div className={cn("rounded-2xl border p-4 backdrop-blur-xl", t.card)}>
      <div className="flex min-w-0 items-start gap-1.5">
        {/* aria-hidden: شارة الكلمة بجانب القيمة تنطق الحالة نصًّا. */}
        <Icon aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0", t.iconCls)} />
        {/* الاسم يلتفّ ولا يُبتر: `truncate` على عمودٍ خُمسيّ قِيست تقطع
            «تصاريح فعّالة» إلى «تصار…» — والبطاقة عنوانها هويتها. */}
        <div className="min-w-0 text-xs font-medium uppercase leading-snug tracking-wide text-white/60">
          {ar ? label : labelEn}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className={cn("text-3xl font-light tabular-nums", t.value)}>{value}</div>
        {t.badge && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[12px] font-semibold leading-none",
              t.badgeCls,
            )}
          >
            {ar ? t.badge : t.badgeEn}
          </span>
        )}
      </div>
    </div>
  );
}

function OperationalStatCards({
  ar,
  health,
  loading,
}: {
  ar: boolean;
  health?: BridgeHealth;
  loading: boolean;
}) {
  return (
    <section
      aria-label={ar ? "مؤشرات العمليات الرئيسة" : "Key operations indicators"}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      <CenterStatCard
        ar={ar}
        label="بلاغات مفتوحة"
        labelEn="Open Incidents"
        value={statValue(loading, ar, health?.open_incidents)}
        tone="warning"
        Icon={AlertTriangle}
      />
      <CenterStatCard
        ar={ar}
        label="بلاغات حرجة"
        labelEn="Critical Alerts"
        value={statValue(loading, ar, health?.critical_incidents)}
        tone="danger"
        Icon={OctagonAlert}
      />
      <CenterStatCard
        ar={ar}
        label="دوريات نشطة"
        labelEn="Active Patrols"
        value={statValue(loading, ar, health?.active_patrols)}
        tone="info"
        Icon={ShieldCheck}
      />
      <CenterStatCard
        ar={ar}
        label="زوار داخل الموقع"
        labelEn="Visitors Onsite"
        value={statValue(loading, ar, health?.visitors_onsite)}
        tone="info"
        Icon={Users}
      />
      <CenterStatCard
        ar={ar}
        label="تصاريح فعّالة"
        labelEn="Active Permits"
        value={statValue(loading, ar, health?.active_permits)}
        tone="success"
        Icon={FileCheck2}
      />
    </section>
  );
}

// ----------------------------------------------------------------------
// RIGHT — Predicted risks
// ----------------------------------------------------------------------

function PredictedRiskRail({
  ar,
  risks,
  loading,
}: {
  ar: boolean;
  risks: Awaited<ReturnType<typeof getPredictedRisks>>;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        <TrendingUp className="h-4 w-4" />
        {ar ? "مخاطر متوقعة" : "Predicted Risks"}
        {!loading && <span className="ml-auto text-white/40">{risks.length}</span>}
      </div>
      {loading && (
        <div className="text-sm text-white/40">{ar ? "جاري التحليل…" : "Analyzing…"}</div>
      )}
      {!loading && risks.length === 0 && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-[13px] text-emerald-200">
          {ar
            ? "لا تنبيهات متوقعة. الوضع ضمن المعدّل التشغيلي."
            : "No predicted anomalies. Operations are within baseline."}
        </div>
      )}
      <ul className="space-y-2">
        {risks.slice(0, 3).map((r) => {
          const tone =
            r.severity === "high"
              ? "border-rose-400/40 bg-rose-400/5"
              : r.severity === "medium"
                ? "border-amber-400/40 bg-amber-400/5"
                : "border-cyan-400/30 bg-cyan-400/5";
          const dot =
            r.severity === "high"
              ? "bg-rose-400"
              : r.severity === "medium"
                ? "bg-amber-400"
                : "bg-cyan-300";
          return (
            <li key={r.id} className={cn("rounded-2xl border p-3", tone)}>
              <div className="flex items-start gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate text-[14px] font-semibold text-white",
                      ar && "text-right",
                    )}
                  >
                    {ar ? r.title_ar : r.title_en}
                  </div>
                  <div
                    className={cn(
                      "mt-1 line-clamp-2 text-[12.5px] text-white/65",
                      ar && "text-right",
                    )}
                  >
                    {ar ? r.recommendation_ar : r.recommendation_en}
                  </div>
                  <div className="mt-1 text-[12px] text-white/45 tabular-nums">
                    {ar ? "ثقة" : "Conf."} {Math.round(r.confidence * 100)}%{" · "}
                    {r.horizon_hours}h
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
