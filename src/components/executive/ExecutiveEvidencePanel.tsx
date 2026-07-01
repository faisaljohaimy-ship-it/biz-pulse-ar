/**
 * ExecutiveEvidencePanel — Phase 4.3.
 *
 * Renders the `executive` payload returned by `/api/public/aria-ask`
 * (evidence, reasoning, recommendation, next_action, confidence,
 * sources, plan, insights). Nothing is fabricated here — every field
 * originates from the Executive Reasoning pipeline.
 *
 * Includes Executive Decision Actions (Approve / Reject / Investigate /
 * Assign / Schedule / Escalate / Generate Report). These are UI signals
 * only: they emit a follow-up prompt back into the conversation so
 * ARIA can respond with the appropriate operational reply — no backend
 * mutations occur.
 */
import { useState } from "react";
import {
  Check, X, Search, UserPlus, CalendarClock, AlertTriangle,
  FileText, ChevronDown, ChevronRight, Sparkles, Target, Gauge,
  BookOpen, Building2, ShieldAlert,
} from "lucide-react";

export interface ExecutivePayload {
  intent?: string;
  summary?: string;
  evidence?: string[];
  reasoning?: string;
  recommendation?: string;
  next_action?: unknown;
  confidence?: number;
  sources?: unknown[];
  plan?: Array<{ id?: string; tool?: string; goal?: string }>;
  insights?: Array<{
    kind?: string;
    severity?: string;
    title_en?: string;
    title_ar?: string;
    recommendation_en?: string;
    confidence?: number;
  }>;
}

export type ExecutiveDecision =
  | "approve" | "reject" | "investigate" | "assign"
  | "schedule" | "escalate" | "report";

const DECISIONS: Array<{
  key: ExecutiveDecision;
  label_en: string;
  label_ar: string;
  Icon: typeof Check;
  tone: "primary" | "danger" | "neutral";
  prompt_en: string;
  prompt_ar: string;
}> = [
  { key: "approve", label_en: "Approve", label_ar: "اعتماد", Icon: Check, tone: "primary",
    prompt_en: "I approve the recommendation. Confirm what happens next and who is notified.",
    prompt_ar: "اعتمدت التوصية. وضّح الخطوات التالية والجهات التي سيتم إخطارها." },
  { key: "reject", label_en: "Reject", label_ar: "رفض", Icon: X, tone: "danger",
    prompt_en: "I reject the recommendation. Suggest a safer alternative with justification.",
    prompt_ar: "أرفض التوصية. اقترح بديلاً أكثر أماناً مع تبرير واضح." },
  { key: "investigate", label_en: "Investigate", label_ar: "تحقيق", Icon: Search, tone: "neutral",
    prompt_en: "Open a deeper investigation — surface root cause, related incidents and owner.",
    prompt_ar: "افتحي تحقيقاً أعمق: السبب الجذري، البلاغات المرتبطة، والجهة المسؤولة." },
  { key: "assign", label_en: "Assign", label_ar: "إسناد", Icon: UserPlus, tone: "neutral",
    prompt_en: "Assign the corrective action to the most suitable owner and justify the choice.",
    prompt_ar: "أسندي الإجراء التصحيحي إلى المسؤول الأنسب مع تبرير الاختيار." },
  { key: "schedule", label_en: "Schedule", label_ar: "جدولة", Icon: CalendarClock, tone: "neutral",
    prompt_en: "Schedule the next executive review for this item — propose date, attendees and agenda.",
    prompt_ar: "جدولي المراجعة التنفيذية التالية لهذا البند: التاريخ، الحضور، وجدول الأعمال." },
  { key: "escalate", label_en: "Escalate", label_ar: "تصعيد", Icon: AlertTriangle, tone: "danger",
    prompt_en: "Escalate to executive leadership — draft the escalation note and impact statement.",
    prompt_ar: "صعّدي الأمر للقيادة التنفيذية: اكتبي مذكرة التصعيد وبيان الأثر." },
  { key: "report", label_en: "Generate Report", label_ar: "تقرير", Icon: FileText, tone: "neutral",
    prompt_en: "Generate a one-page executive report for this item with evidence, risk and recommendation.",
    prompt_ar: "أنشئي تقريراً تنفيذياً من صفحة واحدة يتضمن الأدلة والمخاطر والتوصية." },
];

function severityTone(s?: string): string {
  const k = (s ?? "").toLowerCase();
  if (k === "critical") return "border-rose-400/60 bg-rose-400/10 text-rose-200";
  if (k === "high") return "border-amber-400/60 bg-amber-400/10 text-amber-200";
  if (k === "medium") return "border-cyan-400/50 bg-cyan-400/10 text-cyan-100";
  return "border-white/15 bg-white/5 text-white/70";
}

function priorityFromInsights(insights?: ExecutivePayload["insights"]): { label_en: string; label_ar: string; tone: string } {
  const sev = (insights ?? []).map((i) => (i.severity ?? "").toLowerCase());
  if (sev.includes("critical")) return { label_en: "P1 · Critical", label_ar: "أولوية ١ · حرج", tone: "text-rose-200 border-rose-400/60 bg-rose-400/10" };
  if (sev.includes("high")) return { label_en: "P2 · High", label_ar: "أولوية ٢ · عالية", tone: "text-amber-200 border-amber-400/60 bg-amber-400/10" };
  if (sev.includes("medium")) return { label_en: "P3 · Medium", label_ar: "أولوية ٣ · متوسطة", tone: "text-cyan-100 border-cyan-400/50 bg-cyan-400/10" };
  return { label_en: "P4 · Informational", label_ar: "أولوية ٤ · للعلم", tone: "text-white/70 border-white/15 bg-white/5" };
}

