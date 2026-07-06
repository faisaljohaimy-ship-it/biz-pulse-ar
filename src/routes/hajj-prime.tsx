import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

// Hajj Nexus Prime is an EXTERNAL deployment. The /hajj-prime route is a
// full-viewport iframe shell — no scaling hacks, no half-height frames,
// no letterboxing. The embed URL is never printed in the UI.
const EMBED_URL = "https://hajj-nexus-prime.lovable.app/?theme=dark&forceDark=1#dark";

function HajjPrimeWindow() {
  const [loaded, setLoaded] = useState(false);

  // Lock body scroll while the full-viewport shell is mounted so the
  // page itself never scrolls behind the iframe.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      dir="ltr"
      className="dark"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        background: "#04111f",
        colorScheme: "dark",
        overflow: "hidden",
      }}
    >
      {/* Full-viewport iframe */}
      <iframe
        src={EMBED_URL}
        title="Hajj Nexus Prime · Live System"
        onLoad={() => setLoaded(true)}
        loading="eager"
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          border: 0,
          display: "block",
          backgroundColor: "#04111f",
          colorScheme: "dark",
        }}
      />

      {/* Floating Back chip — safe-area aware, RTL-friendly logical inset. */}
      <Link
        to="/"
        aria-label="رجوع إلى Neexios · Back"
        className="group inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-[#04111f]/85 px-3.5 py-2 text-[12px] font-semibold text-white/90 shadow-[0_6px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-emerald-300 hover:bg-[#04111f] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          insetInlineStart: "calc(env(safe-area-inset-left, 0px) + 12px)",
          zIndex: 70,
          minHeight: 44,
          minWidth: 44,
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>رجوع</span>
      </Link>

      {/* Branded loading overlay — emerald spinner + AR label, fades out
          the moment the iframe fires `load`. */}
      {!loaded && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            background: "linear-gradient(180deg, #04111f 0%, #061A2E 55%, #04111f 100%)",
            zIndex: 60,
            transition: "opacity 380ms ease",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 64,
              height: 64,
              borderRadius: "9999px",
              border: "3px solid rgba(16, 185, 129, 0.18)",
              borderTopColor: "#34D399",
              borderRightColor: "#10B981",
              animation: "hajj-spin 900ms linear infinite",
              boxShadow: "0 0 40px rgba(16,185,129,0.35)",
            }}
          />
          <div
            dir="rtl"
            style={{
              fontFamily: '"Tajawal", "Space Grotesk", ui-sans-serif',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.01em",
              color: "#E6FFF6",
              textShadow: "0 0 24px rgba(16,185,129,0.35)",
            }}
          >
            جارٍ فتح منصة نُسك الحج…
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(230,255,246,0.55)",
            }}
          >
            Hajj Nexus Prime · Loading
          </div>
          <style>{`
            @keyframes hajj-spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/hajj-prime")({
  component: HajjPrimeWindow,
  head: () => ({
    meta: [
      { title: "منصة نُسك الحج · Hajj Nexus Prime — Neexios" },
      { name: "description", content: "منصة نُسك الحج — تجربة Hajj Nexus Prime كاملة داخل Neexios بوضع داكن دائم." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#061A2E" },
      { property: "og:title", content: "منصة نُسك الحج · Hajj Nexus Prime" },
      { property: "og:description", content: "منصة نُسك الحج المدمجة داخل Neexios." },
      { property: "og:url", content: "https://neexios.com/hajj-prime" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/hajj-prime" }],
  }),
});
