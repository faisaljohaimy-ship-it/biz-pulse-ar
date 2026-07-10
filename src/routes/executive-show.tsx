// /executive-show — Executive Show player.
// Left: ARIA narrator video (public/aria/aria-narrator.mp4), full face, RTL.
// Right: window preview that auto-switches per cues, driven by video
// `timeupdate`. When the video ends, a closing screen replaces the preview.
// Audio starts only after the first user interaction (browser autoplay policy).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  LayoutDashboard,
  MapPin,
  Bot,
  Radar,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/executive-show")({
  head: () => ({
    meta: [
      { title: "مشغّل العرض التنفيذي — نيكسيوس · Executive Show" },
      {
        name: "description",
        content: "مشغّل عرض تنفيذي: رواية آريا مع معاينة نوافذ النظام تتغيّر تلقائيًا.",
      },
      { name: "robots", content: "noindex" },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#04111f" },
    ],
  }),
  component: ExecutiveShowPage,
});

type CueId = "home" | "command" | "sec-regions" | "agents" | "twin-reports" | "closing";

type Cue = {
  id: CueId;
  at: number; // seconds
  ar: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // hex
  render: () => React.ReactNode;
};

const NAVY = "#04111f";
const CYAN = "#3AE8FF";
const EMERALD = "#34D399";

const CUES: Cue[] = [
  {
    id: "home",
    at: 0,
    ar: "الواجهة الرئيسية",
    en: "Home",
    icon: Home,
    accent: CYAN,
    render: () => <PreviewHome />,
  },
  {
    id: "command",
    at: 6,
    ar: "غرفة القيادة",
    en: "Command Center",
    icon: LayoutDashboard,
    accent: CYAN,
    render: () => <PreviewCommand />,
  },
  {
    id: "sec-regions",
    at: 18,
    ar: "القطاعات الأربعة",
    en: "Sec · Regions",
    icon: MapPin,
    accent: EMERALD,
    render: () => <PreviewRegions />,
  },
  {
    id: "agents",
    at: 26,
    ar: "وكلاء آريا",
    en: "ARIA Agents",
    icon: Bot,
    accent: CYAN,
    render: () => <PreviewAgents />,
  },
  {
    id: "twin-reports",
    at: 33,
    ar: "التوأم والتقارير",
    en: "Twin · Reports",
    icon: Radar,
    accent: EMERALD,
    render: () => <PreviewTwin />,
  },
  {
    id: "closing",
    at: 40,
    ar: "الختام",
    en: "Closing",
    icon: Sparkles,
    accent: CYAN,
    render: () => <ClosingScreen />,
  },
];

function ExecutiveShowPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1

  // Advance active cue from video timeupdate.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const t = v.currentTime;
      let idx = 0;
      for (let i = 0; i < CUES.length; i++) if (t >= CUES[i].at) idx = i;
      setCurrentIdx(idx);
      if (v.duration > 0) setProgress(Math.min(1, t / v.duration));
    };
    const onEnded = () => setEnded(true);
    const onPlay = () => setEnded(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("play", onPlay);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("play", onPlay);
    };
  }, []);

  async function startPlayback() {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      setMuted(false);
      await v.play();
    } catch {
      // Fallback: keep muted (some browsers still block); user can unmute.
      v.muted = true;
      setMuted(true);
      try {
        await v.play();
      } catch {
        /* noop */
      }
    }
    setStarted(true);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  }

  function jumpTo(idx: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = CUES[idx].at + 0.05;
    setEnded(false);
    if (!started) {
      void startPlayback();
    }
  }

  function restart() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    void v.play();
  }

  const activeCue = CUES[currentIdx];

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] text-slate-100"
      style={{
        background: `radial-gradient(1200px 800px at 80% -10%, rgba(58,232,255,0.08), transparent 60%), radial-gradient(1000px 700px at -10% 110%, rgba(52,211,153,0.07), transparent 60%), ${NAVY}`,
      }}
    >
      <header className="mx-auto flex max-w-[1600px] items-center justify-between px-4 pt-4 pb-2 md:px-6">
        <div className="flex items-center gap-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10"
            aria-hidden
          >
            <Sparkles className="h-4 w-4 text-emerald-300" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-emerald-200">
              مشغّل العرض التنفيذي
            </div>
            <div className="truncate text-[11px] text-slate-400">
              رواية آريا · معاينة النوافذ التلقائية
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold text-amber-200">
            محاكاة · لقطة عامة
          </span>
          <Link
            to="/"
            className="rounded-lg border border-slate-500/30 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            الرئيسية
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1600px] gap-4 px-4 pb-6 md:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        {/* LEFT — ARIA narrator */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-black/60 shadow-[0_20px_60px_-20px_rgba(58,232,255,0.35)]">
          <div className="relative aspect-[9/16] max-h-[78dvh] w-full sm:aspect-[4/5] lg:aspect-[9/12]">
            <video
              ref={videoRef}
              src="/aria/aria-narrator.mp4"
              className="absolute inset-0 h-full w-full object-cover"
              // object-cover keeps the face full-frame across aspect ratios
              playsInline
              muted
              preload="metadata"
              poster=""
              aria-label="آريا · الراوية التنفيذية"
            />
            {/* Bottom gradient for legibility */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
              style={{
                background:
                  "linear-gradient(to top, rgba(4,17,31,0.9), rgba(4,17,31,0) 100%)",
              }}
            />
            {/* Chapter label */}
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] backdrop-blur">
              <activeCue.icon className="h-3.5 w-3.5" style={{ color: activeCue.accent }} />
              <span className="font-semibold" style={{ color: activeCue.accent }}>
                {activeCue.ar}
              </span>
            </div>
            {/* Mute / restart controls (visible after start) */}
            {started && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/60 text-slate-100 backdrop-blur hover:bg-black/80"
                  aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/60 text-slate-100 backdrop-blur hover:bg-black/80"
                  aria-label="إعادة التشغيل"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            )}
            {/* Start overlay — required for audio autoplay policies */}
            {!started && (
              <button
                type="button"
                onClick={startPlayback}
                className="absolute inset-0 grid place-items-center bg-slate-950/55 backdrop-blur-sm"
                aria-label="ابدأ العرض التنفيذي"
              >
                <span className="flex flex-col items-center gap-3">
                  <span
                    className="grid h-20 w-20 place-items-center rounded-full border-2 shadow-[0_0_40px_rgba(58,232,255,0.6)]"
                    style={{
                      borderColor: CYAN,
                      background: "rgba(58,232,255,0.12)",
                    }}
                  >
                    <Play className="h-8 w-8 fill-current" style={{ color: CYAN }} />
                  </span>
                  <span className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-100">
                    اضغط للبدء · مع الصوت
                  </span>
                </span>
              </button>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-1 w-full bg-white/5">
            <div
              className="h-full transition-[width] duration-200"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${CYAN}, ${EMERALD})`,
              }}
            />
          </div>
        </div>

        {/* RIGHT — window preview */}
        <div className="flex flex-col gap-3">
          <WindowFrame title={`${activeCue.ar} · ${activeCue.en}`}>
            {ended ? <ClosingScreen /> : activeCue.render()}
          </WindowFrame>

          {/* Chapter chips */}
          <nav
            className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1"
            aria-label="فصول العرض"
          >
            {CUES.map((c, i) => {
              const active = !ended && i === currentIdx;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={`group flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition ${
                    active
                      ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-100"
                      : "border-slate-600/40 bg-slate-800/40 text-slate-300 hover:bg-slate-800/70"
                  }`}
                >
                  <c.icon
                    className="h-3.5 w-3.5"
                    style={{ color: active ? c.accent : "#94A3B8" }}
                  />
                  <span className="font-semibold">{c.ar}</span>
                  <span className="opacity-60">{fmt(c.at)}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </section>
    </main>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function WindowFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-500/30 bg-slate-900/60 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/70 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="truncate text-[11px] font-semibold text-slate-300">{title}</div>
        <div className="w-9" aria-hidden />
      </div>
      <div key={title} className="animate-in fade-in-50 zoom-in-95 duration-300">
        <div className="min-h-[420px] p-4 sm:p-5 md:min-h-[520px]">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Preview panels ---------------- */

function Stat({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-200",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200",
    amber: "border-amber-300/25 bg-amber-300/[0.06] text-amber-200",
    rose: "border-rose-400/25 bg-rose-400/[0.06] text-rose-200",
  };
  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold opacity-75">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight text-slate-50">{value}</div>
    </div>
  );
}

function PreviewHome() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
        <div className="text-[11px] font-semibold text-emerald-300">NEXIOS · OS</div>
        <div className="mt-1 text-xl font-black">لوحة القيادة السيادية · نبض المؤسسة</div>
        <div className="mt-1 text-[12px] text-slate-400">
          نظرة عامة موحّدة على الأمن، العمليات، والتوأم الرقمي.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="القطاعات" value="4" tone="emerald" />
        <Stat label="المواقع" value="128" tone="cyan" />
        <Stat label="الوكلاء" value="17" tone="cyan" />
        <Stat label="مؤشر الجاهزية" value="94" tone="emerald" />
      </div>
    </div>
  );
}

function PreviewCommand() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat label="الحوادث الحرجة" value="03" tone="rose" />
        <Stat label="الحوادث المفتوحة" value="12" tone="amber" />
        <Stat label="الدوريات النشطة" value="27" tone="emerald" />
        <Stat label="تنبيهات الكاميرات" value="09" tone="amber" />
        <Stat label="الزوّار" value="418" tone="cyan" />
        <Stat label="التصاريح" value="61" tone="emerald" />
      </div>
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-3 text-[12px] text-cyan-100">
        الغرفة التنفيذية تربط الأمن، السلامة، والصيانة في تدفّق قرارات واحد.
      </div>
    </div>
  );
}

function PreviewRegions() {
  const regions = [
    { ar: "الوسطى", incidents: 3, patrols: 8 },
    { ar: "الغربية", incidents: 5, patrols: 11 },
    { ar: "الشرقية", incidents: 2, patrols: 9 },
    { ar: "الجنوبية", incidents: 4, patrols: 6 },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-300">
        <MapPin className="h-4 w-4" />
        <div className="text-sm font-semibold">القطاعات الأربعة · المملكة العربية السعودية</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {regions.map((r) => (
          <div
            key={r.ar}
            className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-emerald-100">المنطقة {r.ar}</div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <div className="opacity-70">حوادث</div>
                <div className="text-lg font-black text-slate-50">
                  {String(r.incidents).padStart(2, "0")}
                </div>
              </div>
              <div>
                <div className="opacity-70">دوريات</div>
                <div className="text-lg font-black text-slate-50">
                  {String(r.patrols).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewAgents() {
  const agents = [
    { ar: "آريا التنفيذي", role: "قرارات القيادة", status: "نشط" },
    { ar: "وكيل الأمن الصناعي", role: "حوادث وتنبيهات", status: "نشط" },
    { ar: "وكيل الصيانة", role: "أوامر عمل", status: "نشط" },
    { ar: "وكيل التقارير", role: "توليد ذكي", status: "استعداد" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300">
        <Bot className="h-4 w-4" />
        <div className="text-sm font-semibold">شبكة وكلاء آريا متعدّدة الأنماط</div>
      </div>
      <ul className="space-y-2">
        {agents.map((a) => (
          <li
            key={a.ar}
            className="flex items-center justify-between gap-2 rounded-2xl border border-slate-500/30 bg-slate-800/50 p-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-100">{a.ar}</div>
              <div className="truncate text-[11px] text-slate-400">{a.role}</div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                a.status === "نشط"
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-300/40 bg-amber-300/10 text-amber-200"
              }`}
            >
              {a.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewTwin() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-300">
        <Radar className="h-4 w-4" />
        <div className="text-sm font-semibold">التوأم الرقمي · التقارير التنفيذية</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="نماذج نشطة" value="09" tone="emerald" />
        <Stat label="محاكاة/يوم" value="146" tone="cyan" />
        <Stat label="تقارير تلقائية" value="38" tone="cyan" />
        <Stat label="دقّة التنبؤ" value="92%" tone="emerald" />
      </div>
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-[12px] text-emerald-100">
        التوأم الرقمي يحاكي القرارات قبل تنفيذها، ويصدر تقارير PDF/Excel تلقائياً.
      </div>
    </div>
  );
}

function ClosingScreen() {
  return (
    <div className="grid min-h-[380px] place-items-center py-6 text-center md:min-h-[460px]">
      <div className="max-w-md space-y-4">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border shadow-[0_0_40px_rgba(52,211,153,0.35)]"
          style={{ borderColor: EMERALD, background: "rgba(52,211,153,0.08)" }}
        >
          <Sparkles className="h-7 w-7" style={{ color: EMERALD }} />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-black text-slate-50">شكراً لمشاهدتك</div>
          <div className="text-sm text-slate-400">
            نيكسيوس · نظام تشغيل المؤسسة المدعوم بذكاء آريا التنفيذي.
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Link
            to="/os"
            className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25"
          >
            دخول لوحة NEXUS OS
          </Link>
          <Link
            to="/executive-briefing"
            className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20"
          >
            الإحاطة التنفيذية
          </Link>
        </div>
      </div>
    </div>
  );
}
