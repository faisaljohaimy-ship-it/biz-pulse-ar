/**
 * AgentRoster — visual grid of all specialist Digital Humans.
 * Each card carries a live state machine driven by the engine and a
 * confidence reading derived from real overview data. Idle agents stay
 * calm; agents related to live conditions pulse "analyzing" or
 * "speaking" to convey activity.
 */
import { useEffect, useMemo } from "react";
import { SPECIALISTS, type DigitalHumanSpec } from "@/lib/digital-humans/registry";
import { useDigitalHuman } from "@/lib/digital-humans/engine";
import { DigitalHumanAvatar } from "./DigitalHumanAvatar";
import { cn } from "@/lib/utils";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { probeEvidence } from "@/lib/evidence/gate";

export type RosterSignal = {
  id: string; // digital human id
  state:
    | "analyzing"
    | "speaking"
    | "completed"
    | "waiting"
    | "idle"
    | "searching"
    | "reading"
    | "thinking";
  text_ar?: string;
  text_en?: string;
  confidence?: number; // 0-1
};

interface Props {
  ar: boolean;
  signals: RosterSignal[];
}

function AgentCard({
  spec,
  signal,
  ar,
}: {
  spec: DigitalHumanSpec;
  signal?: RosterSignal;
  ar: boolean;
}) {
  const dh = useDigitalHuman(spec);

  useEffect(() => {
    if (!signal) return;
    if (typeof signal.confidence === "number") dh.pushConfidence(signal.confidence);

    if (signal.state === "speaking" && (signal.text_ar || signal.text_en)) {
      dh.enqueue({
        id: `sig-${spec.id}-${Date.now()}`,
        text_ar: signal.text_ar ?? "",
        text_en: signal.text_en ?? "",
        preState: "analyzing",
        postState: "completed",
      });
    } else {
      dh.setState(signal.state);
    }
    // intentionally only re-run when signal identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal?.state, signal?.text_ar, signal?.text_en, signal?.confidence]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 transition-all",
        "hover:border-cyan-400/30 hover:bg-white/[0.05]",
        dh.state === "speaking" && "ring-1 ring-cyan-400/30",
      )}
    >
      <div className="flex items-center gap-3">
        <DigitalHumanAvatar spec={spec} state={dh.state} size={64} ar={ar} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white truncate">{ar ? spec.name_ar : spec.name_en}</div>
          <div className="text-[11px] text-white/55 truncate">
            {ar ? spec.title_ar : spec.title_en}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
              {ar ? "ثقة" : "Confidence"}
            </span>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.round(dh.confidence * 100)}%`,
                  background: spec.palette.accent,
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-white/70">
              {Math.round(dh.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>
      {dh.currentTurn && (
        <div className="mt-3 text-[12px] text-white/85 leading-relaxed line-clamp-3">
          {ar ? dh.currentTurn.text_ar : dh.currentTurn.text_en}
        </div>
      )}
    </div>
  );
}

export function AgentRoster({ ar, signals }: Props) {
  const map = useMemo(() => {
    const m = new Map<string, RosterSignal>();
    signals.forEach((s) => m.set(s.id, s));
    return m;
  }, [signals]);

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-white font-medium">
            {ar ? "كادر الذكاء التنفيذي" : "Executive AI Roster"}
          </div>
          <div className="text-[11px] text-cyan-200/70">
            {ar
              ? `${SPECIALISTS.length} وكيل ذكاء صناعي متخصص — حالة حية`
              : `${SPECIALISTS.length} specialist digital humans — live state`}
          </div>
        </div>
        <EvidenceBadge
          evidence={
            signals.length > 0
              ? probeEvidence("digital_humans.roster_signals", signals.length)
              : null
          }
          label={ar ? "البث مباشر" : "Live"}
          tone="emerald"
          className="hidden sm:inline-flex"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {SPECIALISTS.map((spec) => (
          <AgentCard key={spec.id} spec={spec} signal={map.get(spec.id)} ar={ar} />
        ))}
      </div>
    </div>
  );
}
