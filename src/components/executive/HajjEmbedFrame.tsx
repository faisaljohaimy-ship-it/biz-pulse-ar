/**
 * HajjEmbedFrame — the shared live embed of the external Hajj dashboard.
 *
 * One virtual 1440×900 desktop viewport, uniformly scaled to whatever
 * width the parent gives it (fixed 16:10 aspect — never cropped, never
 * stretched), so phone, tablet, and laptop all see the IDENTICAL full
 * dashboard. Dark #04111f stage with color-scheme:dark, a dark loading
 * state while the platform boots, and a "جارٍ الاتصال · فتح المنصة" card
 * when the embed cannot load (or no URL is configured) — never a white
 * screen, never a raw URL in the UI.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, SatelliteDish } from "lucide-react";
import {
  HAJJ_INTERNAL_ROUTE,
  HAJJ_PLATFORM_LABEL_AR,
  HAJJ_PLATFORM_LABEL_EN,
  hajjEmbedUrl,
  hajjOpenUrl,
} from "@/lib/hajj-embed";

// Virtual desktop viewport the external dashboard is designed for.
const VIRTUAL_W = 1440;
const VIRTUAL_H = 900;
// If the platform hasn't fired `load` by then, assume the connection is
// blocked/slow and surface the connect card instead of a dead pane.
const CONNECT_TIMEOUT_MS = 15_000;

interface Props {
  /** false → preview mode: the embed is visible but not clickable. */
  readonly interactive?: boolean;
  readonly ar?: boolean;
  readonly className?: string;
}

function ConnectCard({ ar }: { readonly ar: boolean }) {
  const url = hajjOpenUrl();
  const label = ar ? HAJJ_PLATFORM_LABEL_AR : HAJJ_PLATFORM_LABEL_EN;
  const cta = (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3AE8FF]/20">
      <ExternalLink className="h-3.5 w-3.5" />
      {ar ? "فتح المنصة" : "Open platform"}
    </span>
  );
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#04111f] p-6 text-center"
      style={{ colorScheme: "dark" }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3AE8FF]/10 ring-1 ring-[#3AE8FF]/40">
        <SatelliteDish className="h-6 w-6 text-[#3AE8FF]" />
      </span>
      <div className="text-sm font-bold text-white">{ar ? "جارٍ الاتصال" : "Connecting"}</div>
      <p className="max-w-xs text-[11px] leading-relaxed text-white/55">
        {ar
          ? `تعذّر عرض ${label} داخل الصفحة حالياً — يمكنك فتحها مباشرة.`
          : `${label} can’t be shown inline right now — open it directly.`}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
          {cta}
        </a>
      ) : (
        <Link to={HAJJ_INTERNAL_ROUTE} aria-label={label}>
          {cta}
        </Link>
      )}
    </div>
  );
}

export function HajjEmbedFrame({ interactive = true, ar = true, className = "" }: Props) {
  const url = hajjEmbedUrl();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">(url ? "loading" : "failed");

  // Uniform scale-to-fit: the container keeps a hard 16:10 aspect ratio;
  // the 1440px virtual viewport is scaled to the measured width.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / VIRTUAL_W);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("orientationchange", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  // Connection watchdog — no `load` event within the window → connect card.
  useEffect(() => {
    if (!url || state !== "loading") return;
    const t = window.setTimeout(() => {
      setState((s) => (s === "loading" ? "failed" : s));
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [url, state]);

  const label = ar ? HAJJ_PLATFORM_LABEL_AR : HAJJ_PLATFORM_LABEL_EN;

  return (
    <div
      ref={stageRef}
      className={`relative w-full overflow-hidden bg-[#04111f] ${className}`}
      style={{ colorScheme: "dark", aspectRatio: `${VIRTUAL_W} / ${VIRTUAL_H}` }}
    >
      {url && state !== "failed" && (
        <iframe
          src={url}
          title={label}
          loading="lazy"
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
          // sandbox intentionally omitted so the platform runs its own scripts
          className={`absolute left-0 top-0 border-0 ${interactive ? "" : "pointer-events-none"}`}
          style={{
            width: `${VIRTUAL_W}px`,
            height: `${VIRTUAL_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            colorScheme: "dark",
            backgroundColor: "#04111f",
          }}
          referrerPolicy="no-referrer-when-downgrade"
          allow="fullscreen"
        />
      )}

      {/* Dark loading state — shown until the platform paints. */}
      {state === "loading" && (
        <div
          dir={ar ? "rtl" : "ltr"}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#04111f]"
          aria-live="polite"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[#3AE8FF]" />
          <span className="text-[11px] font-semibold tracking-wide text-white/65">
            {ar ? `جارٍ تحميل ${HAJJ_PLATFORM_LABEL_AR}…` : `Loading ${HAJJ_PLATFORM_LABEL_EN}…`}
          </span>
          {/* Skeleton dashboard bones */}
          <div aria-hidden className="mt-2 grid w-2/3 max-w-md grid-cols-3 gap-2 opacity-50">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="h-8 animate-pulse rounded-lg bg-[#0a2338]" />
            ))}
          </div>
        </div>
      )}

      {state === "failed" && <ConnectCard ar={ar} />}
    </div>
  );
}

export default HajjEmbedFrame;
