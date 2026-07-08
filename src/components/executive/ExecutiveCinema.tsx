import { useEffect, useMemo, useState } from "react";
import { Play, X, Film } from "lucide-react";

type Chapter = {
  id: string;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  duration: string;
  accent: string;
};

const CHAPTERS: Chapter[] = [
  {
    id: "vision",
    title_ar: "رؤية المنصة",
    title_en: "Platform Vision",
    desc_ar: "نظرة شاملة على فلسفة NEXIOS وتأثيرها التشغيلي.",
    duration: "02:10",
    accent: "from-[#00D4FF] to-[#3AE8FF]",
  },
  {
    id: "walkthrough",
    title_ar: "جولة تنفيذية",
    title_en: "Executive Walkthrough",
    desc_ar: "تجربة كاملة لمركز القيادة من منظور القيادة العليا.",
    duration: "04:30",
    accent: "from-[#3AE8FF] to-[#7CF9FF]",
  },
  {
    id: "aria",
    title_ar: "تعريف ARIA",
    title_en: "ARIA Introduction",
    desc_ar: "المحرك التنفيذي، الصوت، الذاكرة، والوكلاء.",
    duration: "03:15",
    accent: "from-[#5AC8FA] to-[#00D4FF]",
  },
  {
    id: "agents",
    title_ar: "وكلاء الذكاء",
    title_en: "AI Agents",
    desc_ar: "14 وكيلًا متخصصًا مع تنسيق أدوات وتحقق فيزيائي.",
    duration: "05:00",
    accent: "from-[#00D4FF] to-[#3AE8FF]",
  },
  {
    id: "security",
    title_ar: "الأمن الصناعي",
    title_en: "Industrial Security",
    desc_ar: "حوادث، دوريات، تصاريح، زوار ومركبات في منصة واحدة.",
    duration: "03:50",
    accent: "from-[#3AE8FF] to-[#7CF9FF]",
  },
  {
    id: "emergency",
    title_ar: "الاستجابة للطوارئ",
    title_en: "Emergency Response",
    desc_ar: "تدفقات استجابة آلية مع تتبع SLA ومسار قرار شفاف.",
    duration: "02:55",
    accent: "from-[#FFB347] to-[#FF6B6B]",
  },
  {
    id: "predict",
    title_ar: "الذكاء التنبؤي",
    title_en: "Predictive Intelligence",
    desc_ar: "نماذج المخاطر، مؤشرات قيادية، وتنبيهات مبكرة.",
    duration: "04:10",
    accent: "from-[#A78BFA] to-[#3AE8FF]",
  },
  {
    id: "twin",
    title_ar: "التوأم الرقمي",
    title_en: "Digital Twin",
    desc_ar: "تصوير حي للأصول والمواقع عبر نبض مؤسسي مستمر.",
    duration: "03:40",
    accent: "from-[#34D399] to-[#3AE8FF]",
  },
  {
    id: "dashboard",
    title_ar: "اللوحة التنفيذية",
    title_en: "Executive Dashboard",
    desc_ar: "مؤشرات أداء فورية، توصيات قرار، وتنفيذ بنقرة واحدة.",
    duration: "02:45",
    accent: "from-[#00D4FF] to-[#3AE8FF]",
  },
  {
    id: "architecture",
    title_ar: "البنية الهندسية",
    title_en: "Architecture",
    desc_ar: "بنية ميثاق v10، تعدد المستأجرين، RLS، وجداول التنفيذ.",
    duration: "06:20",
    accent: "from-[#94A3B8] to-[#3AE8FF]",
  },
  {
    id: "roadmap",
    title_ar: "خارطة الطريق",
    title_en: "Roadmap",
    desc_ar: "موجات الإصدار القادمة من نواة NEXIOS.",
    duration: "02:30",
    accent: "from-[#3AE8FF] to-[#00D4FF]",
  },
  {
    id: "success",
    title_ar: "قصص النجاح",
    title_en: "Customer Success",
    desc_ar: "نتائج تشغيلية ودراسات حالة مختارة.",
    duration: "03:05",
    accent: "from-[#FBBF24] to-[#3AE8FF]",
  },
];

