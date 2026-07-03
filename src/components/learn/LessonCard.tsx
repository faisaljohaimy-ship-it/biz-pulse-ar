/**
 * LessonCard — catalog card for a single lesson.
 * Uses semantic tokens sparingly; primary surface uses the ARIA HUD palette
 * (bg #04111F / cyan #00D4FF) to remain visually consistent with the platform.
 */
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Lock, PlayCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonListItem } from "@/lib/learn/types";

interface Props {
  lesson: LessonListItem;
  lang: "ar" | "en";
}

export function LessonCard({ lesson, lang }: Props) {
  const ar = lang === "ar";
  const title = ar ? lesson.title_ar : lesson.title_en;
  const subtitle = ar ? lesson.subtitle_ar : lesson.subtitle_en;
  const summary = ar ? lesson.summary_ar : lesson.summary_en;
  const completed = lesson.progress?.status === "completed";
  const inProgress = lesson.progress?.status === "in_progress";
  const durationMin = lesson.video_duration_seconds
    ? Math.max(1, Math.round(lesson.video_duration_seconds / 60))
    : null;

  const card = (
    <article
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 backdrop-blur transition-all",
        lesson.published
          ? "border-cyan-400/20 bg-gradient-to-br from-[#061A2E]/80 to-[#04111F]/80 hover:border-cyan-400/50 hover:shadow-[0_20px_60px_-20px_rgba(0,212,255,0.35)]"
          : "border-white/10 bg-white/[0.02] opacity-70",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -inset-32 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            {String(lesson.order_index).padStart(2, "0")} · {lesson.category}
          </span>
          {completed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> {ar ? "مكتملة" : "Completed"}
            </span>
          )}
          {inProgress && !completed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-200">
              <PlayCircle className="h-3 w-3" /> {ar ? "قيد التقدّم" : "In progress"}
            </span>
          )}
          {!lesson.published && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/50">
              <Lock className="h-3 w-3" /> {ar ? "قيد الإصدار" : "In production"}
            </span>
          )}
        </div>
        <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
        <p className="mt-1 text-sm text-cyan-100/80">{subtitle}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/70">{summary}</p>
      </div>

      <div className="relative mt-6 flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-3">
          {durationMin && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {durationMin} {ar ? "د" : "min"}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> ARIA
          </span>
        </div>
        {lesson.published ? (
          <span className="inline-flex items-center gap-1 text-cyan-200 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            {ar ? "افتح الحصة" : "Open lesson"} →
          </span>
        ) : (
          <span className="text-white/40">{ar ? "قريباً" : "Coming soon"}</span>
        )}
      </div>
    </article>
  );

  if (!lesson.published) return card;
  return (
    <Link to="/learn/$slug" params={{ slug: lesson.slug }} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-3xl">
      {card}
    </Link>
  );
}
