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
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { moduleExternalUrl, modulePurpose, type ModuleEntry } from "@/lib/nav/modules";

/** Functional distinction, not decoration: modules with live obligations. */
const CRITICAL_ROUTES = new Set(["/hcis", "/ptw", "/urgent-ops"]);

export function HoloModuleCard({
  module: m,
  index,
  ar,
  badge,
  onLongPress,
}: {
  module: ModuleEntry;
  index: number;
  ar: boolean;
  badge?: { text: string; title?: string } | null;
  /** Touch long-press reveals the module's one-line purpose (art. 21). */
  onLongPress?: (m: ModuleEntry) => void;
}) {
  const Icon = m.icon;
  const label = ar ? m.ar : m.en;
  const purpose = modulePurpose(m.to, ar);
  const externalUrl = moduleExternalUrl(m);
  const critical = CRITICAL_ROUTES.has(m.to);
  const tileClass = `holo-card holo-enter group flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--holo-glow),0.6)] active:scale-[0.97]${critical ? " holo-critical" : ""}`;
  const style = { animationDelay: `${index * 60}ms` };

  // Long-press (touch): after 450ms show the purpose card and swallow the
  // click that follows so the hold explains instead of navigating. A quick
  // tap clears the timer and navigates normally. Desktop uses the native
  // title tooltip on hover (also read by screen readers).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const onTouchStart = () => {
    if (!onLongPress || !purpose) return;
    longFiredRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true;
      onLongPress(m);
    }, 450);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (longFiredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longFiredRef.current = false;
    }
  };
  const pressHandlers = {
    onTouchStart,
    onTouchEnd: clearTimer,
    onTouchMove: clearTimer,
    onTouchCancel: clearTimer,
    onClickCapture,
  };

  const inner = (
    <>
      {badge && (
        <span className="holo-badge" title={badge.title}>
          {badge.text}
        </span>
      )}
      <span className="holo-icon nx-module-icon relative flex h-11 w-11 items-center justify-center rounded-xl">
        <Icon className="nx-icon-soft h-5 w-5" aria-hidden />
        {externalUrl && (
          <ExternalLink
            className="absolute -end-1 -top-1 h-3 w-3 text-[rgba(var(--holo-glow),0.8)]"
            aria-hidden
          />
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
        title={
          purpose
            ? `${purpose}${ar ? " (يُفتح في نافذة جديدة)" : " (opens in a new tab)"}`
            : undefined
        }
        style={style}
        className={tileClass}
        {...pressHandlers}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      to={m.to as "/"}
      aria-label={label}
      title={purpose}
      style={style}
      className={tileClass}
      {...pressHandlers}
    >
      {inner}
    </Link>
  );
}
