/**
 * QuickModules — the console's in-panel quick-action row (poster's icon strip).
 * A curated subset of the canonical module registry so labels/icons/routes
 * never drift from the rest of the app. Every icon is living and links to a
 * REAL route.
 */
import { Link } from "@tanstack/react-router";
import { moduleByRoute } from "@/lib/nav/modules";

const QUICK_ROUTES = [
  "/analytics",
  "/agents",
  "/sec",
  "/mission-control",
  "/aria",
  "/governance",
] as const;

export function QuickModules({ ar, accent }: { ar: boolean; accent: string }) {
  const items = QUICK_ROUTES.map((to) => moduleByRoute(to)).filter(
    (m): m is NonNullable<typeof m> => Boolean(m),
  );

  return (
    <div className="nx-cmd-surface rounded-2xl p-3">
      <ul className="grid grid-cols-6 gap-1.5">
        {items.map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.to}>
              <Link
                to={m.to as "/"}
                aria-label={ar ? m.ar : m.en}
                title={ar ? m.ar : m.en}
                className="nx-sector-pulse group flex flex-col items-center gap-1 rounded-xl border border-white/8 p-1.5 text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc)]/60"
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-lg border"
                  style={{ borderColor: `${accent}44`, background: `${accent}12`, color: accent }}
                >
                  <Icon className="nx-icon-soft h-4 w-4" aria-hidden />
                </span>
                <span className="line-clamp-1 w-full text-[8px] leading-tight text-white/60">
                  {ar ? m.ar : m.en}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default QuickModules;
