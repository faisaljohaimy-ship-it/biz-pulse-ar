/**
 * AgentLineup — sequential reveal of the 11 Digital Humans inside the
 * "Executive Command Center" landing scene. Pure presentation: the
 * "ابدأ التشغيل" button activates each agent one after another with a
 * paced state machine (idle → thinking → speaking → completed), giving
 * the audience a clear feeling that every specialist boots in order.
 */
import { useEffect, useMemo, useState } from "react";
import { DIGITAL_HUMANS, type DigitalHumanState } from "@/lib/digital-humans/registry";
import { DigitalHumanAvatar } from "@/components/digital-humans/DigitalHumanAvatar";
import { Play, Square, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_MS = 900;

interface Props {
  isAr: boolean;
}

export function AgentLineup({ isAr }: Props) {
  const agents = DIGITAL_HUMANS;
  const [running, setRunning] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());

  // Auto-reveal on mount (visual order) — silent stagger so they appear drawn one by one.
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (revealed >= agents.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), 220);
    return () => clearTimeout(t);
  }, [revealed, agents.length]);

  // Sequential activation when running.
  useEffect(() => {
    if (!running) return;
    if (activeIdx >= agents.length) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => {
      if (activeIdx >= 0) {
        setDoneSet((s) => new Set(s).add(activeIdx));
      }
      setActiveIdx((i) => i + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [running, activeIdx, agents.length]);

  const start = () => {
    setDoneSet(new Set());
    setActiveIdx(0);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    setActiveIdx(-1);
    setDoneSet(new Set());
  };

  const progress = useMemo(() => {
    const total = agents.length;
    const done = doneSet.size + (running && activeIdx < total && activeIdx >= 0 ? 0.5 : 0);
    return Math.min(100, Math.round((done / total) * 100));
  }, [doneSet, activeIdx, running, agents.length]);

  const getState = (i: number): DigitalHumanState => {
    if (doneSet.has(i)) return "completed";
    if (running && i === activeIdx) return i === 0 ? "speaking" : "thinking";
    if (i >= revealed) return "idle";
    return "idle";
  };

  return (
    <div className="mx-auto mt-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", running ? "animate-ping bg-cyan-300" : "bg-white/40")} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", running ? "bg-cyan-300" : "bg-white/60")} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/85">
              {isAr ? "غرفة القيادة التنفيذية" : "Executive Command Center"}
            </div>
            <div className="text-[11px] text-white/55">
              {isAr
                ? `${agents.length} وكيل ذكاء صناعي · تشغيل تسلسلي`
                : `${agents.length} AI specialists · sequential boot`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 w-44">
            <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-white/60 w-8 text-right">{progress}%</span>
          </div>

          {!running ? (
            <button
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-100 hover:bg-cyan-400/25 transition"
            >
              <Play className="h-3 w-3" />
              {isAr ? "ابدأ التشغيل" : "Start Operation"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-400/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-100 hover:bg-rose-400/25 transition"
            >
              <Square className="h-3 w-3" />
              {isAr ? "إيقاف" : "Stop"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
        {agents.map((spec, i) => {
          const visible = i < revealed;
          const isActive = running && i === activeIdx;
          const isDone = doneSet.has(i);
          const state = getState(i);
          return (
            <div
              key={spec.id}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border p-2 transition-all duration-500",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                isActive
                  ? "border-cyan-300/60 bg-cyan-400/[0.08] shadow-[0_0_40px_-10px_rgba(0,212,255,0.6)] scale-[1.04]"
                  : isDone
                    ? "border-emerald-300/30 bg-emerald-400/[0.04]"
                    : "border-white/8 bg-white/[0.02]",
              )}
              style={{ transitionDelay: visible ? "0ms" : `${i * 60}ms` }}
            >
              <div className="relative">
                <DigitalHumanAvatar
                  spec={spec}
                  state={state}
                  size={68}
                  ambient={isActive}
                  ar={isAr}
                />
                <div className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-[#04060d]/90 text-[10px] font-bold text-white/80 tabular-nums">
                  {i + 1}
                </div>
                {isDone && (
                  <div className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[#04060d]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <div className="truncate text-[11px] font-semibold text-white/90">
                  {isAr ? spec.name_ar : spec.name_en}
                </div>
                <div
                  className="truncate text-[9px] uppercase tracking-[0.1em]"
                  style={{ color: spec.palette.accent }}
                >
                  {isAr ? spec.title_ar : spec.title_en}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
