"use client";

/**
 * EmergencyBroadcast — ARIA red-alert broadcaster (Phase 4).
 *
 * Compose a critical alert, choose a region (or all), then a MANDATORY human
 * confirmation gate must be cleared before anything is sent — no accidental
 * mass alerts. The alert is always recorded (accountability trail); actual
 * SMS/email dispatch happens only when provider keys exist, otherwise it runs
 * in an elegant demo mode. Full RTL, ≥44px targets.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Siren, ShieldAlert, Send, X, CheckCircle2 } from "lucide-react";
import { REGIONS } from "@/lib/regions";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import { broadcastAlert } from "@/lib/aria/alerts.functions";
import { cn } from "@/lib/utils";

type Severity = "info" | "warning" | "critical";

const SEVERITIES: { id: Severity; ar: string; ring: string }[] = [
  { id: "critical", ar: "حرج", ring: "border-rose-400/60 bg-rose-500/15 text-rose-200" },
  { id: "warning", ar: "تحذير", ring: "border-amber-400/60 bg-amber-500/15 text-amber-200" },
  { id: "info", ar: "إعلام", ring: "border-[#3AE8FF]/50 bg-[#3AE8FF]/10 text-[#BEEBFF]" },
];

const regionName = (id: string) => REGION_MARKERS.find((m) => m.id === id)?.ar ?? id;

export function EmergencyBroadcast({ className }: { className?: string }) {
  const broadcast = useServerFn(broadcastAlert);
  const [severity, setSeverity] = useState<Severity>("critical");
  const [target, setTarget] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ demo: boolean; dispatched: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 2 && body.trim().length >= 2;
  const targetLabel = target === "all" ? "كل المناطق" : `منطقة ${regionName(target)}`;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await broadcast({ data: { title, body, severity, target } });
      setResult({ demo: r.demo, dispatched: r.dispatched });
      setConfirming(false);
      setTitle("");
      setBody("");
    } catch (e) {
      setError((e as Error).message || "تعذّر البثّ — أعد المحاولة.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      dir="rtl"
      aria-label="بثّ طوارئ"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rose-400/25 bg-gradient-to-b from-[#2a0c12]/60 to-[#06101F]/70 p-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/15 text-rose-300">
          <Siren className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-bold text-white">بثّ طوارئ</h2>
      </div>

      {result ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
          <div className="text-[13px] leading-relaxed">
            سُجِّل التنبيه بنجاح.{" "}
            {result.demo
              ? "لم تُضبَط قنوات الإرسال بعد — يظهر بوضع محاكاة، وسيُرسَل فور إضافة مفاتيح المزوّد."
              : `أُرسِل إلى ${result.dispatched} مستلمًا.`}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="ms-2 font-semibold text-emerald-200 underline underline-offset-4"
            >
              بثّ آخر
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Severity */}
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeverity(s.id)}
                className={cn(
                  "min-h-9 flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition",
                  severity === s.id ? s.ring : "border-white/10 bg-white/[0.03] text-white/60",
                )}
              >
                {s.ar}
              </button>
            ))}
          </div>
          {/* Target region */}
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="المنطقة المستهدفة"
            className="min-h-11 w-full rounded-lg border border-white/10 bg-[#061A2E]/70 px-3 text-sm text-white outline-none focus:border-[#3AE8FF]/50"
          >
            <option value="all">كل المناطق</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                منطقة {regionName(r.id)}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان التنبيه"
            aria-label="عنوان التنبيه"
            className="min-h-11 w-full rounded-lg border border-white/10 bg-[#061A2E]/70 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#3AE8FF]/50"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="نصّ التنبيه…"
            aria-label="نص التنبيه"
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#061A2E]/70 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#3AE8FF]/50"
          />
          {error && <div className="text-xs text-rose-300">{error}</div>}
          <button
            type="button"
            disabled={!valid}
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/50 bg-rose-500/15 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
            بثّ الطوارئ
          </button>
        </div>
      )}

      {/* Mandatory human confirmation gate */}
      {confirming && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#04070F]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-rose-400/40 bg-[#0A0E1A] p-5 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-rose-400" aria-hidden />
            <div className="mt-3 text-sm font-bold text-white">تأكيد بشري إلزامي</div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/70">
              سيُبَثّ تنبيه{" "}
              <span className="font-semibold text-rose-200">
                {severity === "critical" ? "حرج" : severity === "warning" ? "تحذير" : "إعلام"}
              </span>{" "}
              إلى <span className="font-semibold text-white">{targetLabel}</span>. هل تريد المتابعة؟
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-sm font-semibold text-white/80"
              >
                <X className="h-4 w-4" aria-hidden />
                إلغاء
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-400/60 bg-rose-500/25 text-sm font-bold text-rose-100 disabled:opacity-60"
              >
                <Siren className="h-4 w-4" aria-hidden />
                {sending ? "جارٍ البثّ…" : "تأكيد البثّ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default EmergencyBroadcast;
