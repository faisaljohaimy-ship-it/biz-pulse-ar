/**
 * ExecutivePresentationPlayer — the guided executive presentation on the
 * demo page. ARIA's narrator video (public/aria/aria-narrator.mp4)
 * plays on the LEFT in a dark #04111f frame, full face visible; on the
 * RIGHT a window-preview pane switches automatically in sync with the
 * narration cues, ending on a closing screen.
 *
 * Cues (seconds): 0 home · 6 dashboard · 18 industrial security & the four
 * regions · 26 agents · 33 digital twin & reports · 40 finale.
 *
 * Rules: audio starts ONLY after the first user interaction (the start
 * button); full RTL; responsive mobile + laptop; clean stop on exit
 * (pause + release on unmount). While playing it owns the AriaAudioBus
 * "hero-soundtrack" channel so any ARIA chat voice preempts it instantly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  FileText,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { REGIONS } from "@/lib/regions";

const VIDEO_SRC = "/aria/aria-narrator.mp4";

type CueId = "home" | "dashboard" | "sec" | "agents" | "twin" | "finale";

interface Cue {
  at: number;
  id: CueId;
  label: string;
  icon: typeof Home;
}

const CUES: readonly Cue[] = [
  { at: 0, id: "home", label: "الرئيسية", icon: Home },
  { at: 6, id: "dashboard", label: "لوحة القيادة", icon: BarChart3 },
  { at: 18, id: "sec", label: "الأمن الصناعي", icon: Shield },
  { at: 26, id: "agents", label: "الوكلاء", icon: Bot },
  { at: 33, id: "twin", label: "التوأم الرقمي والتقارير", icon: Boxes },
  { at: 40, id: "finale", label: "الختام", icon: Sparkles },
];

function cueIndexAt(t: number): number {
  let idx = 0;
  for (let i = 0; i < CUES.length; i++) if (t >= CUES[i].at) idx = i;
  return idx;
}

/* ── Window-preview mockups (pure presentational, RTL) ─────────────────── */

function PreviewWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#050d1a]/90">
      {/* Window title bar */}
      <div className="flex items-center justify-between border-b border-cyan-400/15 bg-[#071426] px-4 py-2.5">
        <span className="text-xs font-semibold text-cyan-100">{title}</span>
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <i className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden p-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "up" | "warn" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="text-[10px] text-white/55">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-base font-bold tabular-nums",
          tone === "up" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-white",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Bars({ heights }: { heights: number[] }) {
  return (
    <div className="flex h-16 items-end gap-1.5" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-full rounded-t bg-gradient-to-t from-cyan-500/50 to-cyan-300/90"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function HomePreview() {
  return (
    <PreviewWindow title="NEXIOS · المنصة الرئيسية">
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/40">
          <Sparkles className="h-6 w-6 text-cyan-300" />
        </div>
        <div className="text-lg font-bold text-white">منصة إنجاز الأعمال التنفيذية</div>
        <div className="max-w-xs text-xs leading-relaxed text-white/60">
          نظام تشغيل تنفيذي واحد: أمن صناعي، وكلاء أذكياء، توأم رقمي، وتقارير قيادية — بذاكرة واحدة
          وصوت واحد.
        </div>
        <div className="mt-1 flex gap-2">
          {["أمن", "وكلاء", "تقارير"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] text-cyan-200"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </PreviewWindow>
  );
}

function DashboardPreview() {
  return (
    <PreviewWindow title="لوحة القيادة التنفيذية">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="الجاهزية التشغيلية" value="98.2%" tone="up" />
        <StatTile label="مهام اليوم" value="47" />
        <StatTile label="تنبيهات نشطة" value="3" tone="warn" />
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] text-white/55">
          <span>الأداء الأسبوعي</span>
          <Activity className="h-3.5 w-3.5 text-cyan-300" />
        </div>
        <Bars heights={[42, 58, 50, 72, 64, 85, 78]} />
      </div>
    </PreviewWindow>
  );
}

