/**
 * LessonNav — previous/next lesson navigation.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  lang: "ar" | "en";
  prev_slug: string | null;
  next_slug: string | null;
}

export function LessonNav({ lang, prev_slug, next_slug }: Props) {
  const ar = lang === "ar";
  // In RTL, "previous" arrow points right, "next" points left.
  const PrevIcon = ar ? ArrowRight : ArrowLeft;
  const NextIcon = ar ? ArrowLeft : ArrowRight;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3">
      {prev_slug ? (
        <Link
          to="/learn/$slug"
          params={{ slug: prev_slug }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.02] px-4 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
        >
          <PrevIcon className="h-4 w-4" />
          {ar ? "الحصة السابقة" : "Previous lesson"}
        </Link>
      ) : (
        <span />
      )}
      {next_slug ? (
        <Link
          to="/learn/$slug"
          params={{ slug: next_slug }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-[#04111F] transition-transform hover:scale-[1.02]"
        >
          {ar ? "الحصة التالية" : "Next lesson"}
          <NextIcon className="h-4 w-4" />
        </Link>
      ) : (
        <Link
          to="/learn"
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-100 transition-colors hover:bg-cyan-400/20"
        >
          {ar ? "العودة إلى الفهرس" : "Back to catalog"}
        </Link>
      )}
    </nav>
  );
}