const PROGRESS_KEY = "nexios.cinema.progress";

type ProgressMap = Record<string, number>; // 0..100

function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as ProgressMap;
  } catch {
    return {};
  }
}
function saveProgress(p: ProgressMap) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

export function ExecutiveCinema({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<Chapter | null>(null);
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (active) setActive(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, active, onClose]);

  // Simulated progress increment when a chapter is open (no real video file shipped)
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const next = { ...prev, [active.id]: Math.min(100, (prev[active.id] ?? 0) + 4) };
        saveProgress(next);
        return next;
      });
    }, 700);
    return () => window.clearInterval(id);
  }, [active]);

  const continueWatching = useMemo(
    () =>
      CHAPTERS.filter((c) => (progress[c.id] ?? 0) > 0 && (progress[c.id] ?? 0) < 100).slice(0, 3),
    [progress],
  );

  if (!open) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="Executive Experience Cinema"
      className="fixed inset-0 z-[90] flex flex-col bg-[#020A14]/95 text-white backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00D4FF]/15 text-[#3AE8FF] shadow-[0_0_24px_rgba(0,212,255,0.4)]">
            <Film className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70">
              Executive Experience
            </div>
            <h2 className="text-base font-semibold sm:text-lg">مركز التجربة التنفيذية</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Cinema"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:border-[#3AE8FF]/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
        {continueWatching.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/50">
              متابعة المشاهدة · Continue Watching
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {continueWatching.map((c) => (
                <ChapterCard
                  key={c.id}
                  chapter={c}
                  progress={progress[c.id] ?? 0}
                  onPlay={() => setActive(c)}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/50">
          جميع الفصول · All Chapters
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CHAPTERS.map((c) => (
            <ChapterCard
              key={c.id}
              chapter={c}
              progress={progress[c.id] ?? 0}
              onPlay={() => setActive(c)}
            />
          ))}
        </div>
      </div>

      {active && (
        <ChapterPlayer
          chapter={active}
          progress={progress[active.id] ?? 0}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function ChapterCard({
  chapter,
  progress,
  onPlay,
  compact = false,
}: {
  chapter: Chapter;
  progress: number;
  onPlay: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-[#3AE8FF]/50 hover:shadow-[0_12px_40px_rgba(0,212,255,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${chapter.accent} opacity-[0.08] transition group-hover:opacity-[0.18]`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            {chapter.title_en}
          </div>
          <div className={`mt-1 truncate font-semibold ${compact ? "text-sm" : "text-base"}`}>
            {chapter.title_ar}
          </div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#00D4FF]/20 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.45)] transition group-hover:scale-110">
          <Play className="h-4 w-4 translate-x-[1px]" />
        </span>
      </div>
      {!compact && (
        <p className="relative mt-3 line-clamp-2 text-xs leading-relaxed text-white/60">
          {chapter.desc_ar}
        </p>
      )}
      <div className="relative mt-4 flex items-center justify-between text-[10px] text-white/45">
        <span className="font-mono">{chapter.duration}</span>
        <span>
          {progress >= 100 ? "✓ مكتمل" : progress > 0 ? `${Math.round(progress)}%` : "جديد"}
        </span>
      </div>
      <div className="relative mt-2 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#00D4FF] to-[#3AE8FF]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

function ChapterPlayer({
  chapter,
  progress,
  onClose,
}: {
  chapter: Chapter;
  progress: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#020A14] shadow-[0_30px_80px_rgba(0,212,255,0.25)]">
        <div
          className={`relative aspect-video w-full overflow-hidden bg-gradient-to-br ${chapter.accent}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(255,255,255,0.25),transparent_70%)]" />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/80">
                NEXIOS · {chapter.title_en}
              </div>
              <div className="mt-3 text-3xl font-semibold text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-5xl">
                {chapter.title_ar}
              </div>
              <div className="mt-4 font-mono text-xs text-white/70">{chapter.duration}</div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15">
            <div className="h-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <p className="text-sm text-white/70">{chapter.desc_ar}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/80 transition hover:border-[#3AE8FF]/60 hover:text-white"
          >
            إغلاق · ESC
          </button>
        </div>
      </div>
    </div>
  );
}