function SecPreview() {
  return (
    <PreviewWindow title="الأمن الصناعي · الإدارات الإقليمية">
      <div className="grid grid-cols-2 gap-2">
        {REGIONS.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
          >
            <Shield className="h-4 w-4 shrink-0 text-cyan-300" />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-white">{r.shortAr}</div>
              <div className="text-[9px] text-emerald-300">تعمل · مباشر</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile label="دوائر" value="24" />
        <StatTile label="دوريات نشطة" value="61" tone="up" />
        <StatTile label="بلاغات مفتوحة" value="2" tone="warn" />
      </div>
    </PreviewWindow>
  );
}

function AgentsPreview() {
  const agents = [
    { name: "وكيل المخاطر", status: "يحلّل" },
    { name: "وكيل الدوريات", status: "ميداني" },
    { name: "وكيل الامتثال", status: "يراجع" },
    { name: "وكيل التقارير", status: "يُعِدّ" },
  ];
  return (
    <PreviewWindow title="الوكلاء الأذكياء">
      <div className="grid grid-cols-2 gap-2">
        {agents.map((a) => (
          <div
            key={a.name}
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 ring-1 ring-cyan-300/30">
              <Bot className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-white">{a.name}</div>
              <div className="flex items-center gap-1 text-[9px] text-emerald-300">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {a.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PreviewWindow>
  );
}

function TwinPreview() {
  return (
    <PreviewWindow title="التوأم الرقمي · التقارير التنفيذية">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-white/55">
            <Boxes className="h-3.5 w-3.5 text-cyan-300" />
            التوأم الرقمي
          </div>
          <div className="grid grid-cols-3 gap-1.5" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span
                key={i}
                className={cn("h-6 rounded", i % 4 === 0 ? "bg-cyan-400/40" : "bg-cyan-400/15")}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-white/55">
            <FileText className="h-3.5 w-3.5 text-cyan-300" />
            تقارير القيادة
          </div>
          <div className="space-y-1.5">
            {["الموجز الصباحي", "تقرير المخاطر", "أداء القطاعات"].map((r) => (
              <div
                key={r}
                className="rounded-lg bg-white/[0.05] px-2 py-1.5 text-[10px] text-white/75"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PreviewWindow>
  );
}

function FinaleScreen({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-cyan-400/25 bg-[radial-gradient(80%_70%_at_50%_30%,rgba(0,212,255,0.14),transparent_70%)] bg-[#050d1a] p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/40">
        <Sparkles className="h-7 w-7 text-cyan-300" />
      </div>
      <div>
        <div className="text-xl font-bold text-white">نهاية العرض التنفيذي</div>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/60">
          شاهدت المنصة الرئيسية، لوحة القيادة، الأمن الصناعي بقطاعاته الأربعة، الوكلاء الأذكياء،
          والتوأم الرقمي والتقارير. جاهز للخطوة التالية؟
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/request-demo"
          className="rounded-full bg-cyan-400/90 px-5 py-2 text-xs font-bold text-[#04111f] transition hover:bg-cyan-300"
        >
          اطلب عرضاً خاصاً
        </Link>
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          إعادة العرض
        </button>
      </div>
    </div>
  );
}

const PREVIEWS: Record<Exclude<CueId, "finale">, () => React.JSX.Element> = {
  home: HomePreview,
  dashboard: DashboardPreview,
  sec: SecPreview,
  agents: AgentsPreview,
  twin: TwinPreview,
};

/* ── Player ────────────────────────────────────────────────────────────── */

export function ExecutivePresentationPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "paused" | "done">("idle");
  const [cueIdx, setCueIdx] = useState(0);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopPlayback = useCallback((nextPhase: "paused" | "done" | "idle") => {
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    }
    AriaAudioBus.release("hero-soundtrack");
    setPhase(nextPhase);
  }, []);

  // Start / resume — always inside a user gesture, so sound is allowed.
  const start = useCallback((fromBeginning: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("hero-soundtrack", () => {
      // Preempted by ARIA's chat voice — pause cleanly.
      const el = videoRef.current;
      if (el) {
        try {
          el.pause();
        } catch {
          /* ignore */
        }
      }
      if (phaseRef.current === "playing") setPhase("paused");
    });
    if (!granted) return;
    if (fromBeginning) {
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
      setCueIdx(0);
    }
    v.muted = false;
    v.volume = 1;
    v.play()
      .then(() => setPhase("playing"))
      .catch(() => {
        AriaAudioBus.release("hero-soundtrack");
        setPhase("idle");
      });
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const idx = cueIndexAt(v.currentTime);
    setCueIdx((prev) => (prev === idx ? prev : idx));
  }, []);

  const onEnded = useCallback(() => {
    setCueIdx(CUES.length - 1);
    stopPlayback("done");
  }, [stopPlayback]);

  // Clean stop on exit: pause + release the audio channel on unmount.
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (v) {
        try {
          v.pause();
        } catch {
          /* ignore */
        }
      }
      AriaAudioBus.release("hero-soundtrack");
    };
  }, []);

  const activeCue = CUES[cueIdx];
  const showFinale = phase === "done" || activeCue.id === "finale";
  const ActivePreview = showFinale ? null : PREVIEWS[activeCue.id as Exclude<CueId, "finale">];

  return (
    <section
      dir="rtl"
      aria-label="العرض التنفيذي الموجّه"
      className="rounded-3xl border border-cyan-400/20 bg-[#04111f] p-3 shadow-[0_20px_60px_-20px_rgba(0,212,255,0.25)] md:p-4"
    >
      {/* Cue timeline */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 px-1">
        {CUES.map((c, i) => (
          <span
            key={c.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-all",
              i === cueIdx && (phase === "playing" || phase === "paused" || phase === "done")
                ? "border-cyan-300/70 bg-cyan-400/15 font-semibold text-cyan-100"
                : "border-white/10 text-white/45",
            )}
          >
            <c.icon className="h-3 w-3" aria-hidden />
            {c.label}
          </span>
        ))}
      </div>

      {/* LTR grid so the video is physically LEFT and the preview RIGHT on
          every locale; inner content is RTL. Mobile stacks: video then preview. */}
      <div dir="ltr" className="grid gap-3 md:grid-cols-[minmax(220px,300px)_1fr]">
        {/* LEFT — ARIA narrator video, full face, dark #04111f frame */}
        <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl bg-[#04111f] ring-1 ring-cyan-400/25 md:mx-0 md:max-w-none">
          <div className="aspect-[9/16] max-h-[62vh] w-full">
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              playsInline
              preload="metadata"
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              className="h-full w-full object-cover object-top"
            />
          </div>

          {/* Start / resume overlay — sound begins only from this gesture. */}
          {phase !== "playing" && (
            <button
              type="button"
              onClick={() => start(phase === "idle" || phase === "done")}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#04111f]/70 backdrop-blur-[2px] transition hover:bg-[#04111f]/60"
              aria-label={phase === "paused" ? "متابعة العرض" : "ابدأ العرض التنفيذي"}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/90 text-[#04111f] shadow-[0_0_40px_rgba(0,212,255,0.6)]">
                {phase === "paused" ? (
                  <Play className="h-7 w-7 translate-x-0.5" />
                ) : (
                  <Play className="h-7 w-7 translate-x-0.5" />
                )}
              </span>
              <span dir="rtl" className="text-sm font-bold text-white">
                {phase === "paused" ? "متابعة العرض" : "ابدأ العرض التنفيذي"}
              </span>
              <span dir="rtl" className="text-[10px] text-cyan-200/80">
                آريا ترافقك صوتياً خلال جولة المنصة
              </span>
            </button>
          )}

          {/* Pause control while playing */}
          {phase === "playing" && (
            <button
              type="button"
              onClick={() => stopPlayback("paused")}
              aria-label="إيقاف مؤقت"
              className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-black/70 sm:h-9 sm:w-9"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* RIGHT — auto-switching window preview / finale */}
        <div dir="rtl" className="min-h-[280px] md:min-h-[360px]">
          {showFinale ? (
            <FinaleScreen onReplay={() => start(true)} />
          ) : (
            <div
              key={activeCue.id}
              className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              {ActivePreview && <ActivePreview />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ExecutivePresentationPlayer;
