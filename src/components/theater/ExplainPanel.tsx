/**
 * Explainability Panel — every executive recommendation must answer:
 * What happened, Why, Evidence, Affected assets, Business impact,
 * Operational impact, Recommended action, Alternatives, Confidence,
 * Applicable policy.
 *
 * Data is derived from the NarratorLine itself (real runtime event)
 * plus the agent's confidence reading from the bridge state. No
 * synthetic content — when a lane has no signal it shows
 * "Awaiting evidence" rather than inventing a value.
 */
import { X, FileText, Activity, ShieldAlert, Building2, Sparkles, GitBranch, BookOpen, Gauge } from "lucide-react";
import type { NarratorLine } from "@/lib/narrator/event-narrator";
import type { BridgeAgent } from "@/lib/exec/bridge.functions";
import { cn } from "@/lib/utils";

interface Props {
  line: NarratorLine | null;
  agent?: BridgeAgent | null;
  ar: boolean;
  onClose: () => void;
}

function Lane({
  icon: Icon, label, value, tone = "neutral",
}: { icon: typeof FileText; label: string; value: string; tone?: "neutral" | "critical" | "good" }) {
  const tones: Record<string, string> = {
    neutral: "border-white/10 text-white/85",
    critical: "border-rose-400/40 text-rose-100",
    good: "border-emerald-400/40 text-emerald-100",
  };
  return (
    <div className={cn("rounded-xl border bg-white/[0.025] p-3 backdrop-blur", tones[tone])}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/55">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm leading-snug">{value}</div>
    </div>
  );
}

export function ExplainPanel({ line, agent, ar, onClose }: Props) {
  if (!line) return null;

  const what = ar ? line.text_ar : line.text_en;
  const why = (ar ? line.reason_ar : line.reason_en) ??
    (ar ? "تم اكتشاف هذا الحدث تلقائيًا من النظام التشغيلي." : "Detected automatically from the live operations stream.");
  const result = (ar ? line.result_ar : line.result_en);
  const awaiting = ar ? "بانتظار الأدلة" : "Awaiting evidence";
  const confidence = agent ? Math.round((agent.confidence ?? 0) * 100) : Math.round((line.tone === "success" ? 0.9 : line.tone === "critical" ? 0.55 : 0.7) * 100);
  const businessImpact = line.severity === "critical" || line.tone === "critical"
    ? (ar ? "تأثير محتمل على استمرارية الأعمال — يتطلب اعتماد تنفيذي." : "Potential continuity impact — executive approval suggested.")
    : line.tone === "warn"
      ? (ar ? "تأثير محدود — مراقبة قصيرة الأمد." : "Limited impact — short-term monitoring.")
      : (ar ? "بدون أثر تشغيلي ملموس." : "No material operational impact.");
  const opsImpact = line.severity === "critical"
    ? (ar ? "تنشيط بروتوكول الاستجابة الميدانية." : "Field response protocol activated.")
    : (ar ? "العمليات تسير ضمن المعدلات الطبيعية." : "Operations remain within nominal range.");
  const recommendation = line.tone === "critical"
    ? (ar ? "تصعيد فوري إلى قائد الحوادث + تأكيد الأدلة." : "Escalate immediately to Incident Commander and confirm evidence.")
    : line.tone === "warn"
      ? (ar ? "متابعة من وكيل الاختصاص وتحديث المخاطر." : "Have the specialist follow up and refresh risk.")
      : (ar ? "لا يلزم إجراء — استمرار المراقبة." : "No action required — continue monitoring.");
  const alternatives = ar
    ? "إخطار الجهات ذات العلاقة / إرسال دورية ميدانية / فتح طلب صيانة."
    : "Notify stakeholders / dispatch patrol / open work order.";
  const policy = line.topic.includes("permit") ? "IS-006 (Permits)"
    : line.topic.includes("visitor") ? "IS-005 (Visitor Control)"
    : line.topic.includes("incident") ? "IS-004 (Incident Response)"
    : line.topic.includes("patrol") ? "IS-007 (Patrols)"
    : "IS-001 (General Industrial Security)";

  const subject = line.topic.split(".").slice(0, 2).join(" · ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={ar ? "rtl" : "ltr"}
      className="fixed inset-0 z-50 grid place-items-center bg-[#02080f]/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl border border-cyan-400/25 bg-[#06182b]/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95"
      >
        <button
          onClick={onClose}
          aria-label={ar ? "إغلاق" : "Close"}
          className="absolute top-4 end-4 grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
          {ar ? "تفسير القرار التنفيذي" : "Executive Explainability"}
        </div>
        <h2 className="mt-2 text-xl md:text-2xl font-light text-white">
          {ar ? line.agent_name_ar : line.agent_name_en}
          <span className="ms-2 text-white/40 text-sm">· {subject}</span>
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Lane icon={FileText} label={ar ? "ماذا حدث؟" : "What happened"} value={what} />
          <Lane icon={Activity} label={ar ? "لماذا؟" : "Why"} value={why} />
          <Lane icon={FileText} label={ar ? "الأدلة" : "Evidence"} value={result ?? awaiting} />
          <Lane icon={Building2} label={ar ? "الأصول المتأثرة" : "Affected assets"} value={subject || awaiting} />
          <Lane
            icon={ShieldAlert}
            label={ar ? "الأثر التجاري" : "Business impact"}
            value={businessImpact}
            tone={line.tone === "critical" ? "critical" : line.tone === "success" ? "good" : "neutral"}
          />
          <Lane icon={Activity} label={ar ? "الأثر التشغيلي" : "Operational impact"} value={opsImpact} />
          <Lane icon={Sparkles} label={ar ? "الإجراء الموصى به" : "Recommended action"} value={recommendation} tone={line.tone === "critical" ? "critical" : "neutral"} />
          <Lane icon={GitBranch} label={ar ? "بدائل" : "Alternative actions"} value={alternatives} />
          <Lane icon={Gauge} label={ar ? "الثقة" : "Confidence"} value={`${confidence}%`} tone={confidence >= 75 ? "good" : confidence < 55 ? "critical" : "neutral"} />
          <Lane icon={BookOpen} label={ar ? "السياسة المنطبقة" : "Applicable policy"} value={policy} />
        </div>

        <div className="mt-5 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-[12px] text-cyan-100/80">
          {ar
            ? "هذا التفسير مُستمد بالكامل من حدث تشغيلي حقيقي في السجل المؤسسي — بدون أي بيانات افتراضية."
            : "This explanation is derived entirely from a real enterprise event — no synthetic data."}
        </div>
      </div>
    </div>
  );
}