export function ExecutiveEvidencePanel({
  payload, ar, onDecision, affectedDepartments,
}: {
  payload: ExecutivePayload;
  ar: boolean;
  onDecision: (d: ExecutiveDecision, prompt: string) => void;
  /** Departments derived from the current page snapshot (context). */
  affectedDepartments?: string[];
}) {
  const [open, setOpen] = useState(false);
  const conf = typeof payload.confidence === "number" ? Math.round(payload.confidence * 100) : null;
  const nextAction = (() => {
    const n = payload.next_action;
    if (!n || typeof n !== "object") return null;
    const rec = n as Record<string, unknown>;
    const title = (rec.title_en as string) || (rec.title as string) || (rec.label as string) || "";
    const owner = (rec.owner as string) || (rec.assignee as string) || "";
    const due = (rec.due as string) || (rec.by as string) || "";
    if (!title && !owner && !due) return null;
    return { title, owner, due };
  })();
  const priority = priorityFromInsights(payload.insights);
  const hasAnything =
    (payload.evidence && payload.evidence.length) ||
    payload.reasoning || payload.recommendation ||
    nextAction || (payload.insights && payload.insights.length) ||
    (payload.plan && payload.plan.length);
  if (!hasAnything && conf === null) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[#3AE8FF]/25 bg-[#04111F]/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em] text-[#3AE8FF]/85 transition hover:bg-[#3AE8FF]/[0.06]"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rtl:rotate-180" />}
        <Sparkles className="h-3 w-3" />
        <span className="flex-1">{ar ? "لوحة الأدلة التنفيذية" : "Executive Evidence"}</span>
        {conf !== null && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-2 py-[2px] text-[10px] normal-case tracking-normal text-[#3AE8FF]">
            <Gauge className="h-3 w-3" /> {ar ? `الثقة ${conf}٪` : `${conf}% conf.`}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] normal-case tracking-normal ${priority.tone}`}>
          <ShieldAlert className="h-3 w-3" /> {ar ? priority.label_ar : priority.label_en}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-white/5 p-3 text-[12px] leading-relaxed text-white/85">
          {payload.summary && (
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                <BookOpen className="h-3 w-3" /> {ar ? "الملخص" : "Summary"}
              </div>
              <p dir="auto" className="whitespace-pre-wrap">{payload.summary}</p>
            </div>
          )}

          {payload.evidence && payload.evidence.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                <Target className="h-3 w-3" /> {ar ? "الأدلة" : "Evidence"}
              </div>
              <ul className="space-y-1">
                {payload.evidence.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-[#3AE8FF]" />
                    <span dir="auto">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {payload.reasoning && (
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                {ar ? "التحليل" : "Reasoning"}
              </div>
              <p dir="auto" className="whitespace-pre-wrap">{payload.reasoning}</p>
            </div>
          )}

          {payload.insights && payload.insights.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
                {ar ? "بلاغات ومخاطر مرتبطة" : "Related Incidents & Risks"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {payload.insights.slice(0, 6).map((i, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] ${severityTone(i.severity)}`}
                    title={i.recommendation_en ?? ""}
                  >
                    <span className="uppercase tracking-wider">{i.severity ?? "info"}</span>
                    <span className="text-white/90">·</span>
                    <span>{ar ? (i.title_ar || i.title_en) : (i.title_en || i.title_ar)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {affectedDepartments && affectedDepartments.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                <Building2 className="h-3 w-3" /> {ar ? "الجهات المتأثرة" : "Affected Departments"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {affectedDepartments.slice(0, 5).map((d) => (
                  <span key={d} className="rounded-full border border-white/15 bg-white/5 px-2 py-[3px] text-[10.5px] text-white/80">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {payload.recommendation && (
            <div className="rounded-lg border border-[#3AE8FF]/30 bg-[#3AE8FF]/[0.06] p-2">
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-[#3AE8FF]">
                {ar ? "التوصية التنفيذية" : "Executive Recommendation"}
              </div>
              <p dir="auto" className="whitespace-pre-wrap text-white/95">{payload.recommendation}</p>
            </div>
          )}

          {nextAction && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11.5px]">
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                {ar ? "الإجراء التالي" : "Next Action"}
              </div>
              <div dir="auto" className="text-white/90">{nextAction.title || (ar ? "إجراء موصى به" : "Recommended action")}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-white/60">
                {nextAction.owner && <span>{ar ? "المسؤول:" : "Owner:"} <span className="text-white/85">{nextAction.owner}</span></span>}
                {nextAction.due && <span>{ar ? "الاستحقاق:" : "Due:"} <span className="text-white/85">{nextAction.due}</span></span>}
              </div>
            </div>
          )}

          {/* Executive Decision Actions — UI-only, feed a follow-up prompt. */}
          <div className="border-t border-white/5 pt-2">
            <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
              {ar ? "قرار تنفيذي" : "Executive Decision"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DECISIONS.map((d) => {
                const tone =
                  d.tone === "primary"
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                    : d.tone === "danger"
                      ? "border-rose-400/60 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                      : "border-white/15 bg-white/[0.04] text-white/85 hover:border-[#3AE8FF]/60 hover:text-white";
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => onDecision(d.key, ar ? d.prompt_ar : d.prompt_en)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${tone}`}
                  >
                    <d.Icon className="h-3 w-3" />
                    {ar ? d.label_ar : d.label_en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
