/**
 * CommandCenterLinks — cross-links from a lesson into live executive
 * surfaces (digital twin, command center, executive dashboard, etc.).
 * Uses TanStack `<Link>` so preloading and type-safe routing apply.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { CockpitLink } from "@/lib/learn/cockpit-content";

interface Props {
  links: CockpitLink[];
  lang: "ar" | "en";
}

export function CommandCenterLinks({ links, lang }: Props) {
  const ar = lang === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          preload="intent"
          className="group relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.06] to-transparent p-4 transition-colors hover:border-cyan-300/60 hover:from-cyan-400/[0.12]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {ar ? l.label_ar : l.label_en}
              </div>
              <div className="mt-1 text-xs text-white/60">{ar ? l.hint_ar : l.hint_en}</div>
            </div>
            <Arrow className="mt-1 h-4 w-4 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-0.5 group-hover:rtl:-translate-x-0.5" />
          </div>
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          />
        </Link>
      ))}
    </div>
  );
}
