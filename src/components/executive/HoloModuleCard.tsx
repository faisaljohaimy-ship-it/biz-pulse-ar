/**
 * HoloModuleCard — THE single geometric model for every module tile
 * (strict modularity: the grid renders nothing but this component, so
 * adding a module tomorrow = one row in src/lib/nav/modules.ts).
 *
 * Visual layers come exclusively from the .holo-* system in styles.css
 * (constitution art. 13/15): gradient hairline + soft outer glow, hover
 * scanline + icon lift, one-shot staggered entrance, and a slow pulse
 * reserved for CRITICAL modules only. All motion is transform/opacity
 * and fully disabled under prefers-reduced-motion.
 */
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { moduleExternalUrl, type ModuleEntry } from "@/lib/nav/modules";

/** Functional distinction, not decoration: modules with live obligations. */
const CRITICAL_ROUTES = new Set(["/hcis", "/ptw", "/urgent-ops"]);

export function HoloModuleCard({
  module: m,
  index,
  ar,
  badge,
}: {
  module: ModuleEntry;
  index: number;
  ar: boolean;
  badge?: string | null;
}) {
  const Icon = m.icon;
  const label = ar ? m.ar : m.en;
  const externalUrl = moduleExternalUrl(m);
  const critical = CRITICAL_ROUTES.has(m.to);
  const tileClass = `holo-card holo-enter group flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.97]${critical ? " holo-critical" : ""}`;
  const style = { animationDelay: `${index * 60}ms` };

  const inner = (
    <>
      {badge && <span className="holo-badge">{badge}</span>}
      <span className="holo-icon nx-module-icon relative flex h-11 w-11 items-center justify-center rounded-xl">
        <Icon className="nx-icon-soft h-5 w-5" aria-hidden />
        {externalUrl && (
          <ExternalLink className="absolute -end-1 -top-1 h-3 w-3 text-[#3AE8FF]/80" aria-hidden />
        )}
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white/85">
        {label}
      </span>
    </>
  );

  if (externalUrl) {
    // External sister platform (Nusuk): a REAL anchor inside the user's
    // direct gesture — iOS-safe, no window.open in async.
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={ar ? "يُفتح في نافذة جديدة" : "Opens in a new tab"}
        style={style}
        className={tileClass}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link to={m.to as "/"} aria-label={label} style={style} className={tileClass}>
      {inner}
    </Link>
  );
}
