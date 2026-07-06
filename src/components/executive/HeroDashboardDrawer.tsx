/**
 * HeroDashboardDrawer — right-side executive mini-dashboard opened from
 * the global ARIA hero launcher. Read-only, live KPIs from getPublicKpis
 * (safe to render for anonymous visitors). CTA links to the full
 * authenticated executive dashboard.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { getPublicKpis, type PublicKpis } from "@/lib/sec.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenAria?: () => void;
}

export function HeroDashboardDrawer({ open, onClose, onOpenAria }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const fetchKpis = useServerFn(getPublicKpis);

  const q = useQuery<PublicKpis | null>({
    queryKey: ["hero-dashboard-kpis"],
    queryFn: async () => {
      try { return await fetchKpis(); } catch { return null; }
    },
    enabled: open,
    refetchInterval: open ? 15_000 : false,
    staleTime: 10_000,
  });

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const k = q.data;
  const fmt = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? v.toLocaleString(ar ? "ar-SA" : "en-US") : null;

  const tiles: Array<{
    key: string;
    label: string;
    value: string | null;
    icon: typeof Activity;
    tone: "cyan" | "amber" | "emerald" | "rose";
  }> = [
    { key: "total", label: ar ? "إجمالي الحوادث" : "Total Incidents", value: fmt(k?.incidents_total), icon: AlertTriangle, tone: "cyan" },
    { key: "open", label: ar ? "مفتوحة" : "Open", value: fmt(k?.incidents_open), icon: AlertTriangle, tone: (k?.incidents_open ?? 0) > 5 ? "amber" : "cyan" },
    { key: "critical", label: ar ? "حرجة" : "Critical", value: fmt(k?.incidents_critical), icon: AlertTriangle, tone: (k?.incidents_critical ?? 0) > 0 ? "rose" : "emerald" },
    { key: "res", label: ar ? "معدّل الحل" : "Resolution", value: typeof k?.incidents_resolution_rate === "number" ? `${k.incidents_resolution_rate}%` : null, icon: CheckCircle2, tone: "emerald" },
    { key: "wo", label: ar ? "أوامر العمل" : "Work Orders", value: fmt(k?.work_orders_active), icon: Wrench, tone: "cyan" },
    { key: "maint", label: ar ? "صيانة وقائية" : "Preventive", value: fmt(k?.maintenance_pending), icon: Activity, tone: "cyan" },
  ];

  const toneClass: Record<string, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/5 text-cyan-200",
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-200",
    emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
    rose: "border-rose-400/30 bg-rose-400/5 text-rose-200",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={ar ? "لوحة القيادة التنفيذية" : "Executive Dashboard"}
            dir={ar ? "rtl" : "ltr"}
            initial={{ x: ar ? "100%" : "-100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: ar ? "100%" : "-100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={cn(
              "fixed top-0 z-[61] flex h-[100dvh] flex-col overflow-hidden border-cyan-400/20 bg-[#04111f]/95 backdrop-blur-2xl",
              ar ? "right-0 border-l" : "left-0 border-r",
            )}
            style={{ width: "min(420px, 92vw)" }}
          >
            {/* Header */}
            <header className="relative flex items-start justify-between gap-3 border-b border-cyan-400/15 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                  <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  LIVE
                </div>
                <h2 className="mt-1 truncate text-base font-bold text-white">
                  {ar ? "لوحة القيادة التنفيذية" : "Executive Command Dashboard"}
                </h2>
                <p className="mt-0.5 text-[11px] text-white/50">
                  {ar ? "مؤشرات حيّة تُحدَّث كل ١٥ ثانية" : "Live indicators • refreshes every 15s"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={ar ? "إغلاق" : "Close"}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="grid grid-cols-2 gap-2.5">
                {tiles.map((t) => {
                  const Icon = t.icon;
                  return (
                    <li
                      key={t.key}
                      className={cn(
                        "relative overflow-hidden rounded-xl border px-3 py-3 backdrop-blur",
                        toneClass[t.tone],
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">{t.label}</div>
                        <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      </div>
                      <div className="mt-1.5 text-2xl font-bold text-white">
                        {t.value ?? (
                          <span className="inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                            {ar ? "قيد الربط" : "Pending"}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Risk banner */}
              {k?.risk_level && (
                <div
                  className={cn(
                    "mt-4 rounded-xl border px-3 py-2.5 text-xs font-medium",
                    k.risk_level === "critical" && "border-rose-400/40 bg-rose-400/10 text-rose-200",
                    k.risk_level === "elevated" && "border-amber-400/40 bg-amber-400/10 text-amber-200",
                    k.risk_level === "low" && "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
                  )}
                >
                  {ar ? "مستوى المخاطر: " : "Risk level: "}
                  <span className="font-bold uppercase">
                    {k.risk_level === "low" ? (ar ? "منخفض" : "Low") :
                      k.risk_level === "elevated" ? (ar ? "مرتفع" : "Elevated") :
                      (ar ? "حرج" : "Critical")}
                  </span>
                </div>
              )}
            </div>

            {/* Footer CTAs */}
            <footer className="border-t border-cyan-400/15 bg-black/30 px-5 py-4">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate({ to: "/sec/exec" });
                  }}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 to-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:from-cyan-500/30 hover:text-white"
                >
                  <span>{ar ? "افتح لوحة القيادة الكاملة" : "Open full dashboard"}</span>
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
                {onOpenAria && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenAria(); }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {ar ? "تحدّث مع ARIA" : "Talk to ARIA"}
                  </button>
                )}
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default HeroDashboardDrawer;
