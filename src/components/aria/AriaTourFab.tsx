/**
 * AriaTourFab — floating action button available on every page.
 * Single tap navigates to /aria/tour. Hidden while on the tour route
 * itself and while the intro overlay is active.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { useIntroActive } from "@/lib/intro-store";

export function AriaTourFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const introActive = useIntroActive();
  if (introActive) return null;
  if (pathname.startsWith("/aria/tour")) return null;

  return (
    <Link
      to="/aria/tour"
      aria-label="جولة مع آريا"
      title="جولة مع آريا"
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-cyan-400/40 bg-[#061A2E]/85 px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-[0_0_24px_rgba(0,212,255,0.35)] backdrop-blur-md transition hover:scale-[1.03] hover:border-cyan-300 hover:text-white active:scale-95"
    >
      <PlayCircle className="h-5 w-5 text-cyan-300" />
      <span className="hidden sm:inline">جولة مع آريا</span>
    </Link>
  );
}
