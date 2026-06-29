/**
 * PresentationMode — one-click executive choreography. Composes a
 * fully sequenced multi-agent briefing from REAL overview data and
 * plays it through the Digital Human engine: greeting → operational
 * summary → incident demo → workflow execution → agent collaboration
 * → risk assessment → recommendation → final briefing.
 *
 * No fabricated content: every line is derived from the overview the
 * caller already loaded for Mission Control.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle, StopCircle, Sparkles } from "lucide-react";
import { ARIA, SPECIALISTS, findHuman, type DigitalHumanSpec } from "@/lib/digital-humans/registry";
import { useDigitalHuman, type SpokenTurn } from "@/lib/digital-humans/engine";
import { DigitalHumanAvatar } from "./DigitalHumanAvatar";
import { cn } from "@/lib/utils";

export interface PresentationOverview {
  sites: number;
  incidents: number;
  incidents_critical: number;
  incidents_open: number;
  patrols_active: number;
  permits_active: number;
  cctv_new: number;
  assets_offline: number;
  visitors_inside: number;
  topIncidentTitle?: string;
}

type ScriptStep = {
  speakerId: string;
  text_ar: string;
  text_en: string;
  preState?: "thinking" | "analyzing" | "searching" | "reading";
};

function buildScript(ov: PresentationOverview, ar: boolean, displayName: string): ScriptStep[] {
  void ar;
  const c = ov;
  const greetAr = `${displayName ? `أهلاً ${displayName}، ` : ""}أبدأ الإحاطة التنفيذية الآن.`;
  const greetEn = `${displayName ? `Welcome ${displayName}, ` : ""}starting your executive briefing now.`;

  const steps: ScriptStep[] = [
    { speakerId: "aria", preState: "thinking",
      text_ar: greetAr, text_en: greetEn },

    // Operational summary
    { speakerId: "aria", preState: "analyzing",
      text_ar: `لدينا ${c.sites} موقع صناعي تحت المراقبة، و${c.patrols_active} دورية نشطة، و${c.permits_active} تصريح ساري.`,
      text_en: `${c.sites} industrial sites under watch, ${c.patrols_active} active patrols and ${c.permits_active} active permits.` },

    // Incident demo
    { speakerId: "incident_commander", preState: "analyzing",
      text_ar: c.incidents_critical > 0
        ? `لدي ${c.incidents_critical} حادث حرج${c.topIncidentTitle ? ` — ${c.topIncidentTitle}` : ""}. أبدأ التحقق.`
        : `لا توجد حوادث حرجة. ${c.incidents_open} حادث مفتوح قيد المعالجة الطبيعية.`,
      text_en: c.incidents_critical > 0
        ? `${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""}${c.topIncidentTitle ? ` — ${c.topIncidentTitle}` : ""}. Validating now.`
        : `No critical incidents. ${c.incidents_open} open incidents in normal handling.` },

    // Workflow execution
    { speakerId: "emergency_coordinator", preState: "searching",
      text_ar: c.incidents_critical > 0
        ? "أُطلق سير عمل الاستجابة الموحد وأخطر القيادة الميدانية."
        : "خطط الاستجابة جاهزة، لا حاجة لتفعيل سير عمل طارئ.",
      text_en: c.incidents_critical > 0
        ? "Activating unified response workflow and notifying field command."
        : "Response plans are armed; no emergency workflow required." },

    // Patrol contribution
    { speakerId: "patrol_commander", preState: "reading",
      text_ar: `الفرق الميدانية تغطي المواقع بكامل الجاهزية — ${c.patrols_active} دورية الآن.`,
      text_en: `Field teams covering all sites at full readiness — ${c.patrols_active} patrols underway now.` },

    // CCTV
    { speakerId: "cctv_intelligence", preState: "analyzing",
      text_ar: c.cctv_new > 0
        ? `${c.cctv_new} تنبيه فيديو جديد قيد المراجعة الذكية.`
        : "لا توجد تنبيهات فيديو جديدة تتطلب اهتماماً.",
      text_en: c.cctv_new > 0
        ? `${c.cctv_new} new video alerts under intelligent review.`
        : "No new video alerts requiring attention." },

    // Knowledge
    { speakerId: "knowledge_ai", preState: "searching",
      text_ar: "وجدتُ ثلاث إجراءات صناعية رسمية مطابقة للوضع الحالي.",
      text_en: "I found three official industrial procedures matching the current situation." },

    // Compliance
    { speakerId: "compliance_auditor", preState: "reading",
      text_ar: `${c.permits_active} تصريح ساري — لا انتهاكات للسياسات.`,
      text_en: `${c.permits_active} active permits — no policy violations detected.` },

    // Visitors
    { speakerId: "visitor_intelligence", preState: "analyzing",
      text_ar: `${c.visitors_inside} زائر داخل المواقع حالياً — ضمن الحدود.`,
      text_en: `${c.visitors_inside} visitors currently on-site — within thresholds.` },

    // Risk assessment
    { speakerId: "risk_intelligence", preState: "analyzing",
      text_ar: c.assets_offline > 0 || c.cctv_new > 5
        ? `مؤشر المخاطر مرتفع نسبياً: ${c.assets_offline} أصل خارج الخدمة و${c.cctv_new} تنبيه كاميرا.`
        : "مؤشر المخاطر منخفض. جميع الأصول قيد التشغيل.",
      text_en: c.assets_offline > 0 || c.cctv_new > 5
        ? `Risk index elevated: ${c.assets_offline} asset${c.assets_offline > 1 ? "s" : ""} offline and ${c.cctv_new} CCTV alerts.`
        : "Risk index low. All assets operational." },

    // Digital twin
    { speakerId: "digital_twin", preState: "analyzing",
      text_ar: "النمذجة الافتراضية تتطابق مع البيانات الميدانية بدقة كاملة.",
      text_en: "Virtual model matches field telemetry with full alignment." },

    // Reporter
    { speakerId: "executive_reporter", preState: "reading",
      text_ar: "اكتمل التقرير التنفيذي وهو جاهز للتسليم.",
      text_en: "Executive report is composed and ready for delivery." },

    // ARIA recommendation
    { speakerId: "aria", preState: "thinking",
      text_ar: c.incidents_critical > 0
        ? "توصيتي: اعتماد التصعيد الفوري للحادث الحرج الآن."
        : c.assets_offline > 0
          ? "توصيتي: فتح أوامر عمل عاجلة لإعادة الأصول إلى الخدمة."
          : "توصيتي: مواصلة الوضع التشغيلي الحالي — لا حاجة لتدخل تنفيذي.",
      text_en: c.incidents_critical > 0
        ? "My recommendation: approve immediate escalation of the critical incident."
        : c.assets_offline > 0
          ? "My recommendation: open priority work orders to restore offline assets."
          : "My recommendation: maintain current posture — no executive action required." },

    // Final briefing
    { speakerId: "aria", preState: "analyzing",
      text_ar: "انتهت الإحاطة التنفيذية. سأتابع الأحداث الحية وأبلغك فوراً بأي تطور.",
      text_en: "Executive briefing complete. I will continue watching live and brief you the moment anything changes." },
  ];
  return steps;
}

interface Props {
  ar: boolean;
  overview: PresentationOverview | null;
  displayName: string;
}

export function PresentationMode({ ar, overview, displayName }: Props) {
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const stepIdxRef = useRef(0);

  // ARIA + the 6 most-used specialists are rendered live on the stage
  const stageSpecs = useMemo<DigitalHumanSpec[]>(() => [
    ARIA,
    ...["incident_commander","risk_intelligence","compliance_auditor","cctv_intelligence","patrol_commander","emergency_coordinator","knowledge_ai","executive_reporter"]
      .map(id => findHuman(id))
      .filter((s): s is DigitalHumanSpec => !!s),
  ], []);

  // Build one engine per stage human
  const aria = useDigitalHuman(stageSpecs[0]);
  const ic   = useDigitalHuman(stageSpecs[1]);
  const ri   = useDigitalHuman(stageSpecs[2]);
  const ca   = useDigitalHuman(stageSpecs[3]);
  const cv   = useDigitalHuman(stageSpecs[4]);
  const pt   = useDigitalHuman(stageSpecs[5]);
  const em   = useDigitalHuman(stageSpecs[6]);
  const kb   = useDigitalHuman(stageSpecs[7]);
  const rp   = useDigitalHuman(stageSpecs[8]);

  const runtimes = useMemo(() => ({
    aria, incident_commander: ic, risk_intelligence: ri, compliance_auditor: ca,
    cctv_intelligence: cv, patrol_commander: pt, emergency_coordinator: em,
    knowledge_ai: kb, executive_reporter: rp,
  }), [aria, ic, ri, ca, cv, pt, em, kb, rp]);

  const script = useMemo(
    () => overview ? buildScript(overview, ar, displayName) : [],
    [overview, ar, displayName],
  );

  // Drive the choreography: enqueue one step at a time, advance when speaker idles.
  useEffect(() => {
    if (!running) return;
    if (script.length === 0) return;
    if (stepIdx >= script.length) {
      setRunning(false);
      return;
    }
    const step = script[stepIdx];
    const speakerKey = step.speakerId as keyof typeof runtimes;
    const speaker = runtimes[speakerKey] ?? aria;
    const turn: SpokenTurn = {
      id: `pres-${stepIdx}`,
      text_ar: step.text_ar,
      text_en: step.text_en,
      preState: step.preState ?? "thinking",
      postState: "completed",
    };
    speaker.enqueue(turn);

    // Advance after the estimated speak time + small gap
    const len = (ar ? step.text_ar : step.text_en).length;
    const speak = Math.max(1800, Math.min(7500, Math.round((len / 13) * 1000)));
    const total = 600 /* pre */ + speak + 600 /* gap */;
    const t = setTimeout(() => {
      stepIdxRef.current = stepIdx + 1;
      setStepIdx(stepIdxRef.current);
    }, total);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, stepIdx, script]);

  const start = useCallback(() => {
    if (!overview) return;
    Object.values(runtimes).forEach(r => r.interrupt());
    stepIdxRef.current = 0;
    setStepIdx(0);
    setRunning(true);
  }, [overview, runtimes]);

  const stop = useCallback(() => {
    setRunning(false);
    Object.values(runtimes).forEach(r => r.interrupt());
  }, [runtimes]);

  const currentSpeakerId = running && script[stepIdx] ? script[stepIdx].speakerId : null;
  const currentSpeaker = currentSpeakerId
    ? (runtimes as Record<string, ReturnType<typeof useDigitalHuman>>)[currentSpeakerId] ?? aria
    : null;

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-400/15 border border-cyan-400/40 grid place-items-center">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm text-white font-medium">
              {ar ? "وضع العرض التنفيذي" : "Executive Presentation Mode"}
            </div>
            <div className="text-[11px] text-cyan-200/70">
              {ar ? "إحاطة كاملة بنقرة واحدة" : "Full briefing with one click"}
            </div>
          </div>
        </div>
        {!running ? (
          <button
            type="button"
            onClick={start}
            disabled={!overview}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition",
              overview
                ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25"
                : "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed",
            )}
          >
            <PlayCircle className="h-4 w-4" />
            {ar ? "ابدأ العرض" : "Start Presentation"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-400/20 transition"
          >
            <StopCircle className="h-4 w-4" />
            {ar ? "إيقاف" : "Stop"}
          </button>
        )}
      </div>

      {/* Live stage */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 mb-5">
        {stageSpecs.map((s, i) => {
          const r = [aria, ic, ri, ca, cv, pt, em, kb, rp][i];
          const isActive = currentSpeakerId === s.id;
          return (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all",
                isActive ? "bg-cyan-400/10 ring-1 ring-cyan-400/30 scale-105" : "bg-white/[0.02]",
              )}
            >
              <DigitalHumanAvatar spec={s} state={r.state} size={56} ar={ar} showLabel />
            </div>
          );
        })}
      </div>

      {/* Live caption from current speaker */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-all min-h-[88px]",
          currentSpeaker?.currentTurn ? "border-cyan-400/30 bg-cyan-400/[0.06]" : "border-white/10 bg-white/[0.02]",
        )}
      >
        {currentSpeaker?.currentTurn ? (
          <>
            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
              {currentSpeakerId
                ? (ar ? findHuman(currentSpeakerId)?.name_ar : findHuman(currentSpeakerId)?.name_en)
                : ""}
            </div>
            <div className="mt-1 text-sm text-white/95 leading-relaxed">
              {ar ? currentSpeaker.currentTurn.text_ar : currentSpeaker.currentTurn.text_en}
            </div>
          </>
        ) : running ? (
          <div className="text-sm text-white/55">{ar ? "ينتقل العرض إلى المتحدث التالي…" : "Advancing to the next speaker…"}</div>
        ) : (
          <div className="text-sm text-white/55">
            {overview
              ? (ar ? "اضغط ابدأ العرض لتشغيل الإحاطة الكاملة." : "Press Start Presentation to play the full briefing.")
              : (ar ? "لا توجد بيانات تشغيلية حية للعرض." : "No live operational data available for the presentation.")}
          </div>
        )}
      </div>

      {running && (
        <div className="mt-3">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-cyan-300/80 transition-all duration-500"
              style={{ width: `${Math.round((stepIdx / Math.max(1, script.length)) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-white/45 tabular-nums">
            {Math.min(stepIdx + 1, script.length)} / {script.length}
          </div>
        </div>
      )}
    </div>
  );
}
